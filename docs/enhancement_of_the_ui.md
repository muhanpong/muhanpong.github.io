# MSX2 MV2 Web Encoder - UI Enhancement Plan

## Overview
This document outlines the architectural plan to introduce advanced preview, cropping, monitoring, and precise segment encoding capabilities to the `encoder.html` interface. The goal is to provide a highly interactive, responsive, and informative user experience before and during the encoding process.

## Phase 1: Responsive Design & Help System
*   **Mobile Fit:** Update the preview `<canvas>` CSS to utilize `max-width: 100%`, `height: auto`, and dynamic `aspect-ratio` to ensure it scales correctly on mobile devices while maintaining the `pixelated` rendering.
*   **Info Icon:** Add an SVG info icon `ⓘ` next to the main title "MSX2 MV2 Web Encoder".
*   **Tooltips:** Implement a lightweight JS tooltip system. When the info icon is clicked/tapped, hovering or tapping on labels (e.g., "Quantizer Algorithm", "Dither Strength") will display a floating tooltip explaining the setting's purpose.

## Phase 2: Source Media Preview, Seeking & Range Selection
*   **Hidden Video Element:** Manage a persistent, hidden `<video>` element in the DOM to load the user's selected file.
*   **File Selection Hook:** When a user selects a file via `#videoInput` or **drags and drops a file directly onto the `previewCanvas`**, load the file into the hidden video element and draw the first frame to the `previewCanvas`.
*   **Advanced Seek Slider & Range Selection:** Introduce an interactive timeline below the canvas for seeking and defining the exact encoding segment.
    *   **Time Input UI:** Add text/number inputs formatted as `[hh]:[mm]:[ss].[SSS]` for highly precise Start and End time selection.
    *   **Draggable Markers:** Add visual Start and End markers on the slider track. Users can grab and drag these markers independently.
    *   **Marker Constraints:** Enforce logic preventing the Start marker from passing the End marker, and vice versa (they cannot cross each other).
    *   **Click-and-Drag Anchor Logic:** If a user clicks down on the empty slider track, it sets an anchor. 
        *   Dragging left from the anchor: The anchor becomes the End marker, and the current mouse position becomes the Start marker.
        *   Dragging right from the anchor: The anchor becomes the Start marker, and the current mouse position becomes the End marker.
    *   **Two-Way Synchronization:** Dragging the markers automatically updates the `[hh]:[mm]:[ss].[SSS]` inputs, and manually typing values into the inputs immediately updates the visual markers on the slider.
*   **Interactivity:** Scrubbing the slider updates the hidden video's `currentTime` and draws the frame onto the `previewCanvas` in real-time.

## Phase 3: Aspect Ratio & Interactive Target Window
*   **Aspect Ratio Controls:** Add radio buttons to select the target encoding ratio: **[ 5:3 ]** (MSX standard) or **[ 4:3 ]**.
*   **Target Overlay Drawing:** When in preview mode, draw a visual overlay (e.g., semi-transparent borders or dashed outlines) over the `previewCanvas` to represent the final encoded area based on the selected Aspect Mode.
    *   *Pad Mode:* The overlay shows letterboxing/pillarboxing regions.
    *   *Force Mode:* The overlay covers the whole screen (indicating squashing/stretching).
    *   *Crop Mode:* The overlay maintains the target aspect ratio but highlights the specific area of the source image that will be encoded.
*   **Interactive Cropping (Drag & Drop):** 
    *   Attach mouse/touch event listeners to the canvas.
    *   If Aspect Mode is 'Crop', dragging the target window on the canvas will physically move the crop region.
    *   This drag action will dynamically calculate and update the "Crop Left Offset (%)" and "Crop Up Offset (%)" input fields in real-time.

## Phase 4: Pre-Encoding State Lockdown
*   **UI Freeze:** Upon clicking "Start Encoding", a function will iterate through all configuration inputs (`input`, `select`, aspect radios) and the seek slider range markers, setting them to `disabled = true` (grayed out) to prevent modification.
*   **Mode Switch:** The canvas internal state will switch from "Preview Mode" to "Encoding Monitor Mode".

## Phase 5: Split-Screen Encoding Monitor (Tri-State)
*   **Multi-State Rendering Requirement:** During encoding, the system needs access to three versions of the frame to fulfill the monitor requirements:
    1.  `Source`: The scaled original frame.
    2.  `VRAM Packed`: The final MSX2 restricted image (Default MV2 look).
    3.  `Raw Dithered`: The dithered image *before* VRAM color clash limits are applied.
*   **Interactive Splitters:** Implement two invisible draggable vertical edges on the canvas:
    *   **Left Edge:** Controls a vertical line. Dragging it right reveals the `Source` media on the left, keeping `VRAM Packed` on the right.
    *   **Right Edge:** Controls a vertical line. Dragging it left reveals the `Raw Dithered` media on the right, keeping `VRAM Packed` on the left.
*   **Rendering Logic (Monitor Mode):**
    *   Clear canvas.
    *   Draw `Source` image from $X=0$ to $X=LeftEdge$.
    *   Draw `VRAM Packed` image from $X=LeftEdge$ to $X=RightEdge$.
    *   Draw `Raw Dithered` image from $X=RightEdge$ to $X=Width$.
    *   Draw vertical divider lines (e.g., solid colors) at the edge positions to clearly delineate the views.
    *   *Default State:* Left Edge is at $X=0$, Right Edge is at $X=Width$, meaning only the `VRAM Packed` image is visible.

## Phase 6: Early Abort & Partial Download
*   **Stop Button:** Once encoding begins, the "Start Encoding" button transforms into a "Stop Encoding" button.
*   **Graceful Interrupt:** Clicking "Stop Encoding" will break the encoding loop immediately.
*   **Partial Finalization:** The system will finalize the MP3 audio chunks and the video multiplexer for the exact number of frames processed up to the stop point, and immediately trigger the download of the partial `.mv2` and `.rgb` files.
