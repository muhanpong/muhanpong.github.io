---
name: MSX MV2 encoder Developer Agent
description: Lead architect and engineer for the MSX2 MV2 encoder
version: 1.0.0
role: Full-stack retro-hardware architect and engineer
---

# MSX MV2 encoder Developer 

**Project Goal:** I am a research to create a highly optimized, aesthetically pleasing video encoder targeting the severe hardware constraints of the MSX2 computer (specifically SCREEN 2 mode), focusing on the custom `.MV2` format.

## 1. The Core Challenge: MSX2 Hardware Constraints

The MSX2 (VDP V9938) has significant limitations that dictate every algorithm in this encoder:
*   **Color Palette:** A maximum of **16 colors** on screen at any one time, chosen from a master palette of 512 colors (9-bit RGB, `RGB333`).
*   **Color Clash (VRAM Constraint):** The screen is divided into 8x1 pixel blocks. Within any single 8x1 block, only **2 colors** (Foreground and Background) from the 16-color palette can be used.

## 2. Evolution of the Pipeline

### Phase 1: Basic Quantization & Dithering
Initially, the pipeline focused on simply finding 16 colors and dithering the image.
*   **KMeans Clustering:** Used to find the 16 most representative colors in a frame.
*   **Basic Dithering:** Standard Floyd-Steinberg (FS) was applied to map the true-color image to the 16 colors.
*   **VRAM Packing:** The image was sliced into 8x1 blocks. The two most prominent colors in each block were selected, and pixels were forced to snap to one of those two.
*   *Result:* Often resulted in severe "color clash" artifacts where the dither pattern introduced a 3rd or 4th color into a block, causing the packer to brutally overwrite details.

### Phase 2: Advanced Dithering & Error Projection
To combat color clash, we introduced highly specialized algorithms.
*   **Error Dampening (`--dampening`):** A multiplier (0.0 to 1.0) applied to the quantization error before it is diffused. A value of `0.75` softens the noise, preventing colors from bleeding too aggressively across sharp edges.
*   **Projected Error Diffusion (`_project_error`):** A major breakthrough. Instead of blindly passing error to neighboring pixels, the error is *projected* onto the vector formed by the target block's two allowed colors. This ensures that the dithering process only suggests colors that the VRAM packer can actually render, minimizing structural damage.
*   **Algorithm Variety (`--dither`):**
    *   `fs`: Floyd-Steinberg (Standard, sharp).
    *   `sfs`: Stochastic FS (Adds random noise to weights to break up repeating patterns).
    *   `jjn`: Jarvis-Judice-Ninke (Diffuses error further, resulting in denser, softer noise).
    *   `bayer` variants: Matrix-based dithering (Retro crosshatch patterns).
    *   `none`: Pure nearest-neighbor (Harsh, posterized look).

### Phase 3: Palette Control & Aesthetics
We realized that pure mathematical clustering (KMeans) often resulted in muddy, washed-out palettes that lacked "pop."
*   **Fixed Anchors (`--anchors`, `--anchor-colors`):** Allows the user to reserve slots in the 16-color palette for specific, iconic colors (e.g., `KWCYMR` = Black, White, Cyan, Yellow, Magenta, Red).
*   **Dynamic Brightness:** Anchors adapt to the frame's overall luminance (e.g., using a dark red in a dark scene instead of a blindingly bright red).
*   **Base Weighting (`--base-weight`):** This is a dual-purpose feature that fundamentally alters how the encoder prioritizes colors:
    1.  **During Palette Extraction (KMeans):** Instead of just appending anchors, we feed them into KMeans as "heavy" virtual pixels (e.g., weight = 500.0). This forces KMeans to respect the anchors and find unique dynamic colors that complement them, maximizing the utility of all 16 slots.
    2.  **During VRAM Packing (Color Clash Resolution):** *(Discovered in legacy branches)* The `base_weight` is also applied as a multiplier during the `_encode_vram_clash_optimized` block-error search. If the algorithm has to choose between a dynamic color and an anchor color that both yield similar visual errors, the weight multiplier acts as a "tie-breaker," heavily biasing the VRAM packer to choose the iconic anchor color. This ensures brand colors or primary anchors survive the harsh 2-colors-per-block limitation.

### Phase 4: Aesthetic Experiments
*   **EGA 64-Color Pre-filter (`--ega`):** A nostalgic filter that snaps all input colors to the harsh 6-bit RGB space (0, 85, 170, 255) of 1980s DOS games *before* palette extraction. 
    *   *Technical Implementation:* It uses a Numba `@njit` parallel function (`_apply_ega64_filter`) to quickly round each RGB channel of the TrueColor image to the nearest 85-step multiple.
    *   *Synergy:* When combined with KMeans, it forces the algorithm to pick from a highly restricted, high-contrast subset of colors. When combined with error diffusion dithering, the massive color steps (at least 85 RGB units) cause the dithering algorithm to generate extremely aggressive, beautiful retro checkerboard patterns to compensate.
*   **Reversed Weird Strategy (`--dither rev_weird`):**
    *   *Pass 1:* Perform high-quality 16-color dithering (e.g., Sierra3).
    *   *Pass 2:* When a VRAM block violates the 2-color rule, find the most dominant color and keep it.
    *   *Pass 3:* Force the remaining pixels in that block to snap to the closest **Anchor Color**. This creates a beautiful contrast where smooth gradients are interrupted by sharp, comic-book-style primary colors on complex edges.

### Phase 5: The "Flashing" Battle (Temporal Stability)
The most persistent issue was "flashing" or "jitter." In static scenes, the 16-color palette would rapidly swap indices between frames, causing massive, strobing color shifts across the screen.
*   **Diagnosis 1: Random Sampling:** We disabled random pixel sampling (`--sample` toggle), forcing the algorithm to analyze all pixels to ensure deterministic input data.
*   **Diagnosis 2: Sorting:** We discovered that sorting the palette by luminance at the end of the extraction process caused indices to flip if two colors slightly changed brightness. We disabled sorting when temporal logic is active.
*   **Diagnosis 3: The Algorithm Itself:** We discovered that `MiniBatchKMeans` is inherently unstable for this specific task. Even with a perfect starting point (previous frame's centroids), the batch-processing nature causes centroids to drift or swap.
*   **The Final Fix:** Moving to standard `sklearn.cluster.KMeans` combined with **Temporal Stability** (`is_scene_change` flag). If a scene hasn't changed, we initialize `KMeans` with `self.prev_centroids` and restrict `max_iter`. This "locks" the color indices in place, dropping jitter from ~25.0 down to near 0.0, achieving rock-solid video playback.

### Phase 6: Perceptual Optimization & Audio Integration
While fixing the visual stability, we also implemented several "under-the-hood" features that drastically improve the perceived quality of the output, both visually and audibly.

*   **Redmean Color Distance (`_get_redmean_dist_sq`):** Instead of using standard Euclidean distance (RGB vector distance) for color matching, we implemented the "Redmean" approximation. This formula weights the R, G, and B channels dynamically based on the average red level of the two colors being compared, closely mimicking human visual perception. This ensures that the VRAM packer and dithering engine choose visually accurate substitutions.
*   **ROI Face Weighting:** The 16-color limit often destroys subtle skin tones. We integrated OpenCV's Haar Cascade to detect faces in the video. Pixels within the bounding box of a detected face are assigned a **30x multiplier weight** before KMeans processing. This forces the algorithm to dedicate precious palette slots to human skin tones.
*   **FFT Audio EQ Analysis (`_analyze_audio_eq`):** The `.MV2` format isn't just video; it includes synced audio. The encoder extracts the PCM audio, runs a Fast Fourier Transform (FFT) synced to the 15fps video rate, and isolates 9 specific frequency bands (from 20Hz sub-bass up to 11.2kHz high-treble). The energy levels are converted to a 0-15 scale and embedded directly into the 16KB VRAM block. This allows the MSX2 player to render a real-time audio spectrum analyzer.
*   **Dynamic MP3 Syncing:** To keep the audio perfectly synced with the 15fps video without drifting, the encoder dynamically calculates the exact byte offset of the MP3 stream for each frame and embeds a variable-sized audio chunk into the remaining space of the 16KB block.

---

## 3. Summary of Key Functions

*   `_extract_palette_cpu`: The core color brain. Handles anchor weighting, ROI face detection, temporal stability, and KMeans execution.
*   `_get_redmean_dist_sq`: Numba-accelerated perceptual color distance calculator.
*   `_project_error`: The mathematical heart of our custom VRAM-aware dithering.
*   `_apply_fs_dither_numba` / `_apply_jjn_dither_numba`: High-speed, parallelized error diffusion engines.
*   `_encode_vram_clash_optimized`: Brute-force evaluates all 120 color pairs for every 8x1 block using Redmean distance to find the optimal 2-color fit, outputting final MSX2 PGT and CT bytes.
*   `_analyze_audio_eq`: Generates 9-band spectrum analyzer data for the MSX2 hardware.
*   `_apply_ega64_filter`: Simulates retro hardware limitations.

## 4. What We Achieved
By combining high-level machine learning (KMeans), physics-inspired algorithms (Error Projection), and strict retro hardware constraints, we built an encoder that doesn't just convert video; it acts as a highly stylized, temporally stable, artistic rendering engine.

---

## 5. Technology Stack & Tools Used

To achieve this level of performance and fidelity while adhering to 1980s hardware constraints, we leveraged a modern, high-performance tech stack:

*   **Python:** The core control language, orchestrating the entire pipeline.
*   **scikit-learn (KMeans):** Used for advanced color clustering and palette generation. We specifically rely on the standard `KMeans` implementation for absolute temporal stability, avoiding the index-drifting issues of `MiniBatchKMeans`.
*   **Numba (`@njit`):** Critical for performance. Python is too slow to execute complex pixel-by-pixel dithering and brute-force block-error calculations for video. Numba compiles these specific math-heavy functions (like `_apply_fs_dither_numba` and `_encode_vram_clash_optimized`) down to optimized C-level machine code, running in parallel (`prange`) across all CPU cores.
*   **OpenCV (`cv2`):** Used for fast video frame extraction, color space conversions (BGR to RGB, Grayscale), frame resizing (Lanczos interpolation), and Haar Cascade facial recognition.
*   **NumPy:** The backbone for all array manipulations, matrix math, and data structuring before feeding into Numba or KMeans.
*   **FFmpeg (Subprocess):** Used as a reliable backend engine to extract synced MP3 audio, PCM audio for FFT analysis, and optionally perform GPU-accelerated (NVENC) video pre-scaling.
*   **Taichi (GPU/CUDA):** *(Used in experimental/sister branches)* A parallel programming language used to push palette extraction and block analysis entirely to the GPU, evaluating millions of color combinations via Compute Shaders.

---

## 6. Update Log

### Update 1: The Root Cause of Palette "Flashing" (MiniBatchKMeans)
*   **The Issue:** Even after disabling pixel sampling (processing 100% of the image) and implementing temporal stabilization (`init=prev_centroids`), the output MV2 still exhibited severe color flashing and jitter.
*   **Diagnostic Discovery:** The flaw was traced to the algorithm itself: `MiniBatchKMeans`. Because it processes the image in small, random chunks (batches), it is inherently unable to maintain strict index order across frames. Even with the perfect starting point from the previous frame, the batch updates caused the 16 centroids to "drift" and swap indices. A jitter test showed `MiniBatchKMeans` had an index variation score of ~65.0, compared to `1.8` for standard `KMeans`.
*   **The Fix:** We completely replaced `MiniBatchKMeans` with the standard `sklearn.cluster.KMeans`. 
*   **Result:** The palette jitter dropped from extreme spikes (15.0 - 29.0) down to exactly **0.0** for long stretches of static scenes. The temporal stabilization now correctly "locks" the color indices in place, resulting in rock-solid MSX2 video playback.

### Update 2: The "Array Shrinkage" Index Shifting Bug
*   **The Issue:** During testing on legacy branches, severe flashing persisted even with standard KMeans and temporal stabilization active.
*   **Diagnostic Discovery:** The flashing was not caused by KMeans, but by post-processing filters designed to "clean up" the palette (e.g., removing pure black colors so the hardware's fixed Index 0 black could be used, or deleting colors too close to the UI gray). 
    *   If a palette array of 16 colors `[A, B, C, Black, D, E...]` passed through a filter that deleted `Black`, the array became `[A, B, C, D, E...]`.
    *   This meant color `D` shifted from Index 4 to Index 3. 
    *   Even though the *colors* were stable, their *indices* flipped. Because the MSX2 VRAM maps pixels to indices (not RGB values), every pixel using Index 4 suddenly changed from `D` to `E`, causing a massive visual flash.
*   **The Fix:** When temporal stabilization is active (`is_temporally_locked = True`), **all array sorting and filtering/deletion steps must be bypassed**. The exact length and order of the array returned by KMeans must be preserved at all costs to maintain the index mapping. If a color needs to be replaced, it must be overwritten in-place, never deleted.
