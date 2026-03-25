# Fix "Send to Player" and Snapshot Features in [encoder-dev.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder-dev.html)

The "Send to Player" button in [encoder-dev.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder-dev.html) currently has no functionality attached to it, and the "Snapshot" feature is not visible during encoding and lacks the correct logic for interim saves.

## Proposed Changes

### [Component: Encoder Page]

#### [MODIFY] [encoder-dev.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder-dev.html)

- **Show/Hide Actions:** Update the start and finish sections of the encoding logic to show/hide `encoding-actions` and `final-actions` properly.
- **Implement `sendToPlayer`:** Add the `sendToPlayer` function that uses `BroadcastChannel` to send the final encoded `ArrayBuffer` to the player tab.
- **Improve Snapshot/Interim Save:** Implement the `assembleInterimMv2` function and update the `btnSnapshot` and `btnInterimSave` click handlers to use it, allowing users to save or send snapshots *while* encoding is in progress.
- **Button Handlers:** Ensure all buttons in `final-actions` and `encoding-actions` have their [onclick](file:///c:/Users/povian/git/muhanpong.github.io/index.html#2353-2354) handlers correctly assigned.

## Verification Plan

### Manual Verification
1. Open [encoder-dev.html](file:///c:/Users/povian/git/muhanpong.github.io/encoder-dev.html) in a browser and have [index.html](file:///c:/Users/povian/git/muhanpong.github.io/index.html) (the player) open in another tab.
2. Select a video file in the encoder.
3. Click "Start Encoding".
4. **Verify Snapshot:** While encoding, click "Snapshot". Check if the player tab receives and plays the interim MV2 file.
5. **Verify Interim Save:** While encoding, click "Save". Check if an interim `.mv2` file is downloaded.
6. **Verify Send to Player:** After encoding finishes, click "Send to Player". Check if the player tab receives and plays the final MV2 file and shows a "✓ Sent!" status on the button.
7. **Verify Final Save:** After encoding finishes, click "Save MV2". Check if the final `.mv2` file is downloaded.
