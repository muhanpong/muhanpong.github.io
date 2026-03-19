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
