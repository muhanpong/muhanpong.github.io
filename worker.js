// worker.js
let init = null;
let Mv2Encoder = null;
let encoder = null;
let isBusy = false;

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

    console.log("[Worker] Loading WASM module...");
    try {
        const module = await import('./pkg/mv2_wasm.js');
        init = module.default;
        Mv2Encoder = module.Mv2Encoder;

        // Initialize WASM
        await init();

        // Optional: Initialize panic hook
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
            const { rgbaBytes, origW, origH, gamma, mp3Chunk, pcmSlice, frameIdx, config } = payload;
            if (gamma) applyGamma(rgbaBytes, gamma);

            let activeEncoder = encoder;
            let isTemp = false;
            if (type === 'TEST_FRAME') {
                if (!config) throw new Error("Config required for TEST_FRAME");
                activeEncoder = new Mv2Encoder(config);
                isTemp = true;
            } else if (!activeEncoder) {
                throw new Error("Encoder not initialized.");
            }

            activeEncoder.add_frame(rgbaBytes, origW, origH, 4, mp3Chunk, pcmSlice);

            const dRGB = activeEncoder.get_last_dithered_frame();
            const vBytes = activeEncoder.get_last_vram();
            const pBytes = activeEncoder.get_last_palette();

            // Offload decoding to worker
            const ditheredRGBA = new Uint8ClampedArray(256 * 192 * 4);
            const vramRGBA = new Uint8ClampedArray(256 * 192 * 4);
            const vData32 = new Uint32Array(vramRGBA.buffer);
            const pal32 = new Uint32Array(16);

            for (let i = 0, j = 0; i < dRGB.length; i += 3, j += 4) {
                ditheredRGBA[j] = dRGB[i]; ditheredRGBA[j + 1] = dRGB[i + 1];
                ditheredRGBA[j + 2] = dRGB[i + 2]; ditheredRGBA[j + 3] = 255;
            }
            for (let i = 0; i < 16; i++) {
                pal32[i] = (255 << 24) | (pBytes[i * 3 + 2] << 16) | (pBytes[i * 3 + 1] << 8) | pBytes[i * 3 + 0];
            }
            for (let y = 0; y < 192; y++) {
                const y8 = Math.floor(y / 8), yMod8 = y % 8, rowOffset = y * 256;
                for (let x = 0; x < 256; x++) {
                    const vram_off = (y8 * 32 + Math.floor(x / 8)) * 8 + yMod8;
                    const bit = (vBytes[vram_off] >> (7 - (x % 8))) & 1, ct = vBytes[6144 + vram_off];
                    vData32[rowOffset + x] = pal32[bit ? (ct >> 4) : (ct & 0x0F)];
                }
            }

            const response = {
                type: type === 'ENCODE_FRAME' ? 'FRAME_DONE' : 'TEST_FRAME_DONE',
                payload: { frameIdx, ditheredRGBA, vramRGBA, vramBytes: vBytes.slice(), paletteBytes: pBytes.slice() }
            };
            const transferables = [ditheredRGBA.buffer, vramRGBA.buffer, response.payload.vramBytes.buffer, response.payload.paletteBytes.buffer];
            if (mp3Chunk) { response.payload.mp3Chunk = mp3Chunk; transferables.push(mp3Chunk.buffer); }

            self.postMessage(response, transferables);
            if (isTemp) activeEncoder.free();
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
            encoder.free();
            encoder = null;
        }
    } catch (err) {
        console.error("[Worker] Error handling message:", type, err);
        self.postMessage({ type: 'ERROR', payload: err.message });
        // Error state recovery
        if (encoder) { try { encoder.free(); } catch(e) {} encoder = null; }
    } finally {
        isBusy = false;
    }
};
