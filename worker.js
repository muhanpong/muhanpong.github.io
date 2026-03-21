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
            // 프리뷰 데이터 추출 (WASM 메모리 뷰 참조 문제를 피하기 위해 하드 카피)
            const ditheredRGB = new Uint8Array(encoder.get_last_dithered_frame());
            const vramBytes = new Uint8Array(encoder.get_last_vram());
            const paletteBytes = new Uint8Array(encoder.get_last_palette());
            
            // 연산 완료 후 메인 스레드로 결과 전송
            self.postMessage({ 
                type: 'FRAME_DONE', 
                payload: { frameIdx, ditheredRGB, vramBytes, paletteBytes } 
            });
        } 
        else if (type === 'FINISH') {
            const { remainingMp3 } = payload || { remainingMp3: new Uint8Array(0) };
            const mv2Bytes = encoder.finish(remainingMp3);
            const rgbBytes = encoder.finish_rgb();
            self.postMessage({ 
                type: 'FINISHED', 
                payload: { mv2Bytes, rgbBytes } 
            });
        }
    } catch (err) {
        self.postMessage({ type: 'ERROR', payload: err.message });
    }
};
