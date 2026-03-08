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
