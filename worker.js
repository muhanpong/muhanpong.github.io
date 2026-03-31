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

// MP3 Encoding State (Task 1)
let lamejs = null; // Loaded via shim
let mp3Encoder = null;
let mp3ResidualBuffer = new Uint8Array(0);

async function ensureLamejs() {
    if (lamejs) return;
    console.log("[Worker] Loading lamejs shim...");
    try {
        const resp = await fetch('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');
        const text = await resp.text();
        // The script defines a function named 'lamejs'. We execute it and grab that function.
        const factory = new Function(text + "; return lamejs;")();
        lamejs = factory; // This is the factory function that returns { Mp3Encoder, ... }
        console.log("[Worker] lamejs shim loaded.");
    } catch (err) {
        console.error("[Worker] Failed to load lamejs shim:", err);
        throw err;
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
        const module = await import(`./pkg/mv2_wasm.js`);
        init = module.default;
        Mv2Encoder = module.Mv2Encoder;

        await init(`./pkg/mv2_wasm_bg.wasm`);

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
            await ensureLamejs();
            if (!encoder) {
                encoder = new Mv2Encoder(payload.config);
            } else {
                // Adaptive Update instead of full re-init
                try { encoder.update_config(payload.config); } catch(e) {
                    encoder.free(); encoder = new Mv2Encoder(payload.config);
                }
            }
            
            // Re-initialize MP3 Encoder for a fresh session
            const cfg = JSON.parse(payload.config);
            mp3Encoder = new lamejs.Mp3Encoder(1, cfg.sample_rate || 44100, 128);
            mp3ResidualBuffer = new Uint8Array(0);
            
            self.postMessage({ type: 'INIT_DONE' });
        }

        else if (type === 'ENCODE_FRAME' || type === 'TEST_FRAME') {
            const { rgbaBytes, origW, origH, gamma, mp3Chunk, pcmSlice, pcmF32Slice, frameIdx, config, needsMonitor } = payload;
            if (gamma && gamma !== 1.0) Mv2Encoder.apply_gamma_to_rgba(rgbaBytes, gamma);

            let activeEncoder = encoder;
            if (type === 'TEST_FRAME') {
                if (!config) throw new Error("Config required for TEST_FRAME");
                if (!previewEncoder) {
                    previewEncoder = new Mv2Encoder(config);
                    lastPreviewConfig = config;
                } else if (lastPreviewConfig !== config) {
                    // Ad-hoc optimization: only re-init if really needed, otherwise update
                    try { previewEncoder.update_config(config); } catch(e) {
                        previewEncoder.free(); previewEncoder = new Mv2Encoder(config);
                    }
                    lastPreviewConfig = config;
                }
                activeEncoder = previewEncoder;
            } else if (!activeEncoder) {
                throw new Error("Encoder not initialized.");
            }

            // 🔊 Streaming MP3 Encoding (Task 1) - Must happen BEFORE add_frame for interleaving
            let returnedMp3Chunk = null;
            if (type === 'ENCODE_FRAME' && pcmF32Slice && mp3Encoder) {
                // 🚀 Native WASM Audio Conversion (Performance Fix)
                const pcmInt16 = activeEncoder.convert_f32_to_i16(pcmF32Slice, payload.gain || 1.0);
                
                // 2. Encode to MP3
                const mp3buf = new Uint8Array(mp3Encoder.encodeBuffer(pcmInt16));
                
                // 3. Handle 32-byte alignment and requested size
                const combined = new Uint8Array(mp3ResidualBuffer.length + mp3buf.length);
                combined.set(mp3ResidualBuffer, 0);
                combined.set(mp3buf, mp3ResidualBuffer.length);
                
                const requestedSize = payload.requestedMp3Size || 0; 
                if (requestedSize > 0) {
                    returnedMp3Chunk = combined.slice(0, requestedSize);
                    mp3ResidualBuffer = combined.slice(requestedSize);
                } else {
                    const alignedLen = Math.floor(combined.length / 32) * 32;
                    returnedMp3Chunk = combined.slice(0, alignedLen);
                    mp3ResidualBuffer = combined.slice(alignedLen);
                }
            }

            activeEncoder.add_frame(rgbaBytes, origW, origH, 4, returnedMp3Chunk, pcmSlice, pcmF32Slice);

            const vBytes = activeEncoder.get_last_vram();
            const pBytes = activeEncoder.get_last_palette();
            const eqBytes = activeEncoder.get_last_eq_data();

            const response = {
                type: type === 'ENCODE_FRAME' ? 'FRAME_DONE' : 'TEST_FRAME_DONE',
                payload: { frameIdx, vramBytes: vBytes, paletteBytes: pBytes, eqBytes: eqBytes }
            };
            const transferables = [response.payload.vramBytes.buffer, response.payload.paletteBytes.buffer, response.payload.eqBytes.buffer];
            if (returnedMp3Chunk && returnedMp3Chunk.length > 0) {
                response.payload.mp3Chunk = returnedMp3Chunk; 
                transferables.push(returnedMp3Chunk.buffer); 
            }

            // Only perform expensive reconstruction if it's a TEST_FRAME (preview) or specifically requested for the monitor
            if (type === 'TEST_FRAME' || needsMonitor) {
<<<<<<< HEAD
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
=======
                // 🚀 WASM-Accelerated Reconstruction (Task 2)
                // This eliminates the expensive JS pixel loops
                const ditheredRGBA = activeEncoder.get_last_dithered_rgba();
                const vramRGBA = activeEncoder.get_last_vram_rgba();

                response.payload.ditheredRGBA = ditheredRGBA;
                response.payload.vramRGBA = vramRGBA;
                transferables.push(ditheredRGBA.buffer, vramRGBA.buffer);
>>>>>>> origin/stable
            }

            self.postMessage(response, transferables);
        }

        else if (type === 'FINISH') {
            const { remainingMp3 } = payload || { remainingMp3: new Uint8Array(0) };
            if (!encoder) throw new Error("Encoder not initialized.");

            // 결과물 추출 및 WASM 메모리 분리
            // Flush leftover MP3
            let finalMp3 = mp3ResidualBuffer;
            if (mp3Encoder) {
                const flushBuf = new Uint8Array(mp3Encoder.flush());
                if (flushBuf.length > 0) {
                    const combined = new Uint8Array(finalMp3.length + flushBuf.length);
                    combined.set(finalMp3, 0);
                    combined.set(flushBuf, finalMp3.length);
                    finalMp3 = combined;
                }
            }

            const mv2Bytes = encoder.finish(finalMp3).slice();
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
