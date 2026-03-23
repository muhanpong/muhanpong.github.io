# MV2 Integrated Master Encoder: Comprehensive Technical Blueprint

This report synthesizes the advanced features discovered across the `new_encoder`, `MV2demuxer`, and `dither_9bit` projects. It serves as a reproduction guide for an integrated, high-performance MV2 media encoder for MSX2 hardware.

---

## 1. Core Architecture & File Format
The MV2 format is built on **16KB fixed-size blocks** optimized for MSX2 VRAM streaming.

- **Header Structure (16KB):**
  - `0x00-0x07`: Magic String (`MMCSD_MV`).
  - `0x10-0x14`: Version (`v2.00`).
  - `0x18-0x1B`: Total Frame Count (Little-endian).
  - `0x0100+`: Optional Metadata (JSON: `encoder`, `source`, `roi_face`, etc.).
- **Frame Block (16KB):**
  - `0KB - 6KB`: **PGT** (Pattern Generator Table - 1 bit/pixel).
  - `6KB - 12KB`: **CT** (Color Table - FG/BG index per 8x1 block).
  - `12KB - 12.03KB`: **Palette** (30 bytes, 15 colors, RGB333).
  - `12.03KB - 12.04KB`: **Audio EQ Data** (10 bytes of FFT energy).
  - `12.5KB`: **Sync/Control Flags** (EOF, Looping, etc.).
  - `12.5KB+`: **MP3 Audio Chunk** (Dynamic sizing for 15fps sync).

---

## 2. Advanced VRAM & Color Clash Logic
To overcome the MSX2 "2 colors per 8x1 block" constraint, the following optimizations are implemented:

- **Optimal FG/BG Search (CUDA/Numba):**
  - **Pre-calculated Distance Matrix:** A `(8, 16)` matrix of distances between each pixel in a row and all 16 palette colors.
  - **Brute-force Pair Evaluation:** Iterates through all 120 possible `(i, j)` color pairs to find the one minimizing total block error.
  - **Redmean Distance:** Uses weighted Euclidean distance `(2+r_mean/256)*dr^2 + 4*dg^2 + (2+(255-r_mean)/256)*db^2` for perceptual accuracy.
- **Error Projection (Breakthrough):**
  - Prevents "color locking" in dithering by projecting the quantization error onto the vector formed by the block's FG and BG colors.
  - **Despeckling:** Post-processing filter to remove isolated pixels ("sparkles") caused by extreme dither noise.

---

## 3. Sophisticated Palette Engine
The palette is the "brain" of the encoder.

- **Hybrid Selection Strategy:**
  - **Anchors (Fixed Slots):** User-defined strings (e.g., `KWCYMR`) lock critical colors (Black, White, etc.) into specific indices.
  - **Greedy Block-Error Selection:** Instead of just image-wide KMeans, this selects colors that minimize the *actual hardware error* after VRAM packing.
  - **Taichi GPU Palette Voting:** Massive parallel voting where pixels "vote" for the best MSX2 hardware levels.
- **ROI (Region of Interest) Weighting:**
  - **Face Detection:** Haar Cascade weights face pixels (30x multiplier) to preserve skin tones.
  - **Motion/Center Weighting:** Higher sampling priority for the center of the frame and moving objects.
- **Luminance Sorting:** Dynamic colors are sorted by luminance `0.299R + 0.587G + 0.114B` for temporal stability and better dithering gradients.

---

## 4. Dithering & Visual Processing
Multiple modes provide a trade-off between detail and noise.

- **Matrix Dithering:** Bayer 4x4, Bayer 8x8 with adjustable `spread`.
- **Error Diffusion:**
  - **Floyd-Steinberg (FS):** Standard high-detail.
  - **Jarvis-Judice-Ninke (JJN):** High-density, slower.
  - **Sierra3:** Balanced alternative to JJN.
  - **Error Dampening:** Coefficient (0.0 - 1.0) to prevent "bleeding" of colors across high-contrast edges.
- **Weird/Staggered Mode:**
  - Experimental **Half-Brick Staggered** dithering.
  - Pixels on even/odd lines use different palette sub-sets (Anchors vs. Dynamic) to simulate higher color depth.

---

## 5. Audio & EQ Visualization
- **Synchronized MP3 Chunking:** Audio is sliced into precise chunks to maintain 15fps sync, even with variable bitrate files.
- **Real-time FFT Energy Extraction:**
  - Extracts energy from 9 specific frequency bands (Sub-bass to High-treble).
  - Energy is mapped to a 0-15 scale for the MSX2 player to render a live spectrum analyzer.
- **Pink Noise Injection:** Lo-fi mode for "weird" experiments, degrading audio for a retro aesthetic.

---

## 6. High-Performance Pipeline
- **Hardware Acceleration:**
  - **NVENC (h264_nvenc):** Offloads pre-scaling and preview video generation to the GPU.
  - **PyTorch/Taichi:** GPU-accelerated KMeans and Palette selection.
  - **CUDA:** C-level performance for VRAM block searches.
- **Numba (`@njit`):** Compiles Python math to machine code; `parallel=True` utilizes all CPU cores for VRAM encoding and dithering.
- **Caching Mechanism (SQLite):**
  - An `mv2_encoder_cache.db` tracks source files and parameters.
  - Re-uses pre-scaled video and extracted audio if parameters haven't changed, saving 80% of encoding time on repeated runs.

---

## 7. Integration Recommendation
For the **"Integrated Big One"**, combine:
1.  **Preprocessing:** NVENC Pre-scaler + SQLite Cache.
2.  **Analysis:** Taichi GPU Palette Selector + ROI Face Detection.
3.  **Dithering:** Numba-accelerated Sierra3 with Error Projection.
4.  **Encoding:** CUDA Optimal Pair Search + Numba VRAM Packing.
5.  **Output:** 16KB Sync-aligned MP3/EQ Blocks.
