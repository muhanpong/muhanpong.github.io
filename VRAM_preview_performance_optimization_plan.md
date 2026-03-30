# Performance Optimization Plan: Encoder vs VRAM Preview

Analyze and address the performance gap between the encoding process and the VRAM preview mode.

## Proposed Changes

### [Worker] [worker.js](file:///c:/Users/povian/git/muhanpong.github.io/worker.js)
- **Move Gamma Correction**: Offload the gamma correction loop from the main thread to the worker.
- **Implement Gamma LUT**: Create a persistent Look-Up Table (LUT) in the worker to speed up color adjustments.
- **Support Gamma in ENCODE_FRAME**: Apply gamma correction within the `ENCODE_FRAME` handler before passing data to WASM.

### [Encoder] [encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html)
- **Remove Main Thread Gamma Loop**: Stop applying gamma in the encoding loop to free up CPU for video seeking and UI updates.
- **Streamline PostMessage**: Remove redundant `Uint8Array` and `Int16Array` copies before `postMessage`.
- **Optimize Tri-state Monitor**: Replaced expensive `clip()` and `save()`/`restore()` calls with direct 9-argument `drawImage()` for frame splits.
- **Pipelined Encoding Loop (Phase 2)**: Overlap `video.currentTime` seeking for Frame N+1 while the Worker is still processing Frame N. This hides the seeking latency behind the WASM computation.

## Verification Plan

### Automated Tests
- Performance benchmarking: Measure frames per second (FPS) before and after changes.
- Visual verification: Ensure the output MV2 file still has correct colors/gamma.

### Manual Verification
- Test "Start Encoding" and compare the progress speed with the previous version.
- Verify that "VRAM Preview" still works correctly and matches the encoding output.
