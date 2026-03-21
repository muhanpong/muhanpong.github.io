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

            const module = await import('./pkg/mv2_wasm.js');
            init = module.default;
            Mv2Encoder = module.Mv2Encoder;

            let memory = null;
            if (self.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined') {
                try {
                    // 🚀 수동으로 SharedArrayBuffer 생성 (256페이지 = 16MB)
                    memory = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true });
                    console.log("[Worker] SharedArrayBuffer created manually (256 pages).");
                } catch (e) {
                    console.warn("[Worker] Failed to create SharedArrayBuffer manually:", e);
                }
            }

            // WASM 초기화 (수동 메모리 주입 + 2MB 스택 설정)
            await init({ 
                module_or_path: './pkg/mv2_wasm_bg.wasm', 
                memory,
                thread_stack_size: 2 * 1024 * 1024 
            }); 
            
            // 패닉 후크 초기화 (에러 메시지 상세 확인용)
            if (module.init_panic_hook) module.init_panic_hook();

            // 🚀 멀티스레딩 초기화
            if (memory && module.initThreadPool) {
                try {
                    const threads = Math.min(navigator.hardwareConcurrency || 4, 12);
                    console.log("[Worker] Attempting to initialize thread pool with", threads, "threads...");
                    await module.initThreadPool(threads);
                    console.log("[Worker] Thread pool initialized successfully.");
                } catch (e) {
                    console.error("[Worker] Failed to initialize thread pool:", e);
                    console.warn("[Worker] Falling back to single-threaded mode.");
                }
            } else {
                console.warn("[Worker] Environment does not support multi-threading. Using single thread.");
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
