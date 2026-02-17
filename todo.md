# TODO: Motion Tracker Automatic Tracking (Future)

## Scope
- Add automatic object tracking to `tools/motion_tracker.html`.
- Start tracking only after the user marks the object on a frame.
- Keep existing manual tracking available as the default workflow.
- Do not change data model used by plotting/export: keep `frameData` entries as `{ x, y, playbackTime }`.

## Project Constraints
- Keep the page self-contained (single HTML entry, vanilla JS, no build system).
- Preserve offline-first behavior.
- If a new dependency/CDN is added later, update `sw.js` `ASSETS_TO_CACHE` with exact URL(s).
- When modifying any cached asset (including `tools/motion_tracker.html` or `sw.js`), bump `BUILD_ID` in `sw.js`.

## Phase 1: UX and State
- [ ] Add auto-track controls:
- [ ] `Start Auto Track`
- [ ] `Stop`
- [ ] `Track to End` toggle
- [ ] `Track every N frames` option
- [ ] Add tracker state machine: `idle`, `tracking`, `lost`, `stopped`.
- [ ] Add status message area updates (tracking, lost, completed, cancelled).
- [ ] Ensure auto-track controls are disabled during calibration/origin interactions.

## Phase 2: Seed and Tracking Core
- [ ] Use the first user click as seed point for auto-track mode.
- [ ] Capture a template patch around seed point (configurable size).
- [ ] Implement local-window matching on next frame (template matching, no external library first).
- [ ] Save accepted matches directly into `frameData` with current `playbackTime`.
- [ ] Reuse existing frame stepping timing to keep deterministic sampling.

## Phase 3: Confidence and Recovery
- [ ] Add confidence score for each match.
- [ ] Add threshold to reject uncertain matches.
- [ ] On low confidence, switch state to `lost` and pause auto-track.
- [ ] Provide `Re-mark object to continue` flow without clearing existing points.
- [ ] Optional: allow one-step undo for last auto-added point.

## Phase 4: Data and Plot Compatibility
- [ ] Verify position plots continue working without changes.
- [ ] Verify velocity plotting remains stable with dense auto-generated points.
- [ ] Confirm CSV export uses auto-track points identically to manual points.
- [ ] Confirm FPS/special-recording logic still recalculates analysis time correctly.

## Phase 5: Performance and Mobile
- [ ] Add safe defaults for low-end devices (smaller search radius, optional downsample).
- [ ] Add hard caps to avoid long main-thread blocking on large videos.
- [ ] Ensure controls remain responsive during tracking loop.
- [ ] Confirm touch behavior is not regressed.

## Phase 6: QA and Release
- [ ] Test videos:
- [ ] High contrast object, stable camera
- [ ] Fast-moving object
- [ ] Partial occlusion
- [ ] Motion blur
- [ ] Slow-motion playback with different capture FPS
- [ ] Verify manual-only workflow remains unchanged.
- [ ] Verify offline behavior after service worker refresh.
- [ ] Update in-app usage message with brief instructions for auto-track.

## Tradeoffs to Decide Before Implementation
- [ ] Algorithm choice:
- [ ] Pure canvas template matching: lighter and simpler, less robust under scale/rotation/occlusion.
- [ ] OpenCV.js trackers: more robust options, higher payload/CPU/integration complexity.
- [ ] Accuracy vs speed:
- [ ] Larger template/search windows improve robustness but cost more CPU.
- [ ] Smaller windows are faster but lose track more easily.
- [ ] Sampling density:
- [ ] Every-frame tracking gives smooth position curves but can amplify velocity noise.
- [ ] Tracking every N frames reduces load/noise but lowers temporal resolution.
- [ ] Recovery strategy:
- [ ] Strict confidence threshold reduces false positives but increases pauses.
- [ ] Lenient threshold tracks longer but risks drift.

## Suggested Initial Defaults (Phase 1 Target)
- [ ] Template size: 21x21 px
- [ ] Search radius: 25 px
- [ ] Confidence threshold: 0.70
- [ ] Track every N frames: 1
- [ ] Auto-stop on 5 consecutive low-confidence frames

## Acceptance Criteria (MVP)
- [ ] User can click once and auto-track at least 100 frames on a clear, high-contrast target.
- [ ] Tracking can be stopped/resumed without data loss.
- [ ] Lost-tracking state is clearly indicated and recoverable by re-marking.
- [ ] Existing calibration, origin, plotting, and export features still work.
- [ ] No regressions to manual point-by-point workflow.
