// worker.js
import init, { Mv2Encoder } from './pkg/mv2_wasm.js';

let encoder = null;

// 메인 스레드(HTML)로부터 메시지를 받을 때 실행됨
self.onmessage = async (e) => {
    const { type, payload } = e.data;

    try {
        if (type === 'INIT') {
            await init(); // WASM 초기화
            encoder = new Mv2Encoder(payload.config);
            self.postMessage({ type: 'INIT_DONE' });
        } 
        else if (type === 'ENCODE_FRAME') {
            const { rgbaBytes, origW, origH, mp3Chunk, pcmSlice, frameIdx } = payload;

            // 🚀 매우 무거운 WASM 연산 (여기서 멈춰도 UI는 멈추지 않음!)
            encoder.add_frame(rgbaBytes, origW, origH, 4, mp3Chunk, pcmSlice);            
            // 프리뷰 데이터 추출 (WASM 메모리 뷰 참조 문제를 피하기 위해 하드 카피)
            const ditheredRGB = new Uint8Array(encoder.get_last_dithered_frame());
            
            // 연산 완료 후 메인 스레드로 결과 전송
            self.postMessage({ 
                type: 'FRAME_DONE', 
                payload: { frameIdx, ditheredRGB } 
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
