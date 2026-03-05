# MSX2 MV Player & Recorder - 차세대 `index.html` 리팩토링 및 아키텍처 설계도

이 문서는 현재 단일 파일(`index.html`)로 구성된 MSX2 MV Player를 향후 유지보수가 용이하고, 확장 가능하며, 현대적인 웹 표준에 맞게 재작성(Rewrite)하기 위한 종합적인 기술 스펙, 설계도, 유의 사항 및 구현 방법을 담고 있습니다.

---

## 1. 기술 스펙 (Technology Stack)

*   **코어 언어**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3
*   **렌더링 엔진**: HTML5 `<canvas>` (2D Context, `ImageData` 조작 최적화)
*   **오디오 엔진**: Web Audio API (`AudioContext`, `OfflineAudioContext`, `AudioBuffer`)
*   **비디오 인코딩**: WebCodecs API (`VideoEncoder`, `AudioEncoder`), [mp4-muxer](https://unpkg.com/mp4-muxer/build/mp4-muxer.js)
*   **파일 파싱**: 파일 API (`File`, `Blob`, `FileReader`), `JSZip` (ZIP 압축 해제용)
*   **병렬 처리**: Web Workers (타이머 분리 및 인코딩 작업 분산)

---

## 2. 핵심 유의 사항 및 트러블슈팅 포인트 (Caveats)

이전 버전 개발 중 겪었던 치명적인 버그들을 방지하기 위해 반드시 지켜야 할 규칙입니다.

### 1) 모바일 & PC 브라우저 100vh 스크롤 버그 방지 (CSS Flex 계층)
*   모바일 브라우저의 상단 URL 바에 의한 `100vh` 계산 오류 및 바운스 스크롤을 막기 위해, `html`과 `body`는 반드시 `height: 100%; overflow: hidden;`을 가짐과 동시에 `body`는 `position: absolute;`로 뷰포트에 완전히 고정되어야 합니다.
*   **스크롤 가능한 자식 요소를 위한 Flex 규칙**: Flex Box 내부에서 특정 자식 요소(`playlist-items` 등)가 스크롤바를 가지려면, 해당 지점까지 내려가는 **모든 상위 Flex 부모 컨테이너**에 반드시 `min-height: 0;`과 `flex-grow: 1;`이 선언되어 있어야 합니다. 그렇지 않으면 내부 콘텐츠 크기에 맞춰 부모가 무한히 늘어나는 현상이 발생합니다.

### 2) 아이폰(iOS) 가로 모드 전체화면 강제 (Fake Fullscreen)
*   iOS Safari는 네이티브 Javascript Fullscreen API를 완벽하게 지원하지 않습니다. (특히 가로 모드 고정 `screen.orientation.lock`).
*   따라서 세로로 폰을 든 상태에서 전체화면 버튼을 누르면, CSS `transform: rotate(90deg)`를 활용하여 가짜 가로 전체화면(`.ios-fullscreen-fix`)을 띄우는 꼼수가 반드시 포함되어야 합니다.

### 3) 캔버스 렌더링 최적화
*   초당 15프레임(또는 12프레임)의 레트로 영상을 픽셀 단위로 찍어내므로, 매 프레임마다 `putImageData`가 호출됩니다. 
*   가비지 컬렉션(GC) 스파이크를 막기 위해 `ImageData`와 매핑된 `Uint32Array` 배열 버퍼를 사전에 한 번만 할당하여 재사용해야 합니다.
*   MP4 추출(Export)시 베이스 캔버스에서 픽셀 데이터를 읽어올 때 성능 저하를 막으려면 `getContext('2d', { willReadFrequently: true })` 옵션을 반드시 부여해야 합니다.

### 4) Web Audio API 정책 우회
*   사용자 상호작용(터치나 클릭) 없이 오디오가 재생되는 것을 최신 브라우저가 차단합니다. 
*   최초 화면 터치 시 짧은 무음 비프음을 생성하여 `AudioContext.resume()`을 강제 트리거하는 로직(Unlock Audio)이 반드시 최상단에 바인딩되어야 합니다.

---

## 3. UI / UX 및 CSS 구성도 (Layout Architecture)

화면은 크게 4가지 영역으로 나뉩니다: App Bar, Player Screen(+ OSD & Layer), Dual Histograms, Playlist Sidebar.

### [DOM 트리 구조 요약]
```html
<body>
    <div id="app-bar">상단 타이틀 및 정보 버튼</div>
    
    <div id="screen-wrapper"> <!-- 전체 뷰포트를 채우는 Flex Container -->
        
        <div id="video-container"> <!-- Aspect Ratio를 관리하는 박스 -->
            <div id="canvas-area"> 
                <canvas id="msx-screen"></canvas> <!-- 실제 영상 -->
                <div id="eq-overlay">오디오 이퀄라이저 막대들</div>
                <div id="landscape-histogram">가로 모드용 우측 히스토그램</div>
                <div id="osd-controls">진행바, 재생버튼, 볼륨, 추출버튼 등</div>
            </div>
        </div>

        <div id="portrait-histogram"> <!-- 세로 모드 전용 하단 히스토그램 -->
            <div class="p-hist-graph-area">(물리 엔진 바운싱 애니메이션 마크업)</div>
        </div>
        
        <div id="playlist-sidebar"> <!-- 플레이리스트 영역 -->
            <div id="playlist-folder">접기/펴기 버튼</div>
            <div class="playlist-items">(드래그 앤 드롭 및 클릭 가능한 아이템 목록)</div>
        </div>
        
    </div>
</body>
```

### [CSS 설계 핵심]
1.  **CSS Variables 제어**: `:root { --accent: #d9534f; --bg: #0f0f0f; ... }` 기반으로 글로벌 테마 관리.
2.  **레이아웃 반응형 분기**:
    *   `@media (orientation: landscape)`: 세로형 히스토그램 감추고 플레이리스트 우측 배치 혹은 감춤 처리.
    *   `@media screen and (orientation: portrait)`: iOS 가짜 전체화면용 `.ios-fullscreen-fix` 룰 발동 대기.
3.  **OSD Fade In/Out**: `hover` 상태나 마우스 `mousemove` 이벤트 발생 시 투명도(`opacity: 0 -> 1`) 전환. 영상 재생 중 터치나 움직임이 없으면 3초 뒤 OSD 숨김 처리 로직이 JS와 결합됨.

---

## 4. 모듈형 Javascript 설계도 (Class / Module Architecture)

단일 파일 내의 방대한 코드를 분리 가능한 수준의 클래스로 설계합니다. 추후 번들러(Webpack/Vite)를 도입하게 될 경우 즉시 파일을 찢을 수 있는 구조입니다.

### 4.1. Core Engine (CorePlayer.js)
어플리케이션의 핵심 비즈니스 로직.
*   **기능**: 전체 생명주기 관리, 상태 머신 레이어.
*   **주요 변수**: `isPlaying`, `pauseTime`, `duration`, `playlist[]`.

### 4.2. File Demuxer & Parser (MVParser.js)
바이너리 데이터를 해독하는 코어 파트.
*   **기능**: `File` 배열 버퍼 및 ZIP 압축 해독. `MMCSD_MV v1.0`, `v2.0` 및 `MV2` 버전별 시그니처 판별.
*   **출력**: 파싱 완료된 `frames` 배열 { offset, palette, eqRaw, mp3Chunk } 추출 및 메인에 반환.
*   **썸네일 생성기**: 플레이리스트 아이템을 위한 가상 렌더링 후 Base64 이미지 추출 로직 포함.

### 4.3. Video / Audio Renderer (Renderer.js)
화면과 소리를 담당하는 하드웨어 제어 파트.
*   **Video**: `Uint32Array` 버퍼에 Pixel 퍼팅 로직. 
*   **Dual Histogram Engine**: 
    *   픽셀 카운트 수치 연산 (Fast O(1) Look-Up Table 최적화 적용 영역).
    *   세로모드 하단 히스토그램의 **가속도 물리 엔진 (피크 홀드 바운싱 로직)** 연산.
*   **Audio**: Web Audio API 연동, Float32Array PCM 주입 및 오디오 버퍼 디코딩 처리. GainNode 볼륨 제어.

### 4.4. UI / OSD Controller (UIManager.js)
DOM 제어를 분담하는 View 컨트롤러.
*   **기능**: 재생/일시정지 버튼 토글, 진행 슬라이더바 업데이트, 플레이리스트 클릭 & 드래그앤드롭 이벤트 바인딩. 스크롤 뷰 위치 추적 기능(`scrollToActive`).

### 4.5. MP4 Exporter (WebCodecsExporter.js)
내보내기 기능을 담당하는 플러그인.
*   **기능**: WebCodecs API를 활성화시켜 프레임별 백그라운드 캔버스 `drawImage` 수행, MP3 / AAC / Opus 디코딩 및 샘플레이트 믹싱(OfflineAudioContext 활용). Muxing 완료 후 다운로드 링크 제공.

---

## 5. 단계별 구현 및 통합 방법 (Implementation Steps)

만약 바닥부터 다시 작성한다면 아래의 단계로 접근해야 가장 안전합니다.

### Phase 1: Skeleton & CSS CSS Hierarchy 확립
1. 뼈대가 되는 `html`, `body`의 100% 고정 룰 작성.
2. `screen-wrapper`와 `playlist-sidebar`의 Flex 계층 설정 및 억지 스크롤 작동 여부 테스트 (가장 잦은 버그 포인트이므로 여기를 완벽히 통과해야 함).
3. 캔버스 영역의 화면비 유지(AspectRatio 5:3) 박스 설정.

### Phase 2: Binary Parsing & Rendering
1. `.mv2` 파일 바이너리 ArrayBuffer 헥사 구조 분석 로직 작성 (Offset 이동 로직).
2. Canvas 2D에 임의의 Noise 배열을 뿌려 성능 최적화 버퍼(Uint32Array)가 잘 동작하는 지 체크.
3. AudioContext 연동 및 초기 무음 플레이를 통한 정책 우회(Unlock) 테스트.

### Phase 3: Playlist & OSD Events
1. Drag & Drop 이벤트 바인딩 로직 구현 (`e.preventDefault()` 필수).
2. 썸네일 생성 워커 큐(Thumb Queue) 도입으로 대량의 파일 추가 시 UI 프리징 현상 방지.
3. OSD 타이머 설정. 터치/마우스 이벤트 디바운스 처리 후 컨트롤 패널 투명화 동작.

### Phase 4: Histogram Physics & MP4 Export 시마이(마무리)
1. 추출된 컬러 팔레트와 픽셀 카운트를 기반으로 LUT(Look Up Table)를 이용한 로그 퍼센티지 연산.
2. 세로/가로 모드 히스토그램 DOM 업데이트 및 속도(v), 위치(y) 값을 업데이트하는 물리엔진 프레임 루프 가동.
3. WebCodecs 인코더를 결합하여 내보내기 진행 바 생성 및 Blob 다운로드.

---

> 💡 **최종결론**: 
> 현재 코드는 이미 상호 충돌하는 수많은 예외 처리(CSS 브라우저별 파편화, 비동기 렌더링 타임아웃 등)가 들어가 안정성을 확보한 상태입니다. 향후 코드 리팩토링 시, 위의 구조화된 분리 설계를 따르되 **"모바일 화면의 Flexbox 100vh 스크롤 고정 제약"** 부분은 절대로 훼손되지 않도록 주의해야 합니다.
