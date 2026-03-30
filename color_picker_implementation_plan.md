# VRAM Color Picker & Fixed Palette Feature

Implement a color picker that allows users to sample colors from the VRAM preview and lock them into the MSX2 palette using "Anchor Colors".

## Proposed Changes

### [Encoder Page] [encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html)

#### UI Enhancements
- **Anchor Input Actions**: Add a "Clear" button and a color swatch next to the `cfg_anchors` input field.
- **Canvas Interaction**: Add a click event listener to the main preview canvas.
- **Help Text Update**: Update the `cfg_anchors` help overlay to explain that hex codes (e.g., `#RRGGBB`) can be used as anchors.

#### Logic
- **`handleVramClick(e)`**: 
    - Calculate canvas-to-VRAM (256x192) coordinate mapping.
    - Sample color from `window.vramTempCanvas`.
    - Format color as hex (e.g., `#FF4488`) and append to `cfg_anchors`.
    - Trigger `renderPreview()` to immediately show the effect.

### [MODIFY] [hq_encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/hq_encoder.html)
- **Resolve Conflicts**: Remove all git markers and unify the UI/Logic based on [encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html).
- **Sync Features**: 
  - Apply **Pipelined Loop** for faster encoding.
  - Implement **VRAM Color Picker** (Click sampling + Clear button).
  - Add **`isBusy` lock compatibility** and **`remainingMp3` clamping**.

### [WASM: mv2_wasm] [palette.rs](file:///c:/Users/povian/git/msx_mv2_encoder_rs/mv2_wasm/src/palette.rs)

#### Rust Logic
- **[resolve_shorthand_anchors](file:///c:/Users/povian/git/msx_mv2_encoder_rs/mv2_wasm/src/palette.rs#45-122)**:
    - Update the while loop to detect `#` characters.
    - If `#` is found, parse the following 6 characters as hex using [parse_hex_color](file:///c:/Users/povian/git/msx_mv2_encoder_rs/mv2_wasm/src/palette.rs#162-170).
    - Add the resulting color (snapped to MSX levels) to the anchor list.
- **Improved Parsing**: Support Mixed shorthand and hex (e.g., `K_W_#FF0000`).

## Verification Plan

### Manual Verification
1.  Open the encoder and switch to "VRAM Preview" mode.
2.  Click on a pixel in the VRAM preview.
3.  **Verify UI Update**: Check if the hex color (e.g., `#FF0000`) appears in the "Anchor Colors" text box.
4.  **Verify Visual Feedback**: Ensure the preview updates and uses that specific color in the palette.
5.  **Verify Clear**: Click the "Clear" button and ensure the anchors are reset.
