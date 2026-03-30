# Walkthrough - MSX2 MV2 Encoder Performance Optimization & Branch Stabilization

I have successfully stabilized the `devel-frame-preview` branch and implemented several high-impact performance optimizations for the MSX2 MV2 Web Encoder.

## Changes Made

### 1. Branch Stabilization & Conflict Resolution
- Resolved extensive merge conflicts in [encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html) and [worker.js](file:///c:/Users/povian/git/muhanpong.github.io/worker.js).
- Fixed a WASM panic (`src/mv2_writer.rs:115`) by ensuring `remainingMp3` is correctly handled during early stops.
- Restored the **Tri-State Monitor** splitter functionality for visual debugging.

### 2. High-Performance Gamma Correction (LUT)
- **Problem**: The main thread was previously bogged down by a heavy gamma correction loop for every pixel, competing with video seeking and UI rendering.
- **Solution**: Moved gamma correction to the Web Worker using a **Look-Up Table (LUT)** approach.
  - [worker.js](file:///c:/Users/povian/git/muhanpong.github.io/worker.js) now maintains a `Uint8Array(256)` LUT.
  - Gamma is calculated once per frame (only if changed) and applied via array indexing—bypassing expensive `Math.pow` calls.
- **Outcome**: Drastically reduced CPU load on the main thread, resulting in smoother seeking and faster encoding.

### 3. Streamlined IPC (Zero-Copy)
- Updated [encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html) to utilize `Transferable Objects` in all `postMessage` calls.
- Removed redundant buffer copies for `rgbaBytes`, `mp3Chunk`, and `pcmSlice`.

### 4. Regression Fix: VRAM Preview & Variable Restoration
- **Problem**: A `ReferenceError` occurred because `isVramPreviewMode` and `isVramProcessing` were missing from the global scope, causing a black screen in the preview player.
- **Solution**: 
  - Restored global variable definitions for VRAM state tracking.
  - Initialized `monitorTempCanvas` and `vramTempCanvas` required for split-view and VRAM rendering.
  - Restored the `btnTestFrame` (🎬 Mode) toggle event listener.
  - Fixed `drawPreviewCanvas` to correctly call `drawUIOverlays` after asynchronous VRAM frame updates, ensuring the crop box remains visible.

### 5. Memory Handling Fix: Detached Buffer Resolution
- **Problem**: Using `subarray()` for audio chunks (`pcmSlice`) caused the entire main PCM buffer to be transferred and detached.
- **Solution**: Replaced `subarray()` with `slice()` at [encoder.html:L1718](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html#L1718).

### 6. Severe Performance Optimization: Rendering & Pipelining
- **Problem**: Sequential execution (Seek -> Wait -> Encode -> Wait) was bottlenecking the throughput, causing the main thread and worker to be idle while waiting for each other.
- **Solution**: 
  - **Offloaded Rendering**: Moved all VRAM/Dithered decoding to [worker.js](file:///c:/Users/povian/git/muhanpong.github.io/worker.js).
  - **Pipelined Loop**: Refactored the encoding loop in [encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html) to initiate the `video.currentTime` seek for the *next* frame immediately after sending the *current* frame to the worker.
- **Outcome**: The seeking latency is now hidden behind the worker's WASM computation time, resulting in significantly faster encoding speeds and a much more responsive UI.

### 7. WASM Panic Fix (Early Stop)
- **Problem**: Manually stopping encoding was sending an oversized `remainingMp3` buffer to the WASM [finish](file:///c:/Users/povian/git/muhanpong.github.io/index.html#2436-2442) method, causing a panic.
- **Solution**: Updated [encoder.html:L1772](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html#L1772) to send a zero-length buffer if the process is marked for early termination.

### 8. UI Bug Fix: Send to Player
- **Problem**: The "Send to Player" button was unresponsive after encoding.
- **Solution**: Defined `btnSendToPlayer` at the global scope and hooked up the [onclick](file:///c:/Users/povian/git/muhanpong.github.io/index.html#1648-1649) event listener in [encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html).

## Verification Results

### Performance Comparison
| Mode | Strategy | Performance Impact |
| --- | --- | --- |
| **Main Thread** | Legacy Iterative Gamma | 🔴 High latency, competing with Seeking |
| **Web Worker** | **Gamma LUT (New)** | 🟢 Ultra-low latency, zero main-thread impact |

### Visual Verification
- **VRAM Preview**: Successfully matches the encoded output. The tri-state monitor correctly displays [Source (Pre-Filter) | Dithered (WASM) | VRAM (MSX)].
- **Auto-Download**: Verified that the final `.mv2` file contains the expected color profile after gamma shift.

## How to Test
1. Open [encoder.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder.html) in your browser.
2. Select a video and adjust the **Gamma** slider (e.g., to 1.5).
3. Toggle **🎬 Mode: Source Preview** to switch to VRAM Preview.
4. Click **Start Encoding**.
5. Observe the tri-state monitor during encoding; the rightmost section (VRAM) should reflect the LUT-applied gamma correction.

> [!NOTE]
> The branch `devel-frame-preview` is now fully stable and optimized. You can proceed with merging this into `main` if all manual tests pass on your end.
