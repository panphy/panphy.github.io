# Spellwave 2 UI Refinements & Victory Theme Optimization

## Goal Description
Implement the user's requests to:
1. Add tooltips/titles to interactive buttons and HUD readouts.
2. Remove the "Skip Intro" button from the ending cinematic.
3. Enhance the perspective angle of the victory crawl to make it mimic the Star Wars opening crawl.
4. Style the ending scene's text with a pixel art theme (using Press Start 2P font, optimized sizing, and styling).

## Proposed Changes

### UI & Tooltips

#### [MODIFY] [spellwave2.html](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy Labs/GitHub/panphy.github.io/beta/spellwave2.html)
- Add static `title="..."` attributes to:
  - Brand logo link in header
  - Audio toggle button
  - Pause button
  - HUD readout blocks (`Score`, `Best`, `Life`, `Wave`)
- Remove the `<button class="ending-skip-button" id="endingSkipButton" ...>Skip Intro</button>` element.

#### [MODIFY] [potions.js](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy Labs/GitHub/panphy.github.io/beta/spellwave2/src/potions.js)
- Update `updatePotionUI()` to set the `title` attribute of each potion slot dynamically (e.g. `Use Time Freeze Potion` vs `Empty Slot`).

#### [MODIFY] [main.js](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy Labs/GitHub/panphy.github.io/beta/spellwave2/src/main.js)
- Update `applyBatterySaver()` to dynamically update `batterySaverButton.title` and `aria-label` to reflect the active state.
- Remove references to `#endingSkipButton` and the `skipEndingCinematic()` function.

---

### Ending Crawl & Pixel Art Theme

#### [MODIFY] [styles.css](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy Labs/GitHub/panphy.github.io/beta/spellwave2/src/styles.css)
- **Crawl Perspective & Angle**:
  - Decrease `.ending-crawl-container` perspective from `380px` to `280px` for a stronger 3D perspective effect.
  - Tilt `.ending-crawl-content` further back by changing `rotateX(26deg)` to `rotateX(62deg)`.
  - Update `@keyframes crawl-animation` to maintain `rotateX(62deg)` during the translation.
- **Pixel Art Text Styling**:
  - Update the `font-family` of all ending scene text elements to `var(--font-pixel)` (`'Press Start 2P'`).
  - Scale down the `font-size` and optimize `line-height` for:
    - `.ending-intro-text`
    - `.ending-logo`
    - `.ending-crawl-content` (episode, title, body paragraphs)
    - `.ending-kicker`
    - `.ending-title`
    - `.ending-subtitle`
    - `.stat-label`
    - `.stat-value`
    - `.ending-stat-grade .stat-value`
    - `.ending-run-summary`
    - `.ending-replay` (button)
  - Change `.ending-crawl-content` text alignment from `justify` to `center` for better readability with the monospaced pixel font.

---

## Verification Plan

### Manual Verification
- Test in browser via `http://localhost:9090/beta/spellwave2.html`.
- Hover over buttons and readouts to verify tooltips/titles show up.
- Use a cheat code or complete Wave 10 to trigger the ending sequence:
  - Verify that the "Skip Intro" button is completely gone.
  - Verify the crawl angle looks exactly like Star Wars (steep tilt back).
  - Verify that all victory text is rendered in the pixel art font and does not overflow on desktop or mobile viewports.
