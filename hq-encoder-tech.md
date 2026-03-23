# Architectural Analysis: `encoder.html` (Fast) vs. `hq_encoder.html` (Pre-expand)

This document provides a detailed comparative analysis between the highly optimized `encoder.html` and the alternative `hq_encoder.html` implementation. 

The fundamental difference lies in **where the spatial downscaling occurs** (shrinking a large 1080p/4K video down to the MSX 256x192 resolution).

*   **`encoder.html` ("Downscale First"):** Forces the browser's GPU to crop, pad, *and* downscale the image simultaneously before extracting the pixels.
*   **`hq_encoder.html` ("Pre-expand"):** Uses the browser to crop and pad the image at its *original high resolution*, and then sends that massive high-res frame to the WASM (Rust) module, forcing the CPU to perform the downscaling in software.

---

## 📊 Detailed Comparison Matrix

| Metric | `encoder.html` (Optimized Canvas) | `hq_encoder.html` (Pre-expand) | Impact / Difference |
| :--- | :--- | :--- | :--- |
| **Downscaling Engine** | Browser Native C++ / GPU (via `drawImage`) | WebAssembly / Rust CPU (Software interpolation) | Native GPU scaling is exponentially faster and often uses superior filtering algorithms (Lanczos). |
| **Payload Size**<br>(Per Frame) | **Fixed 196 KB**<br>($256 \times 192 \times 4$ bytes) | **Massive & Variable**<br>e.g., ~6.2 MB for a 1440x1080 crop, or ~8.8 MB for a padded 1080p frame. | `hq_encoder` pushes up to **45x more data** across the thread boundary, severely bottlenecking IPC (Inter-Process Communication). |
| **Efficiency & GC**<br>(Garbage Collection) | **High Efficiency.** Allocates ~3 MB of memory per second at 15fps. | **Low Efficiency.** Allocates ~90 MB to 130 MB of large `Uint8Array` objects per second at 15fps. | `hq_encoder` will cause severe "stop-the-world" Garbage Collection thrashing, leading to UI freezes and high RAM usage. |
| **WASM Workload** | **100% Spectral.** WASM only loops over 49k pixels to perform K-Means quantization and dithering. | **Spatial + Spectral.** WASM must first loop over millions of pixels to shrink the image, *then* perform quantization. | `hq_encoder` wastes massive amounts of CPU cycles throwing away 90% of the pixels it receives before doing the actual MSX conversion. |
| **Image Pre-touch**<br>(Aspect Logic) | Canvas scales the source video directly into the $256 \times 192$ viewport using mathematical scaling offsets. | Canvas creates a giant, dynamically sized buffer (e.g., $1920 \times 1152$ for padding) to pre-arrange the layout at high-res. | `hq_encoder` creates unnecessarily large offscreen canvases, consuming extra VRAM in the browser before data extraction. |

---

## 🔬 Deep Dive Analysis

### 1. The Payload Bottleneck (`hq_encoder.html`)
In `hq_encoder.html`, the code calculates a massive bounding box based on the source video. For example, if padding a standard 1080p video (1920x1080) to a 5:3 ratio, it creates a `drawW` of 1920 and a `drawH` of 1152. 
It extracts all 2.2 million pixels (`getImageData`), serializes them into an 8.8 MB array, and posts it to the Worker. This serialization overhead alone will drastically slow down the encoding pipeline.

### 2. The "HQ" (High Quality) Theory
Why might one prefer the `hq_encoder.html` approach? 
*   **The Theory:** There is a theoretical argument that passing the raw, uncompressed, high-frequency details of the original 1080p frame into the Rust module *might* allow the K-Means color quantizer to make better global palette decisions before the image is physically shrunk down. 
*   **The Reality:** In standard video processing pipelines, color quantization and dithering happen *after* spatial downscaling. Furthermore, the browser's native `imageSmoothingQuality = 'high'` implementation (used in `encoder.html`) typically uses a Lanczos convolution filter, which is exceptional at preserving detail during downscaling. Unless the Rust WASM module implements a significantly superior and highly expensive software scaling algorithm, the visual quality difference will be negligible or even worse in the `hq_encoder` version.

### 3. Monitor Display Differences
In `hq_encoder.html`, because the offscreen canvas is giant (e.g., 1920x1152), the monitor rendering logic had to be updated to shrink it back down for the user preview:
```javascript
// hq_encoder.html must shrink the giant canvas back down to 256x192 for the UI
ctx.drawImage(offscreenCanvas, 0, 0, drawW, drawH, 0, 0, 256, 192); 
```
In contrast, `encoder.html` simply copies its already-perfect 256x192 buffer directly to the screen:
```javascript
// encoder.html simply copies the 1-to-1 buffer
ctx.drawImage(video, 0, 0, 256, 192); 
```

## 🎯 Conclusion
`encoder.html` is the definitively superior architecture for a web-based tool. By delegating spatial manipulation (scaling) to the browser's hardware-accelerated Canvas API, it keeps the thread payload tiny and allows the WebAssembly module to operate at maximum efficiency, focusing solely on the complex color math required for the MSX2 architecture. `hq_encoder.html` will suffer from severe performance and memory bottlenecks for questionable, if any, gains in visual quality.
---

## 🧐 Addendum: An Earnest Hardware Reality Check

When evaluating this architecture against modern hardware—CPUs with massive L2/L3 caches, AVX-512 vector instructions, and DDR5 memory buses pushing 60-100 GB/s—some traditional "web performance" arguments require a more honest re-evaluation.

### 1. The Myth of the "Payload Bottleneck" (IPC & Memory)
In the initial analysis, `hq_encoder.html` was heavily penalized for allocating and passing an 8MB array across the WebWorker boundary 15 times a second (approx. 120 MB/s). 

**The Honest Reality:** On a modern system, 120 MB/s of memory allocation and copying is a rounding error. A DDR5 RAM bus can transfer that entire payload in about 1 to 2 milliseconds. V8's modern concurrent Garbage Collector excels at cleaning up these short-lived objects without pausing the main thread. The 8MB transfer is not a catastrophic bottleneck for a modern CPU (like an Apple M-series or AMD Ryzen).

### 2. The True Bottleneck: The PCIe Bus and the GPU Sync Point
If modern CPUs can chew through 8MB instantly, why is the `hq_encoder.html` approach still fundamentally slower? The answer lies in the architecture of the browser's graphics pipeline and the **PCIe bus**.

Look at this line: `const frameData = offCtx.getImageData(0, 0, drawW, drawH);`

1.  **`drawImage` is Asynchronous & GPU-Accelerated:** The browser pushes cropping/padding commands to the GPU (via Metal, Vulkan, etc.).
2.  **`getImageData` is Synchronous & CPU-Bound:** This forces a massive pipeline stall. The CPU commands the GPU to stop, finish rendering, and send the raw, uncompressed pixels back across the PCIe bus to System RAM.

**This is where `hq_encoder.html` loses the battle.** Reading an 8MB (1080p) uncompressed texture from VRAM back to System RAM across the PCIe bus is notoriously one of the slowest operations in web development. 

The brilliance of `encoder.html` (Canvas Pre-resize) is that it forces the GPU to scale the image down to 256x192 *while it is still in VRAM*. When `getImageData` is called, it only drags a tiny 196KB payload across the PCIe bus.

### The Earnest Conclusion
On a modern machine, a CPU will not "choke" on an 8MB array. However, the architectural choice in `encoder.html` remains the vastly superior engineering decision. It is superior **not** because modern CPUs are too weak, but because it perfectly navigates the architectural quirks of the browser: **It minimizes expensive CPU-GPU synchronization and keeps heavy pixel lifting on the hardware designed for it.**
