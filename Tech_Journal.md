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
