// worker.js
let init = null;
let Mv2Encoder = null;
let encoder = null;

// 메인 스레드(HTML)로부터 메시지를 받을 때 실행됨
self.onmessage = async (e) => {
    const { type, payload } = e.data;

    try {
        if (type === 'INIT') {
            console.log("[Worker] Initializing WASM with manual shared memory injection...");
            
            // ServiceWorker와 쿼리 스트링 간의 충돌을 피하기 위해 경로 단순화
            const jsUrl = './pkg/mv2_wasm.js';
            const wasmUrl = './pkg/mv2_wasm_bg.wasm';

            console.log("[Worker] Loading module:", jsUrl);
            const module = await import(jsUrl);
            init = module.default;
            Mv2Encoder = module.Mv2Encoder;

            let memory = null;
            if (self.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined') {
                try {
                    // 🚀 수동으로 SharedArrayBuffer 메모리 생성 
                    // WASM 바이너리 헤더와 일치하도록 initial: 18 설정 (중요!)
                    memory = new WebAssembly.Memory({ initial: 18, maximum: 16384, shared: true });
                    console.log("[Worker] SharedArrayBuffer created manually (18 pages).");
                } catch (e) {
                    console.warn("[Worker] Failed to create SharedArrayBuffer manually:", e);
                }
            }

            // WASM 초기화 (수동 메모리 주입)
            // modern wasm-bindgen style: { module_or_path, memory }
            await init({ module_or_path: wasmUrl, memory }); 
            
            // 🚀 멀티스레딩 초기화
            if (memory && module.initThreadPool) {
                try {
                    console.log("[Worker] Attempting to initialize thread pool with", navigator.hardwareConcurrency, "threads...");
                    await module.initThreadPool(navigator.hardwareConcurrency);
                    console.log("[Worker] Thread pool initialized successfully.");
                } catch (e) {
                    console.error("[Worker] Failed to initialize thread pool (DataCloneError):", e);
                    console.warn("[Worker] Falling back to single-threaded mode.");
                }
            } else {
                console.warn("[Worker] Multi-threading not supported or initialization failed. Using single thread.");
            }

            encoder = new Mv2Encoder(payload.config);
            self.postMessage({ type: 'INIT_DONE' });
        } 
        else if (type === 'ENCODE_FRAME') {
            const { rgbaBytes, origW, origH, mp3Chunk, pcmSlice, frameIdx } = payload;

            // 🚀 매우 무거운 WASM 연산 (여기서 멈춰도 UI는 멈추지 않음!)
            encoder.add_frame(rgbaBytes, origW, origH, 4, mp3Chunk, pcmSlice);            
            
            // 프리뷰 데이터 추출: WASM 메모리를 통째로 Transfer하는 것을 방지하기 위해 .slice()로 깊은 복사 수행
            const ditheredRGB = encoder.get_last_dithered_frame().slice();
            const vramBytes = encoder.get_last_vram().slice();
            const paletteBytes = encoder.get_last_palette().slice();
            
            // 연산 완료 후 메인 스레드로 결과 전송 (Zero-Copy)
            self.postMessage({ 
                type: 'FRAME_DONE', 
                payload: { frameIdx, ditheredRGB, vramBytes, paletteBytes } 
            }, [ditheredRGB.buffer, vramBytes.buffer, paletteBytes.buffer]);
        } 
        else if (type === 'FINISH') {
            const { remainingMp3 } = payload || { remainingMp3: new Uint8Array(0) };
            
            // 결과물 추출 및 WASM 메모리 분리
            const mv2Bytes = encoder.finish(remainingMp3).slice();
            const rgbBytes = encoder.finish_rgb().slice();
            
            self.postMessage({ 
                type: 'FINISHED', 
                payload: { mv2Bytes, rgbBytes } 
            }, [mv2Bytes.buffer, rgbBytes.buffer]);
        }
    } catch (err) {
        self.postMessage({ type: 'ERROR', payload: err.message });
    }
};
