# Spellwave 2 Planning Notes

---

## Wave 10 Finale

> **Status**: Planning — no code changes yet. Review all sections before implementation begins.

### Overview

Wave 10 is the final wave and acts as the game's climax. It differs from all prior waves in structure, presentation, music, and resolution. The normal-wave phase is skipped entirely; the wave is a pure boss gauntlet with 10 bosses (one of each boss type), medics and mimics injected at random positions in the spawn queue, a space-themed visual environment, unique music, and a dedicated ending sequence.

Waves 1–9 remain structurally unchanged. The expanded boss roster (10 types) is used across all waves.

---

### 1. Boss Visuals — 6 New Types

Current roster has 4. Six more are added to reach 10 total. All follow the existing `BOSS_TYPES` schema (name, isBoss, isFlying, body, trim, eye, speed, scale, weight, score).

| # | Name | Style | Flying | Notes |
|---|------|-------|--------|-------|
| 5 | **Glacial Titan** | Ice-white body, pale-blue trim, pale-yellow eye | No | Slow, large |
| 6 | **Magma Sovereign** | Dark-red body, orange-lava trim, white-hot eye | No | Medium speed |
| 7 | **Void Specter** | Near-black body, electric-cyan trim, cyan eye | Yes | Fast |
| 8 | **Celestial Arbiter** | Bright-white body, gold trim, deep-blue eye | Yes | Medium-slow |
| 9 | **Phantom Rift** | Dark-teal body, magenta trim, magenta eye | Yes | Medium-fast |
| 10 | **Stellar Dreadnought** | Deep-navy body, cosmic-gold trim, white eye | No | Slow, very large (scale 1.72) |

Suggested hex values (exact shades open for adjustment during implementation):
- Glacial Titan: body `0x1a3045`, trim `0x9ee8ff`, eye `0xfff8b0`
- Magma Sovereign: body `0x3d0a00`, trim `0xff6a00`, eye `0xffffff`
- Void Specter: body `0x08060f`, trim `0x00e5ff`, eye `0x00e5ff`
- Celestial Arbiter: body `0xf0f4ff`, trim `0xffd700`, eye `0x1a3aff`
- Phantom Rift: body `0x0a2a2a`, trim `0xe040fb`, eye `0xe040fb`
- Stellar Dreadnought: body `0x050d1a`, trim `0xd4a017`, eye `0xffffff`

**Boss type selection for waves 1–9**: The current `chooseBossType(index)` formula (`(waveSet + index - 1) % 4`) will be updated to draw randomly from all 10 types within a wave, without repeating the same type for the 3 bosses in one wave.

---

### 2. Wave 10 Structure

#### No normal-wave phase

When `waveSet === 10`, the normal-wave phase is skipped. `startBossPhase()` is called immediately when the wave begins (or a new `startFinalWave()` function handles wave 10 setup). The "BOSS WAVE" banner is replaced with the FINAL WAVE banner (see Section 4).

#### 10 bosses, random order

`BOSSES_PER_WAVE` (currently `3`) remains unchanged for waves 1–9. Wave 10 uses `FINAL_WAVE_BOSS_COUNT = 10` and presents all 10 boss types in a randomly shuffled order, re-rolled each run.

`chooseBossType` in wave 10 returns `BOSS_TYPES[finalWaveBossOrder[bossesSpawned]]`, where `finalWaveBossOrder` is a Fisher-Yates shuffle of indices 0–9 generated at the start of wave 10.

#### Medic and Mimic interleave schedule

Medics and mimics currently only spawn in the normal-wave phase. Wave 10 injects 5 support enemies (3 mimics, 2 medics) into the 10-boss queue at random positions, re-rolled each run.

**Interleave construction at wave 10 start:**
1. Build a 15-slot queue: 10 boss entries + 3 mimic entries + 2 medic entries.
2. Fisher-Yates shuffle the full queue, then enforce one constraint: no support enemy appears as the very first slot (always start with a boss).
3. Spawn entries in queue order; the boss spawn timer is paused when a support enemy is active and resumes after it escapes or is defeated.

Example queue (one possible shuffle): B B M B B H B M B H B B M B B  
= 10 bosses, 3 mimics (M), 2 medics (H), fully randomised each run.

The medic heal amount and mimic loot mechanics are unchanged. Wave 10 interleaves are the only time these enemy types appear during a boss phase.

#### Word-hiding in wave 10

Wave 10 uses `waveSet >= 5`, so the already-implemented rule applies without further changes: equation bosses hide up to 3 words, vocabulary bosses hide up to 3 words.

---

### 3. Waves 1–9 Boss Type Selection

Replace the current `chooseBossType(index)` formula with per-wave random assignment:

- At wave start, shuffle all 10 boss type indices and store the first 3 as that wave's boss order.
- Within a wave, bosses appear in the shuffled order — no two bosses in the same wave share a type.
- The shuffle is re-seeded each time `advanceWaveSet()` is called, so each run's wave history is different.

---

### 4. FINAL WAVE! Banner

A new CSS variant `.is-final-wave` on the existing `#bossBanner` element. The JS call is `showBanner('FINAL WAVE!', 'final-wave')`.

Visual targets:
- Font size: approximately 3× the normal boss banner (normal is currently ~2rem; final wave ~5–6rem, clamped to viewport)
- Color: animated gradient cycling through deep red → burnt orange → cosmic white
- Text shadow: multi-layered red/orange glow
- Animation: the banner slams in with a scale-from-large entrance (rather than the normal slide), then pulses once before fading
- Screen shake: a CSS `@keyframes` shake is applied to the game wrapper simultaneously with the banner entrance
- Duration: banner stays visible ~3 seconds (longer than the normal ~1.5s boss banner)

The banner appears before any bosses spawn, on a delay matching the current `bossWarningDelay` pattern.

---

### 5. Space Background

Applied when `waveSet === 10` begins, removed when the ending sequence starts (or when the run resets).

**Implementation approach — pure CSS, no new asset files:**

1. A CSS class `final-wave-active` is added to `<body>` (or the game wrapper) when wave 10 starts.
2. A `#starfield` `<div>` (hidden by default, created once in the HTML) becomes visible and animated. It sits behind the Three.js `<canvas>` using `z-index`.
3. The starfield is a `radial-gradient`-based or pseudo-element pattern with a CSS `@keyframes` animation that drifts/scrolls the star dots upward, creating a slow forward-motion-through-space feel.
4. The `<body>` background transitions from the normal dotted pattern to a near-black/deep-navy gradient.
5. The Three.js renderer clear color is changed to near-black (e.g., `0x02040a`) when wave 10 begins and restored on wave clear/reset.
6. The moon haze element transitions to a nebula-purple glow.

No procedural canvas starfield is needed — CSS animation handles the ambient feel. If more dynamism is wanted, a second pass can add a small JS-driven parallax star layer.

---

### 6. Wave 10 Music

A new synthesized track played via Web Audio API in `audio.js`. Two exported functions: `playFinalWaveMusic()` and `stopFinalWaveMusic(fadeOutSeconds)`.

Inspired by FF5's final boss themes (Exdeath / Neo Exdeath): dark, epic, driving, with a sense of cosmic scale.

Composition approach using Web Audio API:
- **Bass foundation**: Two detuned sawtooth oscillators (~55 Hz and ~110 Hz) for a thick low drone, with slow LFO amplitude modulation
- **Rhythm pulse**: Periodic filtered noise burst every 0.5s giving a war-drum feel; gain envelope: instant attack, 0.3s decay
- **Harmonic layer**: Tri-oscillator chord stack (diminished/augmented voicing) in the 200–600 Hz range, tremolo at ~6 Hz
- **Melodic arpeggio**: Step sequencer (8-step, minor pentatonic, 160 BPM) using square waves, arpeggiating upward then dropping an octave — runs once every 2 bars
- **Tension accent**: High-pass filtered noise sweep every ~8s for cosmic effect

`stopFinalWaveMusic(2)` applies a gain ramp to silence over 2 seconds before disconnecting nodes.

The track loops. The game's normal audio system (boss throws, typing sounds, etc.) plays on top — music occupies a separate gain node chain with its own volume control, lower than SFX by default.

> **Open question**: Should the final wave music volume be adjustable by the existing audio toggle, or always on? Suggestion: respect the existing audio toggle (if audio is off, no music).

---

### 7. End-game Scene

Triggered when `bossesDefeated === 10` inside wave 10 (the same condition that normally calls `advanceWaveSet()`).

A `#gameEnding` fullscreen overlay (position fixed, initially `display: none`) takes over the screen. The Three.js animation loop is paused.

**Sequence** (approximate timings):

| t | Event |
|---|-------|
| 0s | Stellar Dreadnought death explosion (normal) |
| 0.5s | White flash covers entire screen; all remaining effects and labels dissolve |
| 1.0s | Flash fades; starfield remains; `stopFinalWaveMusic(3)` called |
| 1.5s | Starfield `animation-duration` CSS var shortens: stars become streaks (warp-speed effect, 2s) |
| 3.5s | Warp flash — brief all-white; then starfield fades to black |
| 4.5s | Title appears, fade-in: **"PHYSICS MASTERED"** in the display font with gold glow; subtle scale-in |
| 6.0s | Stats panel slides up from bottom: Score, WPM, Accuracy, Streak peak, Mimics looted — each counter animates from 0 |
| 9.0s | "Play Again" button fades in |

All rendered in HTML/CSS. No Three.js involvement after the death explosion.

The ending overlay is also dismissed cleanly if the player clicks "Play Again" — it resets all state (including removing the `final-wave-active` class and restoring the Three.js clear color).

---

### 8. Konami Code Cheat — Jump to Wave 10

Sequence: `ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a`

**Detection**:
- A standalone circular buffer of the last 10 `event.key` values from `keydown` events.
- Buffer is read-only for cheat detection; it does not interfere with the typing buffer or potion activation (those run in their own handlers).
- Arrow keys added to the cheat buffer before the potion handler consumes them.
- On match: call `activateFinalWaveCheat()`.

**`activateFinalWaveCheat()`**:
1. If a run is not in progress: start one at full health, then jump directly to wave 10 via `startFinalWave()`.
2. If a run is in progress: keep the player's current health, clear all enemies and active effects, set `waveSet = 10`, and call `startFinalWave()`.
3. Show a brief banner: `showBanner('CHEAT CODE ACTIVATED', 'mimic-hint')` (reuse existing styling).

Health is always preserved when jumping via cheat. If the run starts fresh (no prior run), the player begins wave 10 at full health.

The existing `iddqd` / `idkfa` cheat detection uses a character-trace mechanism. The Konami code uses a separate key-sequence buffer because it includes arrow keys (non-character keys) that do not appear in the typed character stream.

---

### 9. Changes to Existing Campaign Plan

The prior plan described a 5-wave campaign. Wave 10 as finale changes the scope:

- **Wave count**: Campaign extends to 10 waves. The node-path progress map (if implemented) shows 10 nodes, with wave 10 marked distinctly as the finale.
- **Victory screen**: The wave-5 victory screen described in the campaign plan is superseded by the wave-10 ending scene (Section 7). The GCSE grade computation and stat display from that plan are folded into the ending scene.
- **Topic selection**: Unchanged — players continue to pick topics between waves. Waves 6–10 draw from whatever topics remain unselected (or recycle if exhausted).

---

### 10. Open Questions for Review

1. ~~**Boss order in wave 10**~~ — **Resolved**: randomised each run (Fisher-Yates shuffle of all 10 types).
2. ~~**Medic/mimic frequency**~~ — **Resolved**: 3 mimics + 2 medics, positions randomised within the 15-slot queue, first slot always a boss.
3. **Music volume**: Should the wave 10 music respect the audio toggle (recommended) or always play?
4. **Space background depth**: Pure CSS starfield is clean and low-effort. Worth adding a second JS-driven parallax layer, or is CSS sufficient?
5. **"Play Again" destination**: Does "Play Again" restart from wave 1, or return to the pre-run setup screen (for subject/curriculum selection)?
6. **Score continuity**: Wave 10 bosses each award 150 points (same as waves 1–9). Should the finale bosses award a bonus multiplier?
7. ~~**Konami code during active run**~~ — **Resolved**: health is always carried over. Fresh-start cheat begins at full health.

---

## Wave 10 Playtest Issues (2026-05-25)

Four bugs identified during first playtest via Konami cheat code. No code changes yet — document here for the next implementation pass.

---

### Bug 1: Space Background Not Visible

**Symptom**: Wave 10 starts but the background is identical to normal waves — no outer-space feel.

**Root cause (suspected)**: The `#starfield` div sits behind the Three.js `<canvas>` using `z-index: 2` and `mix-blend-mode: screen`. On a dark 3D scene the white radial-gradient dots blend additively, but the effect is too subtle to register as a real space background. The Three.js renderer clear-color change may also not be perceptible if scene geometry fills most of the viewport.

**Fix direction**:
- Use a Three.js `THREE.Points` geometry as a background star layer rendered inside the scene itself — engine-native, always visible, easiest to guarantee depth-correctness.
- Set the scene's clear color to a very deep blue-black (`0x000005`) at wave 10 start, not just a slightly dark value. Restore on reset.
- Replace the current CSS-only `#starfield` approach (which fights the canvas z-stack) with a dedicated renderer-side star field that renders before all other scene objects.
- The moon-haze nebula CSS effect remains useful as an ambient border glow; keep it as-is and layer it on top of the canvas.

---

### Bug 2: Boss Visuals Not Distinct — Color Only

**Symptom**: All 10 bosses look structurally identical; only their RGB colors differ. No distinct silhouettes or personality.

**Root cause**: The `BOSS_TYPES` schema only parameterises `body`, `trim`, `eye`, `speed`, `scale`, and `isFlying`. All bosses share the same mesh geometry and part layout. Color-only variation is indistinguishable at game resolution.

**Fix direction**:
- Investigate how boss meshes are constructed in `main.js` (look for the boss mesh-builder block).
- Extend the boss schema with structural differentiation fields (all optional, default to existing behaviour when absent):
  - `bodyShape`: `'box'` (default) | `'sphere'` | `'diamond'` | `'cylinder'` — changes the core torso geometry.
  - `hasShoulderSpikes`: boolean — adds protruding spikes on each shoulder.
  - `hasOrbitalRing`: boolean — adds a rotating ring decoration around the body.
  - `hasClaws`: boolean — replaces the standard arm stubs with claw geometry.
  - `hasWings`: boolean — adds wing-fin geometry for flying types (distinct from `isFlying`, which only changes Y-spawn height).
  - `legCount`: `0` | `2` | `4` | `6` — number of visible leg stumps beneath the body.
  - `scaleX` / `scaleZ`: independent width/depth scale multipliers to create wide vs. narrow silhouettes.
- Assign each boss a distinct archetype so the player can recognise them by silhouette alone:

  | # | Name | Archetype | Key geometry additions |
  |---|------|-----------|------------------------|
  | 1 | Iron Sentinel | Tall humanoid | (existing) |
  | 2 | Arcane Weaver | Wiry, spindly | (existing) |
  | 3 | Stone Colossus | Large blocky | (existing) |
  | 4 | Void Reaper | Flying hooded | (existing) |
  | 5 | Glacial Titan | Wide hexagonal torso | shoulder spikes, wide scaleX |
  | 6 | Magma Sovereign | Squat, heavily armoured | claws, large scaleX, no legs |
  | 7 | Void Specter | Floating shard cluster | orbital ring, no discernible body block |
  | 8 | Celestial Arbiter | Symmetrical winged form | wings + orbital ring |
  | 9 | Phantom Rift | Fragmented, offset body parts | offset scaleZ, shoulder spikes |
  | 10 | Stellar Dreadnought | Fortress-like, multi-cannon | very wide scaleX, claws, 6 legs |

- This requires extending the boss mesh builder — significant but high-value for player experience.

---

### Bug 3: Wave 10 Music Has No Melody

**Symptom**: Music sounds like unstructured drumming with no recognisable melody or dramatic tension.

**Root cause (suspected)**: The `FINAL_WAVE_MUSIC` constant defines a 32-step melody array but either: (a) `melodyGain` (`0.036`) is too low relative to drum and bass gains, or (b) the sawtooth oscillator at the melody frequencies is producing mostly sub-harmonic content that muddies the mix. The result is percussion-dominant with the melody inaudible.

**Fix direction**:
- Redesign the music profile entirely. Reference: `BOSS_MUSIC` reportedly works — diff the two profiles to isolate the parameter causing the melody failure before redesigning.
- Use `triangle` or `sine` oscillator type for the melody voice (instead of `sawtooth`) — triangle has strong fundamental, cuts through cleanly.
- Raise `melodyGain` substantially — start testing from `0.18` upward.
- Use a shorter, obviously tuneful phrase: 8 or 16 steps with a clear minor key hook. A simple 8-note descending-then-ascending motif in D minor is sufficient to sound epic.
- Keep the rhythm pulse (filtered noise burst) for intensity, but reduce drum/bass gain relative to melody so the melody sits on top.
- Target feel: dark, propulsive, with a clear repeating melodic hook — FF5 Exdeath / Final Fantasy boss-battle energy. Not ambient — active.

---

### Bug 4: End-game Scene Never Appears

**Symptom**: All 10 wave-10 bosses are defeated but the ending overlay (`#gameEnding`) never shows. The game appears to hang or returns to idle state without the ending sequence.

**Root cause (suspected)** — three candidates:
1. The wave-10 completion condition (`finalWaveQueueIndex >= finalWaveQueue.length && enemies.length === 0`) in the boss-phase spawn loop is never evaluated as true — possibly because the `waveClearDelayTimer` path that calls `startEndingSequence()` is not reached.
2. `endingStartTime` is assigned as `endingStartTime = elapsed` (the running game timer), but `startEndingSequence()` uses `Date.now() - endingStartTime` expecting a wall-clock timestamp. If `elapsed` is a frame-counter float rather than a Unix timestamp, the WPM calculation produces `NaN` and the function may silently abort.
3. The `gameEnding` DOM reference may be `null` at the time `startEndingSequence()` runs — check whether `document.getElementById('gameEnding')` resolves before or after the module fully initialises.

**Fix direction**:
- Add temporary `console.log` calls at: (a) the queue-exhaustion check, (b) the `enemies.length === 0` guard, and (c) the entry point of `startEndingSequence()` to confirm which condition is failing.
- Audit `endingStartTime`: if it is set to `elapsed` (frame-relative), change the WPM calculation to track wall-clock start time separately (store `Date.now()` at `startGame()` and compute elapsed from that at ending time).
- Confirm the `#gameEnding` element exists in `spellwave2.html` and that the DOM ref is wired up at module-load time, not lazily.
- Once the trigger is confirmed, review the phase-class animation sequence (`phase-flash` → `phase-warp` → `phase-title` → `phase-stats` → `phase-replay`) to make sure each `setTimeout` chain fires correctly.

---

## Completed Interim Difficulty Pass

The beta build now includes a first difficulty-curve correction pass in `beta/spellwave2/src/main.js`. The goal was to address the hidden workload increase where later waves were not only adding more enemies, but also requiring more typed characters per enemy as medium, hard, and boss vocabulary entered the pools.

Completed changes:

1. Normal waves now use a typed-workload budget as an additional completion condition, not only the normal enemy count target.
2. Active normal-wave spawns are gated by a visible typing-pressure cap so long unresolved prompts do not stack too aggressively on screen.
3. Wave speed and spawn-rate growth were reduced to avoid compounding enemy count, word length, speed, and spawn cadence at the same time.
4. Long boss vocabulary phrases can use a one-keyword prompt limit, while equation bosses keep the existing two-word limit.
5. Normal-wave progress is not shown in the typing area; the typing label remains a neutral input label outside boss waves.

Design intent:

- Early waves should feel close to the previous version.
- Medium/hard vocabulary should add educational complexity without multiplying total typed workload too sharply.
- Later waves should still increase pressure, but more through controlled pacing than through abrupt phrase-length jumps.

Playtest focus:

- Whether waves 3 and 5 still feel like meaningful difficulty steps without becoming workload spikes.
- Whether one-keyword long boss vocabulary prompts still feel educational enough.
- Whether the hidden workload-budget wave completion feels natural without an explicit normal-wave progress readout.
- Whether the active typing-pressure cap makes late waves feel too quiet or appropriately manageable.

# Campaign Mode & Science Subject/Curriculum Selection Design

This plan outlines the design and implementation of a 5-Wave Campaign Mode for Spellwave 2. Instead of infinite waves, the game progresses through 5 waves, each focusing on a specific GCSE science topic selected by the player via a Slay the Spire-style path interface. Before starting a run, players select their Subject (Physics, Chemistry, Biology) and Curriculum Tier (Combined vs. Separate Science). Defeating the Wave 5 boss triggers a proper ending and victory summary.

## User Review Required

> [!IMPORTANT]
> **NO EMOJIS ALLOWED**:
> Do not use emojis in the game UI (e.g., in the subject select, topic map cards, or victory badge displays). All iconography must be implemented as clean, high-performance inline SVGs, styled and animated with CSS.
>
> **Locked Subject Placeholders**:
> Chemistry and Biology buttons will be rendered as greyed-out, disabled buttons with an elegant custom lock SVG. The question banks for these will not be created in this phase, but the core engine will be structured to dynamically receive them when unlocked.
>
> **Curriculum Tagging Rules**:
> 1. In AQA GCSE, "Separate Science" (Triple) contains extra topics and terms compared to "Combined Science" (Double). E.g., the *Space Physics* topic in Physics is entirely Separate-only.
> 2. We will tag specific topics or individual words/equations with `separateOnly: true`. If "Combined Science" is selected, these topics/terms will be filtered out of the draft options and spawning pools.

## Open Questions

> [!NOTE]
> **Setup UX Transition Flow**:
> We propose a two-step state machine inside the message panel to avoid clutter:
> * **State 1 (Main Menu)**: Shows "Spellwave", high score, tutorial copy, and a `[ Play Campaign ]` button.
> * **State 2 (Setup Screen)**: Clicking Play transitions the panel text to show:
>   * **Subject grid**: Physics (Active), Chemistry (Locked), Biology (Locked) - utilizing custom inline SVGs.
>   * **Curriculum Toggle**: Combined vs Separate.
>   * **Launch Button**: `[ Begin Run ]` (which then closes the setup panel and slides in the Wave 1 Path Selection Modal).
> 
> *Does this two-step transition align with the premium feel you want, or would you prefer all selectors directly visible on the initial screen?*

## Proposed Changes

### [Spellwave2]

#### [MODIFY] [question-bank.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/question-bank.js)
1. **Restructure Data Model for Multi-Subject Support**:
   - Organize all question banks under a top-level `SUBJECTS` configuration containing keys for `physics`, `chemistry`, and `biology`.
   - Physics will contain the full topics list; Chemistry and Biology will remain empty/stubbed.
2. **Add Curriculum Tier Support**:
   - Add `separateOnly: true` tags to individual terms or equations (e.g., Space Physics vocabulary or primary/secondary transformer formulas).
   - Filter words based on chosen curriculum during wave initialization.
3. **Backward Compatibility**:
   - Maintain the exports `EASY_WORDS`, `MEDIUM_WORDS`, `HARD_WORDS`, `ALL_WORDS`, and `EQUATION_WORDS` (defaulting to Physics) so that existing game code or debug functions do not break.

#### [MODIFY] [main.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/main.js)
1. **Add Start Setup State**:
   - Track `selectedSubject` (`physics`) and `selectedCurriculum` (`combined`, `separate`).
   - Modify the start panel HTML/CSS to render Subject Buttons (Physics, Chemistry (🔒), Biology (🔒)) and a toggle for Combined Science vs Separate Science. Use SVG icons for all subjects.
   - Implement the Setup transition states (Main Menu -> Setup Screen -> Launch).
2. **Campaign State tracking**:
   - Track campaign progress variables: `activeTopic`, `completedTopics` (array), `campaignCompleted` (boolean).
   - Cap the game at `waveSet === 5`.
3. **Word Pooling Logic**:
   - Modify `currentKeywordPool()` to return words matching the `selectedSubject`, `activeTopic`, `selectedCurriculum` requirements, and the difficulty appropriate for the current wave level.
   - Modify `chooseEquationWord()` to pull from the active topic's equations.
4. **Map/Path Selection Overlay**:
   - Design and render a modal overlay between waves when the current wave is cleared.
   - Present 3 randomized remaining topics as choice cards (filtering out any `separateOnly: true` topics if Combined is selected).
   - Use custom SVG iconography for topics on cards.
   - Highlight the reward/modifiers and node progression tracker (e.g. `Wave 1 ➔ Wave 2 ➔ Wave 3 ➔ Wave 4 ➔ Wave 5 (Final Exam)`).
5. **Victory Screen**:
   - On defeating the third boss of Wave 5, transition to a beautiful victory screen instead of advancing to Wave 6.
   - Calculate and display final stats: GCSE Grade (1-9), Score, Time, WPM, Accuracy, badges for the 5 selected topics (using custom badge SVGs), and a restart button.

#### [MODIFY] [styles.css](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/styles.css)
1. **Setup Controls**:
   - Add glassmorphic segmented controls, toggle buttons, and grid layouts for selecting subject and curriculum tier in the start panel.
2. **Map Overlay & Choice Cards**:
   - Add glassmorphic styling, hover transitions, and badge styling for the topic selector screen.
3. **Victory Overlay**:
   - Add gold/glowing themes, certificate styles, and badge grids for the final graduation screen.
4. **Custom SVG Animations**:
   - Add pulse, rotate, or glow keyframe animations for setup icons, badges, and topic selectors.

## Verification Plan

### Automated Tests
- Test using `http://localhost:8000/beta/spellwave2.html`.

### Manual Verification
1. Verify Subject / Curriculum options appear at start, and selecting Combined Science hides separate-only options (like Space Physics in Physics).
2. Complete Wave 1 and verify path choice card screen opens with new options.
3. Reach Wave 5, defeat the final boss, and verify transition to the Victory screen with the correct grade and topic badges.
