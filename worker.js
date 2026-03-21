// worker.js
let init = null;
let Mv2Encoder = null;
let encoder = null;

// 메인 스레드(HTML)로부터 메시지를 받을 때 실행됨
self.onmessage = async (e) => {
    const { type, payload } = e.data;

    try {
        if (type === 'INIT') {
            // 캐시 우회를 위해 동적 import 및 쿼리 파라미터 사용
            const module = await import('./pkg/mv2_wasm.js?v=' + Date.now());
            init = module.default;
            Mv2Encoder = module.Mv2Encoder;
            
            // WASM 초기화 (바이너리 파일 캐시 우회)
            await init('./pkg/mv2_wasm_bg.wasm?v=' + Date.now()); 
            
            // 🚀 사용자의 기기(CPU)가 지원하는 최대 스레드 수만큼 Rayon 워커 풀 생성
            await module.initThreadPool(navigator.hardwareConcurrency);

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
