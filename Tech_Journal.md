# Tech Journal: MSX2 MV2 Encoder Development

## 2026-03-24 21:55:12 - VRAM Preview Toggle Implementation
- **Ported VRAM Preview:** Integrated the `Source Preview` / `VRAM Preview` toggle feature from `encoder-dev.html` into both stable encoders.
- **Worker Enhancement:** Added `TEST_FRAME` message handler to `worker.js`. This allows generating MSX-compliant VRAM and Palette data for a single frame using a transient WASM encoder instance.
- **Rendering Pipeline Refactor:** 
    - Extracted UI overlay logic (borders, corners, lock icon, dimensions, and resizing PiP) into a dedicated `drawUIOverlays(box)` function.
    - Updated `drawPreviewCanvas` to support 100% switching based on `isVramPreviewMode`.
    - Implemented `isVramProcessing` lock to prevent task queue congestion during real-time playback.
    - Used the high-performance `Uint32Array` VRAM-to-RGBA decoding loop for the preview mode.
- **UI Alignment:** Added `btnTestFrame` to the main control row, ensuring consistent styling and behavior between `encoder.html` and `hq_encoder.html`.
## 2026-03-13 22:30 - VRAM Preview Fixes & Toggle Improvements
- Fixed VRAM preview in all encoder variants (encoder.html, hq_encoder.html, encoder-dev.html).
- Updated worker.js and worker-dev.js to return 'ditheredRGB' in 'TEST_FRAME' response for high-performance rendering.
- Replaced slow manual pixel-by-pixel reconstruction in HTML files with direct 'putImageData' using the dithered buffer.
- Implemented 'Keep Playing Toggle': Removed auto-pause when switching between Source and VRAM preview modes.
- Re-enabled UI overlays (blue crop box, resize handles) in VRAM preview mode to allow interactive editing while viewing the dithered result.
- Refined VRAM Preview Mode: Disabled the rendering of the blue crop box and interactive UI overlays (drawUIOverlays) while in VRAM mode to provide a clean, unobstructed view of the final MSX-dithered output.
- Corrected VRAM Preview rendering: Reverted from using 'ditheredRGB' to manually reconstructing the image using 'vramBytes' and 'paletteBytes' in JS. This correctly enforces and displays MSX hardware limitations (e.g., 2 colors per 8x1 block color clash) in the VRAM preview mode, which 'ditheredRGB' bypassed.
- Fixed VRAM preview issue where dragging the canvas or seek slider while paused would leave the 'Source' frame permanently visible on screen. Added 'renderPreview()' calls on 'mouseup' and 'touchend' events to force the VRAM worker to re-process and redraw the dithered frame once dragging stops.
