// worker.js
let init = null;
let Mv2Encoder = null;
let encoder = null;
let isBusy = false;

// Persistent preview encoder to avoid re-init overhead
let previewEncoder = null;
let lastPreviewConfig = null;

// Reusable buffers for monitor/preview to reduce GC pressure
let monitorDitheredRGBA = null;
let monitorVramRGBA = null;

// Gamma LUT state
let gammaLUT = new Uint8Array(256);
let currentGamma = 1.0;

// Initialize Gamma LUT
function updateGammaLUT(gamma) {
    if (Math.abs(currentGamma - gamma) < 0.001 && gammaLUT[255] !== 0) return;
    currentGamma = gamma;
    for (let i = 0; i < 256; i++) {
        gammaLUT[i] = Math.pow(i / 255, 1 / gamma) * 255;
    }
}

// Apply Gamma LUT to RGBA buffer
function applyGamma(rgbaBytes, gamma) {
    if (Math.abs(gamma - 1.0) < 0.001) return; // Skip if gamma is 1.0
    updateGammaLUT(gamma);
    for (let i = 0; i < rgbaBytes.length; i += 4) {
        rgbaBytes[i] = gammaLUT[rgbaBytes[i]];
        rgbaBytes[i + 1] = gammaLUT[rgbaBytes[i + 1]];
        rgbaBytes[i + 2] = gammaLUT[rgbaBytes[i + 2]];
    }
}

/**
 * Ensures WASM module is loaded and initialized.
 * This is called automatically before handling any message.
 */
async function ensureWasm() {
    if (Mv2Encoder) return; // Already initialized

    console.log("[Worker] Loading WASM module with cache buster...");
    try {
        // Use timestamp to bypass service worker / browser cache for the glue code
        const v = Date.now();
        const module = await import(`./pkg/mv2_wasm.js?v=${v}`);
        init = module.default;
        Mv2Encoder = module.Mv2Encoder;

        // Initialize WASM with cache-busted path for the .wasm file itself
        await init(`./pkg/mv2_wasm_bg.wasm?v=${v}`);

        if (module.init_panic_hook) module.init_panic_hook();
        console.log("[Worker] WASM loaded and initialized.");
    } catch (err) {
        console.error("[Worker] Failed to load WASM:", err);
        throw err;
    }
}

// 메인 스레드(HTML)로부터 메시지를 받을 때 실행됨
self.onmessage = async (e) => {
    if (isBusy) {
        console.warn("[Worker] Busy handling another message. Skipping:", e.data.type);
        self.postMessage({ type: 'ERROR', payload: 'BUSY' });
        return;
    }
    const { type, payload } = e.data;

    try {
        isBusy = true;
        // Every command requires WASM to be loaded
        await ensureWasm();

        if (type === 'INIT') {
            console.log("[Worker] Initializing Main Encoder instance...");
            if (encoder) {
                try { encoder.free(); } catch(e) {}
            }
            encoder = new Mv2Encoder(payload.config);
            self.postMessage({ type: 'INIT_DONE' });
        }

        else if (type === 'ENCODE_FRAME' || type === 'TEST_FRAME') {
            const { rgbaBytes, origW, origH, gamma, mp3Chunk, pcmSlice, pcmF32Slice, frameIdx, config, needsMonitor } = payload;
            if (gamma) applyGamma(rgbaBytes, gamma);

            let activeEncoder = encoder;
            if (type === 'TEST_FRAME') {
                if (!config) throw new Error("Config required for TEST_FRAME");
                if (!previewEncoder || lastPreviewConfig !== config) {
                    if (previewEncoder) { try { previewEncoder.free(); } catch(e) {} }
                    previewEncoder = new Mv2Encoder(config);
                    lastPreviewConfig = config;
                }
                activeEncoder = previewEncoder;
            } else if (!activeEncoder) {
                throw new Error("Encoder not initialized.");
            }

            activeEncoder.add_frame(rgbaBytes, origW, origH, 4, mp3Chunk, pcmSlice, pcmF32Slice);

            const vBytes = activeEncoder.get_last_vram();
            const pBytes = activeEncoder.get_last_palette();
            const eqBytes = activeEncoder.get_last_eq_data();

            const response = {
                type: type === 'ENCODE_FRAME' ? 'FRAME_DONE' : 'TEST_FRAME_DONE',
                payload: { frameIdx, vramBytes: vBytes.slice(), paletteBytes: pBytes.slice(), eqBytes: eqBytes.slice() }
            };
            const transferables = [response.payload.vramBytes.buffer, response.payload.paletteBytes.buffer, response.payload.eqBytes.buffer];
            if (mp3Chunk) { response.payload.mp3Chunk = mp3Chunk; transferables.push(mp3Chunk.buffer); }

            // Only perform expensive reconstruction if it's a TEST_FRAME (preview) or specifically requested for the monitor
            if (type === 'TEST_FRAME' || needsMonitor) {
                // 🚀 VRAM RGBA: Decode entirely in WASM (replaces expensive JS per-pixel loop)
                const vramRGBA = activeEncoder.get_last_vram_rgba();
                response.payload.vramRGBA = vramRGBA.slice();
                transferables.push(response.payload.vramRGBA.buffer);

                // Dithered RGBA: Only needed for monitor mode (3-way split view), skip for preview
                if (needsMonitor) {
                    const dRGB = activeEncoder.get_last_dithered_frame();
                    const ditheredRGBA = new Uint8ClampedArray(256 * 192 * 4);
                    for (let i = 0, j = 0; i < dRGB.length; i += 3, j += 4) {
                        ditheredRGBA[j] = dRGB[i]; ditheredRGBA[j + 1] = dRGB[i + 1];
                        ditheredRGBA[j + 2] = dRGB[i + 2]; ditheredRGBA[j + 3] = 255;
                    }
                    response.payload.ditheredRGBA = ditheredRGBA;
                    transferables.push(ditheredRGBA.buffer);
                }
            }

            self.postMessage(response, transferables);
        }

        else if (type === 'FINISH') {
            const { remainingMp3 } = payload || { remainingMp3: new Uint8Array(0) };
            if (!encoder) throw new Error("Encoder not initialized.");

            // 결과물 추출 및 WASM 메모리 분리
            const mv2Bytes = encoder.finish(remainingMp3).slice();
            const rgbBytes = encoder.finish_rgb().slice();

            self.postMessage({
                type: 'FINISHED',
                payload: { mv2Bytes, rgbBytes }
            }, [mv2Bytes.buffer, rgbBytes.buffer]);
            
            // Cleanup
            if (encoder) { try { encoder.free(); } catch(e) {} encoder = null; }
            if (previewEncoder) { try { previewEncoder.free(); } catch(e) {} previewEncoder = null; lastPreviewConfig = null; }
        }
    } catch (err) {
        console.error("[Worker] Error handling message:", type, err);
        self.postMessage({ type: 'ERROR', payload: err.message });
        // Error state recovery
        if (encoder) { try { encoder.free(); } catch(e) {} encoder = null; }
        if (previewEncoder) { try { previewEncoder.free(); } catch(e) {} previewEncoder = null; lastPreviewConfig = null; }
    } finally {
        isBusy = false;
    }
};
