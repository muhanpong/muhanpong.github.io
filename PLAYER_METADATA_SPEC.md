# Recommendation: Player Metadata Display Upgrade

Our new encoders (Rust/Python) are now writing a rich "Recipe JSON" into the `.MV2` header starting at offset `0x100` (256 bytes). The current `index.html` player reads this, but we can improve the UI significantly.

## 1. Metadata Schema (Current)
The encoders write the following structure:
```json
{
  "encoder": "msx_encoder v0.1.0 (Rust)",
  "source": "input_file.webm",
  "date": "2026-03-09T...",
  "duration_sec": 12.34,
  "play_time": "00:12.34",
  "total_frames": 185,
  "settings": {
    "quantizer": "Kmeans",
    "dither": "Fs",
    "dither_strength": 75,
    "edge_threshold": 800,
    "hue_threshold": 0,
    "anchors": 1,
    "anchor_colors": "K",
    "aspect": "Crop",
    "nv": true,
    "extra_colors": 15
  }
}
```

## 2. UI Improvement Recommendations for `index.html`

### A. Semantic Highlights
Instead of raw white text, the player should highlight specific "Performance" and "Quality" keys:
*   **Cyan:** `dither`, `dither_strength`
*   **Yellow:** `quantizer`, `extra_colors`
*   **Green:** `nv` (NVIDIA hardware accel indicator)
*   **Red:** `anchors`, `anchor_colors`

### B. Automatic "Recipe" Tooltip
When a user hovers over the "ⓘ" icon in the playlist, the player should show a summary of the recipe (e.g., "KMeans + Floyd-Steinberg (75%)") instead of just saying "Metadata Available."

### C. Technical Layout
The `updateMetadataUI` function in `index.html` could be updated to group these settings into a "Hardware" section and a "Visuals" section rather than a flat recursive list.

## 3. Implementation Note for Gemini (new_encoder side)
Ensure that the Python `new_encoder.py` matches these key names exactly:
*   Use `"source"` instead of `"source_file"`.
*   Ensure all settings are nested inside a `"settings"` object.
*   Keep the duration key as `"duration_sec"` for unambiguous unit handling.
