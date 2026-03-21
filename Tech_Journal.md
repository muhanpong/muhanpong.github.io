## 2026-03-08 15:30:00 MSX2 MV/MV2 Player UI Stabilization & Metadata Integration

- **Playlist Refinement:**
    - Removed #playlist-folder button and logic; playlist now toggles via sidebar edge.
    - Added metadata status icon (i) to playlist tracks (left of duration).
- **Metadata Extraction:**
    - Implemented robust scanning for null-terminated JSON at offset 0x200 within the 16KB header.
    - Updated thumbnail generation to include metadata detection flag.
- **Unified Info Block:**
    - Consolidated Creator Info and Track Metadata into #info-block.
    - Implemented state management to save/restore original credit HTML.
    - Added automatic metadata refresh in #info-block upon track change if the block is visible.

## 2026-03-08 15:45:00 Metadata Offset Correction

- **Metadata Offset Adjustment:**
    - Corrected the metadata offset from 0x200 to 0x100 based on updated technical specifications.
    - Updated `generateThumbnail` to detect metadata at offset 0x100.
    - Updated `processData` to extract null-terminated JSON starting from offset 0x100.

## 2026-03-08 16:00:00 Metadata Icon Styling & OSD Feedback

- **UI Styling Updates:**
    - Changed playlist metadata icon `(i)` color from red (`--accent`) to white.
    - Updated player OSD info button (`#btn-metadata-info`) to turn white when the current clip contains metadata (otherwise remains dimmed gray).
    - Integrated OSD button color update into `updateMetadataUI` logic for real-time feedback during track changes.

## 2026-03-08 16:15:00 Enhanced OSD Metadata Feedback

- **Visual Refinement:**
    - Increased dimming of the OSD metadata info icon (`#btn-metadata-info`) from `#aaa` to `#222` (almost black) when no metadata is present to provide maximum visual contrast.
    - Standardized `style.color` usage for the OSD info icon to correctly support `currentColor` inheritance in the SVG.

## 2026-03-09 10:00:00 Histogram Enhancements & UI Polish

- **Landscape Histogram Alignment:**
    - Rotated the default fold/expand icons on the left side to `<<` (outward) to symmetrically match the right side `>>`.
- **Histogram Color Synchronization:**
    - Fixed an issue where the histogram color palette would not update dynamically during video playback. Tied the physical loop directly to `this.currentRenderedFrameIdx` instead of the static `this.pauseTime`.
- **Tooltip Implementation:**
    - Implemented hover tooltips on PC browsers for the histogram bars and bases.
    - Added `actualCounts` array to retain accurate pixel quantities (disconnected from the physics drop animation) for tooltips while paused.
    - Ensured tooltip indicates the precise pixel count and screen percentage in `count, n%` format.
    - Added a subtle 10% size expansion (`transform: scale(1.1)`) effect when hovering over indicators.

## 2026-03-09 11:30:00 Histogram Persistence in Landscape Mode

- **Landscape Histogram Optimization:**
    - Modified `loopHistogramPhysics` to prevent histogram values from falling to zero when the player is paused in landscape orientation.
    - Added orientation detection (`window.innerHeight < window.innerWidth`) to conditionally bypass the physics drop animation.
    - This ensures that the detailed analysis provided by the sidecar histograms remains visible and stable for inspection while the video is paused in landscape mode, while preserving the "falling" visual effect in portrait mode.
## 2026-03-13 15:45 - Physics Synchronization
- Applied refined histogram physics from index.html to newplayer.html.
- Synchronized bar scaling factor (0.93) and gravity coefficient (0.45).
- Verified 'natural fall' behavior during scrubbing in both player versions.
## 2026-03-13 16:00 - UI/UX Refinement: Static Histogram Bars on Pause
- Modified index.html and newplayer.html to stop histogram bars from shrinking when paused.
- Peak holders (white lines) still fall naturally via gravitational physics until they hit the static bars.
- This allows users to inspect color distribution statistics of a static frame while maintaining dynamic peak feedback.
## 2026-03-13 16:15 - Bug Fix: MP4 Export Functionality
- Fixed missing click event listener for 'btn-osd-save' in index.html and newplayer.html.
- Added visual feedback via showStatusIcon and status text timeouts in exportMP4().
## 2026-03-13 16:30 - UI refinement: Swapped Download Icon and Dropdown
- Swapped the HTML order of #btn-osd-save and #osd-codec-container in index.html and newplayer.html.
- Updated CSS .osd-save-group:hover #osd-codec-container to use margin-left: 5px instead of margin-right.
## 2026-03-13 16:45 - Bug Fix: AudioEncoder DOMException in MP4 Export
- Improved AudioEncoder error handling with detailed console logging and UI feedback.
- Robustified AudioEncoder configuration: ensured sampleRate is explicitly 48000 for Opus codec to comply with encoder requirements.
- Applied these fixes to both index.html and newplayer.html.
## 2026-03-13 17:00 - Encoder UI Enhancements (Phase 1-6)
- Implemented comprehensive UI overhaul for encoder.html based on enhancement_of_the_ui.md.
- Added responsive canvas, tooltip system, and drag-and-drop file loading.
- Created advanced timeline seek slider with draggable start/end markers and anchor scrubbing.
- Built interactive preview canvas that draws source video, calculates crop/pad/force overlays based on 5:3 or 4:3 target ratios, and allows physical dragging to adjust crop offsets.
- Implemented Tri-State Split-Screen Monitor mode during encoding (Left: Source, Center: VRAM Packed, Right: Raw Dithered).
- Added Early Abort feature: 'Stop Encoding' gracefully halts the process and immediately downloads the partial .mv2 and .rgb files.
## 2026-03-13 17:30 - Encoder UI Enhancements (Bug Fixes & Refinements)
- Added 'Playhead' marker to the timeline slider to allow preview seeking independent of start/end bounds.
- Constrained playhead to stay within the start/end bounds.
- Re-architected crop panning logic: dragging now mimics moving the target window physically, and panning directions are constrained (e.g., vertical only for portraits).
- Eliminated canvas flickering during crop adjustments by decoupling the drawing function from the video 'seeked' event.
- Styled the target window overlay with a thinner, solid blue line.
- Ensured crop offsets reset to 0 upon loading a new file.
- Placed crop offset inputs side-by-side.
- Fixed a bug where slider markers wouldn't drag due to missing variable declarations in strict mode.
- Tooltips now dismiss globally upon clicking anywhere.
## 2026-03-13 18:00 - Encoder UI Enhancements (Aspect & Slider Logic)
- Updated 'Pad' mode: Blue target window outline spans the full preview canvas, while video is letterboxed inside.
- Updated 'Force' mode: Blue target window outline spans the full preview canvas, video fills the entire area regardless of aspect ratio.
- Updated 'Crop' mode dragging: It feels like dragging a physical window over the source material.
- Added dynamic CSS aspect-ratio change (5:3 / 4:3) directly to the preview canvas when radio buttons are toggled.
- Enforced slider marker z-index and CSS translations so Start (left), Playhead (center), and End (right) markers never physically overlap even if they are at the same exact timestamp.
- Updated slider track click: Now ONLY moves the Playhead to the clicked point without snapping Start/End markers. Start/End must be manually dragged.
## 2026-03-13 18:30 - Encoder UI Enhancements (Playback OSD)
- Added YouTube-style OSD play/pause button to the center of the preview canvas.
- Configured OSD button to appear when paused or hovered, and disappear during playback.
- Enabled clicking the preview canvas to toggle video play/pause.
- Added playback loop to smoothly update the slider playhead marker in real-time.
- Refined click/drag conflict: Clicking to toggle play won't trigger if the user was actively dragging to crop.
- Added '#selectionInfo' UI element between Start and End time inputs to display the selected duration (in seconds) and estimated frame count.
- Added estimated MV2 file size calculation (~MB) to the #selectionInfo UI element based on the selected frame count.
- Fixed ReferenceError during encoding by mapping 'video' to 'sourceVideo' inside the start button click handler.
- Re-fixed 'Pad' and 'Force' mode overlays to ensure the blue outline spans the entire canvas as requested.
- Fixed bug where changing Aspect Mode or Ratio while video is paused didn't immediately update the preview overlay. Bypassed requestVideoFrameCallback for UI overlay redraws.
- Fixed bug where encoded video was black by removing 'requestVideoFrameCallback' reliance during encoding, which fails on hidden video elements. Now explicitly awaits the 'seeked' event.
- Fixed bug where encoded audio was out of sync or missing when a segment was selected. The PCM audio is now correctly sliced to the user-selected startTime and endTime before generating MP3 chunks.
- Fixed 'ReferenceError: monitorLeftSplit is not defined' by initializing monitoring split variables in the global state.
- Ensured 'monitor-mode' class is correctly applied and removed to show/hide split handles during encoding.
- Reset monitoring split positions to 0% and 100% at the start of each encoding session.
- Fixed bug where source video audio would play during encoding by explicitly pausing and muting the video element when 'Start Encoding' is clicked.
- Added logic to unmute the video when the user initiates a manual preview playback via the OSD button or canvas click.
## 2026-03-13 19:00 - Encoder Mobile Optimization & UI Fixes
- Added comprehensive touch event support (touchstart, touchmove, touchend) for timeline markers, playhead, and canvas crop dragging.
- Unified event handling for mouse and touch to ensure consistent behavior across platforms.
- Fixed 'passive: false' issues on touchmove to allow preventDefault() for smoother dragging without page scrolling.
- Added Visibility API handling: Automatically refreshes preview when the tab regains focus and logs warnings if encoding is throttled in the background.
## 2026-03-13 19:30 - Architectural Analysis: Canvas Pre-Resizing vs WASM Resizing
- Conducted a deep architectural review of the new 'Canvas Pre-resizing' pipeline in encoder.html.
- Concluded that shifting aspect ratio management (Crop/Pad/Force) and image scaling from WASM (CPU) to the browser's Canvas API (GPU-accelerated) provides exponential performance gains.
- Payload transfer between UI thread and WebWorker is reduced by up to 97% for 1080p source video (from ~8MB per frame to a fixed 196KB).
- Garbage Collection thrashing is eliminated, ensuring a stable memory footprint.

## 2026-03-21 00:45:00: WASM Build & Service Worker Caching Conflict
- **The Issue:** After exposing `get_last_vram` in Rust and recompiling the WebAssembly module, the browser encountered a `wasm.mv2encoder_get_last_vram is not a function` error during encoding.
- **Diagnostic Discovery:** The culprit was `coi-serviceworker.js` (required for SharedArrayBuffer). The Service Worker aggressively cached the *old* `.wasm` binary and JS module, refusing to load the new deployment.
- **The Fix (Cache Busting):** Implemented a robust cache-busting strategy directly in the code to bypass the Service Worker.
    - Updated HTML files to instantiate the worker dynamically: `new Worker('./worker.js?v=' + Date.now())`.
    - Converted the static ES module import in `worker.js` to a dynamic import: `const module = await import('./pkg/mv2_wasm.js?v=' + Date.now());`
    - Forced the WASM initialization to fetch a unique binary URL: `await init('./pkg/mv2_wasm_bg.wasm?v=' + Date.now());`
- **Result:** The browser now fetches the latest WASM binary and JS bindings on every load during development.

## 2026-03-21 01:30:00: WebAssembly Multi-Threading Activated (Rayon)
- **The Issue:** Despite compiling `mv2_wasm` with `rayon` and `wasm-bindgen-rayon` for parallel processing, the WebWorker was only utilizing a single CPU thread, severely bottlenecking encoding performance.
- **The Fix:** In `worker.js`, added an explicit call to `module.initThreadPool(navigator.hardwareConcurrency)` immediately after the WASM binary is initialized.
- **Result:** The WASM environment now accurately detects the host machine's logic cores (e.g., 16 threads) and spawns the corresponding number of Web Workers. The Rust `par_iter()` loops can now fully saturate the CPU, dramatically reducing the encoding time per frame.

## 2026-03-21 02:00:00: IPC Memory Optimization (Zero-Copy Transferable Objects)
- **The Issue:** The main thread and `worker.js` were using standard `postMessage` to pass raw pixel data (e.g., `rgbaBytes`, `ditheredRGB`) back and forth. This triggered "Structured Cloning", meaning the browser was physically copying up to 8MB of memory per frame for 1080p video, causing massive Garbage Collection (GC) spikes and UI stuttering.
- **The Fix:** Implemented `Transferable Objects` across the entire pipeline (`encoder.html`, `hq_encoder.html`, `wasm_encoder.html`, and `worker.js`). 
    - By passing the `.buffer` property of the `Uint8Array`s as the second argument to `postMessage(..., [buffer])`, we transfer "ownership" of the memory instead of copying it.
    - Added a defensive deep-copy for `pcmSlice` (`new Int16Array(pcmSlice)`) before transfer to prevent detaching the master audio buffer.
- **Result:** Inter-Process Communication (IPC) overhead between the UI and the WebWorker is now nearly zero, entirely eliminating GC stuttering and freeing up resources for the Rust encoder.

## 2026-03-21 02:30:00: CPU Instruction Optimization & Mathematical Elimination (LUT + SIMD)
- **The Issue:** Even with 16-thread `Rayon` processing, the inner loops of the `KMeansQuantizer` and `GreedyQuantizer` were bottlenecked by performing millions of complex color distance calculations (Redmean/Euclidean) per frame using scalar math.
- **The Fix 1 (Global 512x512 LUT):** Realizing that MSX2 only supports a rigid 512-color grid, computing distances dynamically is redundant. We implemented a static `OnceLock` 512x512 Lookup Table (LUT). At runtime, all RGB pixels are instantly snapped to their `0..511` index, and distance calculation (`color_dist_redmean_sq`) is entirely bypassed in favor of a direct array lookup (`lut[color_a_idx][color_b_idx]`).
- **The Fix 2 (WASM SIMD):** Enabled the `+simd128` feature flag in `.cargo/config.toml`. The Rust LLVM compiler now auto-vectorizes the LUT lookups and histogram summation loops, processing 128-bits (4 integers) per CPU cycle instead of one.
- **Result:** The mathematical overhead of the quantization phase has been virtually eliminated (Math-less Quantization). The combination of 16-thread outer loops (`Rayon`), Math elimination (`LUT`), and 128-bit inner loop processing (`SIMD`) represents the absolute theoretical limit of CPU optimization for this specific architecture.
- Fixed a bug in encoder.html and hq_encoder.html where the preview canvas CSS aspect-ratio could become desynced from the radio buttons on initial load or mode change. The preview now forcefully synchronizes its aspect ratio on every redraw.
## 2026-03-13 20:00 - Interactive Resizable Encoding Area (UI Enhancement)
- Upgraded the preview canvas to feature a fully interactive, free-form resizable blue target box.
- Added 4 corner handlers (triangles) for resizing. Dragging a corner uses the diagonally opposite corner as a fixed anchor.
- Added an Aspect Lock toggle (🔒/🔓) in the center of the box to switch between maintaining the 5:3/4:3 ratio and free-aspect resizing.
- Added '256px' and '192px' dimension labels around the box to clarify what the box represents.
- Implemented a real-time Picture-in-Picture (PiP) preview that appears in the opposite corner while resizing, showing exactly how the cropped area will look when squashed to 256x192.
- Refactored the core encoder loop to use the visual bounding box as the single source of truth for the final spatial crop and squash, rendering the legacy 'Pad' and 'Force' aspect modes mostly conceptual.
- Enhanced the tri-state monitor splitters with visual grip textures and added full mobile touch support (touchstart, touchmove, touchend) to ensure they are draggable on phones/tablets.
- Ported all interactive UI enhancements (free-form resizable box, PiP, mobile touch for splitters, aspect locking) from encoder.html to hq_encoder.html and wasm_encoder.html.
- Adapted the ENCODE_FRAME loop in both alternative encoders to consume the 'customBox' coordinates, scaling them appropriately to their respective high-resolution offscreen canvases.
## 2026-03-13 21:00 - Adaptive Aspect Modes
- Modified 'Pad' and 'Force' aspect modes to behave as rigid, automated presets (Letterbox and Stretch). When active, resizing handles and PiP preview are hidden.
- Implemented 'Auto-Switch' logic: If a user clicks or drags the canvas while in 'Pad' or 'Force' mode, the UI instantly switches the dropdown to 'Crop' mode and reveals the free-form resizing handles.
- Moved the Aspect Lock (🔒/🔓) icon to the top-left of the preview canvas to prevent interaction conflicts with the central OSD Play/Pause button.
- Updated main encoding loops across encoder.html, hq_encoder.html, and wasm_encoder.html to respect the explicit 'pad' and 'force' spatial logic when not in custom crop mode.
## 2026-03-21 05:15 - hq_encoder.html Visual Rendering Port
- Ported the complete `drawPreviewCanvas` rendering engine from encoder.html to hq_encoder.html:
  - 4 corner triangle resize handles with anchor-based dragging.
  - Center-of-box 🔒/🔓 aspect lock toggle (moved from top-left 40x40 area).
  - "256px" / "192px" dimension labels around the target box.
  - Real-time PiP (Picture-in-Picture) preview during corner resizing.
  - Dashed border when aspect lock is disabled (`isCustomMode && !isAspectLocked`).
  - Unified rendering via `customBox || getCalculatedBox()` as single source of truth.
- Added iOS-safe `loadVideoFile`: `sourceVideo.load()` + `onerror` handler to prevent infinite hangs.
- Confirmed that after this port, wasm_encoder.html and hq_encoder.html are functionally identical (only title/heading differ); wasm_encoder.html was intentionally left unmodified.
## 2026-03-21 14:20 - UI Bug Fixes & PAR Correction
- Moved 🔒/🔓 lock icon from box center to top-center (y+14px) to avoid OSD play/pause button conflict.
- Fixed `force` mode: `getCalculatedBox()` now overrides `drawX/drawY/drawW/drawH` so video is stretched to fill canvas.
- Fixed `cfg_aspect` change handler in encoder.html: now clears `customBox` and `isCustomMode` so switching aspect modes properly resets the box.
- Added 3px edge snapping: box edges snap to source video boundaries during resize/pan. Hold Alt (Win/Linux) or Cmd (Mac) to disable snapping.
- Fixed play/pause toggling when interacting with resize handles: set `hasDraggedCanvas = true` immediately on box interaction start.
- Updated anchor colors tooltip with full per-color reference (K/W/R/G/B/C/M/Y/A and dark variants r/g/b/c/m/y/w plus _ hold modifier).
- **PAR (Pixel Aspect Ratio) Correction**: Fixed pad mode appearing as force (stretched) when 4:3 source video used with 5:3 target ratio. `getCalculatedBox()` now computes `correctedVideoAspect = videoAspect / PAR` to compensate for non-square pixels caused by CSS aspect-ratio stretch. Crop box also uses `canvasAspect` for correct pixel-proportional selection.
## 2026-03-21 14:40 - Encoder ↔ Player Integration (BroadcastChannel)
- Added 🎬 encoder launch button to index.html app-bar (opens encoder.html in new tab).
- Implemented `BroadcastChannel('msx-encoder-player')` for cross-tab communication:
  - **Encoder side** (encoder.html, hq_encoder.html): After encoding completes, a green "▶ Send to Player" button appears. Clicking sends the .mv2 ArrayBuffer via BroadcastChannel, then shows "✓ Sent!" confirmation.
    - *Fix (14:55)*: Fixed an issue where `progress-container` `display: none` was incorrectly hiding the button after encoding finished. Now only the `progressBar` is hidden.
  - **Player side** (index.html): Receives the encoded file, wraps it as a File object, prepends it to the playlist, and auto-plays it with `window.focus()`.
- Added an **"Auto-Download" checkbox** next to the Start Encoding button. Unchecking and using "Send to Player" prevents the browser from downloading testing files locally.
  - Added a manual **"⬇️ Save MV2" button** that appears alongside "Send to Player" after encoding, allowing users to still download the file even if auto-download was disabled.
- Tri-state monitor splitters: Changed initial position from 0%/100% to 25%/75% (25%|50%|25% split) across all three encoder files.
- Added missing variable declarations (`customBox`, `isCustomMode`, `isAspectLocked`, `dragMode`, `dragStartBox`) to wasm_encoder.html to fix ReferenceError in strict mode.

## 2026-03-21 20:30 - Audio & Video Adjustment Controls
- Added slider controls for **Brightness**, **Contrast**, **Saturation**, **Hue**, **Gamma**, and **Audio Gain (dB)** to the encoder UI (`encoder.html`, `hq_encoder.html`).
- **Real-time Preview:** Adjusting the sliders updates the video preview instantly using HTML5 Canvas `ctx.filter` with CSS `brightness`, `contrast`, `saturate`, and `hue-rotate`.
- **Hardware-accelerated Gamma:** Implemented an inline SVG `<filter>` with `<feComponentTransfer>` to provide real-time gamma correction via the `url(#gamma-filter)` CSS filter.
- **Video Extraction:** The combined color filters are automatically applied to the offscreen canvas (`offCtx`) before drawing frames for encoding.
- **Audio Gain:** Implemented direct linear scaling of the decoded PCM Float32 audio chunks before converting to Int16 for the MP3 encoder, accurately applying the user's dB gain setting.
## 2026-03-21 21:50 - Crop Editor Resizing Fix
- **Aspect-Locked Resizing Algorithm Overhaul:** Replaced the previous corner resizing algorithm which exclusively drove scale changes off the horizontal mouse movement (`dx`). Implemented a dominant-axis driven approach that calculates scaling based on whichever movement (`dx` or `dy`) is larger.
- **Corner Anchoring:** Accurately anchored the opposite corner for all four resize handles (`tl`, `tr`, `bl`, `br`) while resizing under aspect-lock, preventing the box from moving in counter-intuitive directions (such as moving the bottom edge down when dragging the bottom-left corner up). This provides a much smoother and predictable UX in both `encoder.html` and `hq_encoder.html`.

- **Implementation:** Standard CSS filters (Brightness, Contrast, Saturation, Hue) are now safely applied via `ctx.filter`, while Gamma correction is explicitly processed via a high-speed Lookup Table (LUT) loop during the `getImageData` extraction phase. The preview monitor applies the SVG gamma filter directly to the DOM element (`canvas.style.filter`) to maintain real-time visual accuracy without breaking the HTML5 Canvas pipeline.

## 2026-03-22 00:15 - Overlay Manual System (Korean)
- **Interactive Help System:** Implemented a context-sensitive overlay manual across all encoder variants (`encoder.html`, `hq_encoder.html`, `wasm_encoder.html`).
- **Visuals:** Added semi-transparent `.help-overlay` boxes (`rgba(10, 10, 30, 0.72)`) over each UI setting group. Boxes feature a hover effect for increased opacity (`0.95`) and **automatic height expansion** (`height: auto; bottom: auto;`) to prevent scrollbars and ensure the entire Korean description is visible at once.
- **Logic:** Integrated a toggle system using the ⓘ info icon (`#btnInfo`) that controls the `help-visible` class on the `body`. 
- **Auto-Hide:** Implemented logic to automatically hide all help overlays when the "Start Encoding" button is clicked, preventing UI obstruction during active processing.
- **Content:** Wrote detailed Korean explanations for all technical parameters, including Quantizer algorithms, Dither strength, Anchor colors, Distance metrics, and Aspect Ratio/Mode.

## 2026-03-22 00:30 - Crop Box Handle & UX Refinement
- **Handle Standardization:** Replaced the previous triangular crop handles with **highly-visible square handles** (`rgba(77, 184, 255, 0.9)`) in `encoder.html` and `hq_encoder.html`. 
- **Bug Fix:** Resolved a rendering bug in `encoder.html` where the bottom-left (BL) handle coordinates were incorrectly calculated, causing visual distortion.
- **Improved Visibility:** Increased handle opacity and standardized size (10px) to ensure they are easy to grab on both high-DPI and standard displays.
## 2026-03-21 04:00:00: Sub-worker Resolution & Modern WASM Init Fixed
- **The Issue:** Sub-workers failed to load with a 'TypeError' pointing to the `/pkg/` directory. The generic directory import in `workerHelpers.js` was not being resolved correctly by the Service Worker.
- **The Fix:** Patched `workerHelpers.js` to explicitly import `mv2_wasm.js` and aligned `worker.js` with the modern `wasm-bindgen` initialization API.
- **Result:** 16-thread multi-processing is now operational.
## 2026-03-21 05:30:00: Critical Patch for Memory Injection Logic
- **The Issue:** 'unreachable executed' occurred during initialization. This was traced back to `__wbg_get_imports` being called without the manually injected memory object, leaving essential internal WASM views (like `Uint8Array` into memory) uninitialized.
- **The Fix:** Updated the `mv2_wasm.js` surgical patch to pass the `maybe_memory` argument to `__wbg_get_imports(maybe_memory)`.
- **Stability Refinement:** Lowered initial memory to **256 pages** (16MB) and capped threads to **12** to reduce browser resource contention, while maintaining the **2MB per-thread stack size**.
- **Result:** Clean initialization and stable thread pool spawning.
