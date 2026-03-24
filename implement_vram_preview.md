# MSX2 MV2 인코더: VRAM 프리뷰 토글 모드 기술 구현 명세서

본 명세서는 일회성 '미리보기' 기능을 넘어, 인코더의 메인 뷰어 자체를 **[Source Preview]** 와 **[VRAM Preview]** 두 가지 모드로 완전히 스위칭(Toggle)할 수 있도록 구조를 개편하는 기술 계획을 담고 있습니다. 기존의 모든 편집 기능(Aspect, Crop, Snapshot 등)은 두 모드에서 완벽하게 동일하게 작동해야 합니다.

---

## 1. 아키텍처 핵심 개념 (Architecture Concept)

기존에는 버튼을 누르면 화면을 50:50으로 쪼개어 보여주는 '모니터 모드' 형태였습니다. 새로운 구조에서는 **메인 캔버스가 모드 상태(`isVramPreviewMode`)에 따라 100% 원본 전처리 화면을 보여주거나, 100% VRAM 패킹 화면을 보여주는 방식**으로 전환됩니다.

* **상태 0 (Source Preview):** GPU 가속(`drawImage`)을 이용해 Crop, Pad, Aspect Ratio가 적용된 **고화질 256x192 원본 픽셀**을 즉시 렌더링.
* **상태 1 (VRAM Preview):** 위에서 생성된 256x192 원본 픽셀을 백그라운드 Worker(`TEST_FRAME`)로 전송하여 K-Means 및 디더링을 거친 후 반환된 **MSX 컬러 픽셀**을 렌더링.

---

## 2. 상태 관리 및 UI 제어 (State & UI Layer)

전역 변수로 프리뷰 모드 상태를 추적하며, 토글 버튼 클릭 시 즉각적으로 렌더링 파이프라인을 전환합니다.

```javascript
// 1. 상태 변수 선언
let isVramPreviewMode = false;
let isVramProcessing = false; // 워커 큐 초과(병목) 방지용 락

// 2. 토글 버튼 이벤트
const btnTestFrame = document.getElementById('btnTestFrame');
btnTestFrame.addEventListener('click', () => {
    isVramPreviewMode = !isVramPreviewMode;
    
    // UI 업데이트
    btnTestFrame.innerText = isVramPreviewMode ? "📺 Mode: VRAM Preview" : "🎬 Mode: Source Preview";
    btnTestFrame.style.background = isVramPreviewMode ? "#ff9800" : "#28a745";
    
    // 상태 변경 즉시 현재 멈춰있는 프레임 재랜더링
    if (!isEncoding && currentFile) {
        renderPreview();
    }
});
```

---

## 3. 렌더링 파이프라인 통합 및 분리 (Render Pipeline)

모든 프리뷰의 시작점인 `drawPreviewCanvas()` 함수를 개편합니다. Crop/Pad 계산은 공통으로 수행하되, 마지막 화면 출력 직전에 분기점을 둡니다.

```javascript
async function drawPreviewCanvas() {
    if (isEncoding) return;

    // 1. 공통 전처리 (Crop, Pad, Aspect 적용)
    offCtx.fillStyle = '#000';
    offCtx.fillRect(0, 0, 256, 192);
    // ... (기존 Aspect Mode 계산 및 offCtx.drawImage 로직 유지) ...

    if (!isVramPreviewMode) {
        // [Source Preview 모드] 전처리된 화면을 메인 캔버스에 즉시 출력
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offscreenCanvas, 0, 0);
        drawGridOverlay(); // 8x8 그리드 유지
    } else {
        // [VRAM Preview 모드] 워커로 전송하여 디더링 결과 받아오기
        if (isVramProcessing) return; // 이전 프레임 연산 중이면 스킵 (실시간 재생 시 랙 방지)
        isVramProcessing = true;

        const frameData = offCtx.getImageData(0, 0, 256, 192);
        const rgbaBytes = new Uint8Array(frameData.data.buffer);
        const config = getUIConfig(); // 현재 UI 파라미터 수집 함수

        try {
            const ditheredRGB = await requestVramFrameFromWorker(rgbaBytes, config);
            
            // 결과를 메인 캔버스에 출력
            const tImg = ctx.createImageData(256, 192);
            for (let i = 0, j = 0; i < ditheredRGB.length; i += 3, j += 4) {
                tImg.data[j] = ditheredRGB[i]; tImg.data[j+1] = ditheredRGB[i+1];
                tImg.data[j+2] = ditheredRGB[i+2]; tImg.data[j+3] = 255;
            }
            ctx.putImageData(tImg, 0, 0);
            drawGridOverlay(); // 8x8 그리드 유지
            
        } catch (err) {
            console.error("VRAM Preview Error:", err);
        } finally {
            isVramProcessing = false;
        }
    }
}

// 프로미스로 감싼 워커 통신 함수
function requestVramFrameFromWorker(rgbaBytes, config) {
    return new Promise((resolve, reject) => {
        const tempHandler = (e) => {
            if (e.data.type === 'TEST_FRAME_DONE') {
                worker.removeEventListener('message', tempHandler);
                resolve(e.data.payload.ditheredRGB);
            } else if (e.data.type === 'ERROR') {
                worker.removeEventListener('message', tempHandler);
                reject(e.data.payload);
            }
        };
        worker.addEventListener('message', tempHandler);
        worker.postMessage({ 
            type: 'TEST_FRAME', 
            payload: { config: JSON.stringify(config), rgbaBytes, origW: 256, origH: 192 } 
        });
    });
}
```

---

## 4. 주요 기능 보존 및 충돌 방지 전략 (Feature Preservation)

열거하신 핵심 기능들이 VRAM 프리뷰 모드에서도 정상 작동하도록 보장하는 전략입니다.

### A. A/V 컨트롤 및 재생 (Playback & Scrubbing)
* **실시간 재생 (Playing):** VRAM 연산이 15FPS를 따라가지 못할 경우 오디오와 비디오 싱크가 어긋날 수 있습니다. `isVramProcessing` 락(Lock)을 통해, Worker가 연산 중일 때는 다음 프레임 전송을 건너뜁니다. (화면 프레임은 다소 끊길 수 있으나 오디오와 실제 시간은 정상적으로 흐름).
* **탐색 (Scrubbing):** 슬라이더를 드래그할 때는 `mouseup` 또는 `touchend` 이벤트 발생 시에만 VRAM 프리뷰를 갱신하도록 디바운스(Debounce) 처리하여 워커 큐 폭주를 방지합니다.

### B. 파라미터 실시간 적용 (Aspect / Crop / Lock / Unlock)
* 사용자가 UI 값을 변경(`change`, `input` 이벤트)할 때마다 `renderPreview()`를 호출합니다. VRAM 모드 켜져있을 경우 즉시 바뀐 값을 워커로 보내 새로운 결과를 화면에 덮어씌웁니다. 
* 모든 Crop/Pad 연산은 `offscreenCanvas`에서 선행되므로, WASM 로직은 전혀 수정할 필요 없이 완벽하게 호환됩니다.

### C. 스냅샷 (Snapshot / Instant Play)
* **논-블로킹 처리:** 스냅샷 버튼을 누르면 현재 캔버스의 상태와 무관하게, 현재 시간(`currentTime`)의 픽셀을 추출하여 별도의 `FINISH_SNAPSHOT` 명령을 워커로 보냅니다. VRAM 프리뷰가 켜져 있든 꺼져 있든 스냅샷 기능은 즉시 단일 MV2 파일을 생성하고 다운로드/플레이어 전송을 수행합니다. 
* UI가 잠기지(Disable) 않으므로 사용자는 클릭 직후 바로 다른 작업을 이어갈 수 있습니다.

### D. 인코딩 및 플레이어 전송 (Encoding Workflow)
* 메인 인코딩(`ENCODE_FRAME` 루프)이 시작되면 `isEncoding = true` 상태가 됩니다.
* 이때 `isVramPreviewMode`의 상태와 무관하게 프리뷰 렌더링 루프(`drawPreviewCanvas`)는 일시 중지(Bypass)되며, 시스템의 모든 연산 자원은 메인 인코딩에 100% 투입됩니다.
* 인코딩이 정지(Stop)되거나 완료(Finish)되면 다시 기존 모드(Source 또는 VRAM)에 맞춰 마지막 프레임을 화면에 띄워줍니다.
