# MSX2 MV2 Encoder Optimization Plan

This plan aims to resolve performance and stability bottlenecks in the web encoder by offloading heavy tasks to background workers/WASM and implementing file streaming.

## Proposed Changes

### [Frontend] Core Encoding & UI
*   **[MODIFY] [encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html)**
    *   **File Streaming (Task 3)**:
        *   Implement `requestSaveFile()` using `window.showSaveFilePicker`.
        *   Transition from `accumulatedMv2Blocks` array to a `FileSystemWritableFileStream`.
        *   Write 16KB blocks to disk immediately upon receipt from the worker.
    *   **MP3 Migration (Task 1)**:
        *   Move `lamejs` initialization and encoding loop from `btnStart` listener to [worker.js](file:///c:/Users/povian/git/muhanpong.github.io/worker.js).
        *   Send the PCM data to the worker and receive encoded MP3 chunks back.
    *   **UI Throttling (Task 4)**:
        *   Wrap `drawPreviewCanvas` calls in `requestAnimationFrame` for mouse/touch events.

---

### [Background] Worker Logic
*   **[MODIFY] [worker.js](file:///c:/Users/povian/git/muhanpong.github.io/worker.js)**
    *   **WASM Optimization (Task 2)**:
        *   Replace the manual VRAM-to-RGBA reconstruction loop with calls to the already existing [get_last_vram_rgba()](file:///c:/Users/povian/git/msx_mv2_encoder_rs/mv2_wasm/src/lib.rs#467-507) WASM method.
        *   Offload Gamma application to WASM if possible, or at least optimize the JS loop.
    *   **MP3 Encoding**:
        *   Integrate `lamejs` to perform background MP3 encoding during the frame processing loop.

---

### [WASM] Rust Core
*   **[MODIFY] [lib.rs](file:///c:/Users/povian/git/msx_mv2_encoder_rs/mv2_wasm/src/lib.rs)**
    *   Ensure [Mv2Encoder](file:///c:/Users/povian/git/msx_mv2_encoder_rs/mv2_wasm/src/lib.rs#93-110) provides efficient access to all preview buffers.
    *   Add a `apply_gamma_to_buffer` utility if needed to completely eliminate JS loops.

## Verification Plan

### Automated Tests
*   Run the existing test scripts in `msx_mv2_encoder_rs/mv2_wasm/` to ensure encoder logic remains correct.
    *   `node test_encode.js` (if configured for Node).
*   Verify WASM build: `wasm-pack build --target web` in `mv2_wasm`.

### Manual Verification
1.  **Memory Stability**: Encode a long video (e.g., 5+ minutes) and monitor RAM usage in Chrome DevTools (Task 3).
2.  **UI Fluidity**: Verify that the UI remains responsive (buttons clickable, sliders smooth) during the audio encoding phase (Task 1).
3.  **Visual Correctness**: Compare the VRAM preview before and after WASM migration to ensure no regression in pixel mapping (Task 2).
4.  **Slider Smoothness**: Rapidly drag the crop window and timeline markers to ensure no frame drops or lag (Task 4).
