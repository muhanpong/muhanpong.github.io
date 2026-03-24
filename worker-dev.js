// worker.js
let init = null;
let Mv2Encoder = null;
let encoder = null;

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
    const { type, payload } = e.data;

    try {
        // Every command requires WASM to be loaded
        await ensureWasm();

        if (type === 'INIT') {
            console.log("[Worker] Initializing Main Encoder instance...");
            if (encoder) {
                encoder.free();
            }
            encoder = new Mv2Encoder(payload.config);
            self.postMessage({ type: 'INIT_DONE' });
        }

        else if (type === 'ENCODE_FRAME') {
            const { rgbaBytes, origW, origH, mp3Chunk, pcmSlice, frameIdx } = payload;

            if (!encoder) throw new Error("Encoder not initialized. Send INIT first.");

            // 🚀 매우 무거운 WASM 연산
            encoder.add_frame(rgbaBytes, origW, origH, 4, mp3Chunk, pcmSlice);

            const ditheredRGB = encoder.get_last_dithered_frame().slice();
            const vramBytes = encoder.get_last_vram().slice();
            const paletteBytes = encoder.get_last_palette().slice();

            // 연산 완료 후 메인 스레드로 결과 전송 (Zero-Copy)
            self.postMessage({
                type: 'FRAME_DONE',
                payload: { frameIdx, ditheredRGB, vramBytes, paletteBytes, mp3Chunk }
            }, [ditheredRGB.buffer, vramBytes.buffer, paletteBytes.buffer, mp3Chunk.buffer]);
        }

        else if (type === 'TEST_FRAME') {
            const { rgbaBytes, origW, origH, config } = payload;
            
            // Create a temporary encoder for a single frame preview as WASM lacks update_config
            // This allows previewing settings changes without affecting the main encoding stream
            const tempEncoder = new Mv2Encoder(config);
            tempEncoder.add_frame(rgbaBytes, origW, origH, 4);

            const ditheredRGB = tempEncoder.get_last_dithered_frame().slice();
            const vramBytes = tempEncoder.get_last_vram().slice();
            const paletteBytes = tempEncoder.get_last_palette().slice();
            
            tempEncoder.free();

            self.postMessage({
                type: 'TEST_FRAME_DONE',
                payload: { ditheredRGB, vramBytes, paletteBytes }
            }, [ditheredRGB.buffer, vramBytes.buffer, paletteBytes.buffer]);
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
        }
    } catch (err) {
        console.error("[Worker] Error handling message:", type, err);
        self.postMessage({ type: 'ERROR', payload: err.message });
    }
};
