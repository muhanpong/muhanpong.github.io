# WASM Preview Update Memo

This file contains the code modifications intended for supporting separate 'VRAM Packed' and 'Raw Dithered' previews once the WASM module is updated to provide `get_last_packed_frame()`.

## worker.js Changes
```javascript
else if (type === 'ENCODE_FRAME') {
    const { rgbaBytes, origW, origH, mp3Chunk, pcmSlice, frameIdx } = payload;

    // Execute WASM operation
    encoder.add_frame(rgbaBytes, origW, origH, 4, mp3Chunk, pcmSlice);            
    
    // Extract raw dithered frame
    const ditheredRGB = new Uint8Array(encoder.get_last_dithered_frame());
    
    // Anticipated method for post-packing frame
    let packedRGB = null;
    if (typeof encoder.get_last_packed_frame === 'function') {
        packedRGB = new Uint8Array(encoder.get_last_packed_frame());
    }
    
    // Send to main thread
    self.postMessage({ 
        type: 'FRAME_DONE', 
        payload: { frameIdx, ditheredRGB, packedRGB } 
    });
} 
```

## encoder.html Changes (Main Loop)
```javascript
worker.onmessage = (e) => {
    if (e.data.type === 'FRAME_DONE') {
        const { ditheredRGB, packedRGB } = e.data.payload;
        
        // --- Tri-State Rendering Logic ---
        const split1 = Math.floor(256 * monitorLeftSplit);
        const split2 = Math.floor(256 * monitorRightSplit);
        
        // Helper to render RGB buffer to a temp canvas
        const renderToTemp = (buffer, id) => {
            if (!window[id]) {
                window[id] = document.createElement('canvas');
                window[id].width = 256; window[id].height = 192;
            }
            const tCtx = window[id].getContext('2d');
            const tImg = tCtx.createImageData(256, 192);
            for (let i = 0, j = 0; i < buffer.length; i += 3, j += 4) {
                tImg.data[j] = buffer[i]; tImg.data[j+1] = buffer[i+1];
                tImg.data[j+2] = buffer[i+2]; tImg.data[j+3] = 255;
            }
            tCtx.putImageData(tImg, 0, 0);
            return window[id];
        };

        const canvasDithered = renderToTemp(ditheredRGB, 'monitorTempDithered');
        const canvasPacked = packedRGB ? renderToTemp(packedRGB, 'monitorTempPacked') : canvasDithered;

        // Compose on the main preview canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Region 1: Source (Left)
        if (split1 > 0) {
            ctx.save();
            ctx.beginPath(); ctx.rect(0, 0, split1, 192); ctx.clip();
            ctx.drawImage(video, 0, 0, 256, 192); 
            ctx.restore();
        }

        // Region 2: VRAM Packed (Middle)
        if (split2 > split1) {
            ctx.save();
            ctx.beginPath(); ctx.rect(split1, 0, split2 - split1, 192); ctx.clip();
            ctx.drawImage(canvasPacked, 0, 0);
            ctx.restore();
        }

        // Region 3: Raw Dithered (Right)
        if (split2 < 256) {
            ctx.save();
            ctx.beginPath(); ctx.rect(split2, 0, 256 - split2, 192); ctx.clip();
            ctx.drawImage(canvasDithered, 0, 0);
            ctx.restore();
        }

        // Divider lines...
        // ... (same as in current code)
        
        resolve();
    }
};
```
