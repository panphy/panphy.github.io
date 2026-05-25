# Spellwave Roguelike Expansion - TODO

## Implementation Order
Core mechanics first: **Potion System → Mimic Chest → UI → VFX → Campaign Setup & Progression**

---

## 1. Potion System
- [x] Potion inventory: 4 slots, mapped to arrow keys (Left=1, Up=2, Right=3, Down=4)
- [x] Activation only when slot is occupied and game is actively running
- [x] Arrow-key activation must not bleed into the typing buffer
- [x] Chain Lightning chained defeats award normal score, streak, and glossary credit
- [x] Chain Lightning activates as a primed buff, then triggers after the next typed defeat

### Potion Types
- [x] **Time Freeze**: pauses enemy movement, spawn timers, boss projectiles in flight, and boss attack cooldown for 3.5 seconds
- [x] **Chain Lightning**: after the next typed defeat, chains to 1 nearest targetable enemy (max 2 targets total; normal enemies/medics/mimics are defeated, while bosses are stunned for 3.0s)
- [x] **Shockwave**: pushes all enemies back by 15 units, stuns them for 1.5s
- [x] Balance pass: tune Time Freeze duration, Chain Lightning target count/range, and Shockwave visuals/behavior

---

## 2. Mimic Chest Enemy
- [x] New enemy type: reward target only, never a damage threat
- [x] Spawn rule: rare normal-wave only; excluded from boss waves; does not count toward required kill total
- [x] Behavior: mirrors Medic archetype — fast approach, short timer, escapes if not defeated in time
- [x] On defeat: drop one random potion if a slot is free; show "INVENTORY FULL" feedback if not
- [x] On escape: remove without damaging the player; play missed-loot feedback
- [x] 3D animation: lid opens when targeted, snaps shut on escape (Dragon Quest style)
- [x] SFX: chest clack/snap sound
- [x] Adjust Mimic frequencies: Wave 1: 1 Mimic; Waves 2–5: 2 Mimics; Waves 6+: 3 Mimics.

---

## 3. UI
- [x] Potion Bar: 4-slot bar at top center; shifts below the title banner while paused/idle
- [x] Each slot shows: arrow-key label, empty state, occupied potion icon
- [x] Unique icon per potion type (Time Freeze, Chain Lightning, Shockwave)
- [x] Collection feedback: potion animates from chest to inventory slot
- [x] Activation feedback: flash/animation on the used slot
- [x] Blocked feedback: distinct state when inventory is full
- [x] Primed Chain Lightning feedback: visual glowing indicator on slot and input panel

---

## 4. VFX & Polish
- [x] Time Freeze: screen desaturation + blueish tint
- [x] Chain Lightning: electric bolts jumping between chained enemies
- [x] Shockwave: semi-cylindrical 3D wave mesh traveling down the lane pushing back enemies
- [x] All activations: particle burst + screen shake
- [x] Upgrade Chain Lightning VFX timing: make bolt order and target impacts easier to read
- [x] Add collection/escape feedback for mimic chest: loot trail, inventory-full pulse, and missed-loot cue

---

## 6. Wave 10 Finale (NEW — review implementation_plan.md before starting)

> Core finale implementation is complete in beta. Remaining work is playtest tuning only.

### 6a. Boss Roster Expansion
- [x] Add 6 new boss types to `BOSS_TYPES` in `main.js`: Glacial Titan, Magma Sovereign, Void Specter, Celestial Arbiter, Phantom Rift, Stellar Dreadnought.
- [x] Update `chooseBossType()` for waves 1–9: shuffle all 10 type indices at wave start, pick first 3 without repeating a type within a wave.
- [x] For wave 10: Fisher-Yates shuffle all 10 type indices into `finalWaveBossOrder` at wave 10 start; `chooseBossType` returns `BOSS_TYPES[finalWaveBossOrder[bossesSpawned]]`.

### 6b. Wave 10 Structure
- [x] Add `isFinalWave()` helper (`waveSet === 10`).
- [x] Add `FINAL_WAVE_BOSS_COUNT = 10` constant.
- [x] In the wave start logic, skip the normal phase when `isFinalWave()` is true — call `startFinalWave()` directly.
- [x] Implement `startFinalWave()`: sets `wavePhase = 'boss'`, `bossesSpawned = 0`, `bossesDefeated = 0`, shows FINAL WAVE banner, triggers space background, starts music.
- [x] Update the boss-phase spawn loop to use `FINAL_WAVE_BOSS_COUNT` instead of `BOSSES_PER_WAVE` when `isFinalWave()`.
- [x] Build the wave 10 spawn queue at wave start: 10 boss entries + 3 mimic entries + 2 medic entries, Fisher-Yates shuffled, with first slot forced to be a boss.
- [x] Drive the boss-phase spawn loop from the queue; pause the spawn timer when a support enemy is active and resume after it escapes or is defeated.
- [x] On wave 10 all-bosses-defeated: call `startEndingSequence()` instead of `advanceWaveSet()`.

### 6c. FINAL WAVE! Banner
- [x] Add CSS `.boss-banner.is-final-wave` variant in `styles.css`: large font (~5–6rem, viewport-clamped), gradient animated text, multi-layer glow shadow, slam-in scale entrance, screen-shake keyframe.
- [x] Call `showBanner('FINAL WAVE!', 'final-wave')` in `startFinalWave()`.

### 6d. Space Background
- [x] Add `#starfield` div to `spellwave2.html` (hidden by default, behind canvas via z-index).
- [x] Write CSS for `#starfield`: radial-gradient star pattern, `@keyframes` drift animation, deep-space background gradient.
- [x] Add/remove `final-wave-active` class on `<body>` when wave 10 starts/ends.
- [x] Change Three.js renderer clear color to near-black on wave 10 start; restore on reset.
- [x] Transition the moon-haze element to nebula-purple glow via CSS class in wave 10.
- [x] Add warp-speed ending visuals through the `#gameEnding .ending-starfield` phase classes.

### 6e. Wave 10 Music
- [x] Add dedicated `FINAL_WAVE_MUSIC` profile and `scheduleFinalWaveStep()` branch in `audio.js`.
- [x] Rework wave 10 music into an immersive interstellar track with pad chords, deep pulse, shimmer arpeggios, lead phrase, and cosmic sweeps.
- [x] Add `playVictoryFinaleSound()` for the ending-scene harmonic resolution.
- [x] Respect existing audio toggle and music gain path through `startMusicLoop()` / `stopMusicLoop()`.

### 6f. End-game Scene
- [x] Add `#gameEnding` fullscreen overlay to `spellwave2.html` (hidden by default).
- [x] Write CSS for overlay: full-screen fixed, black background, centered content, fade-in/slide-up animations for title and stats panel.
- [x] Implement `startEndingSequence()` in `main.js`: enter dedicated ending mode, trigger flash, initiate warp, fade music, reveal title and stats on a timed sequence.
- [x] Animate stat counters (score, WPM, accuracy, streak, mimics, grade) from 0 to final values.
- [x] Show "Begin Again" button after stats reveal; wire it to a full reset that removes final-wave state and starts a new run from wave 1.
- [x] Verify ending overlay fits desktop and mobile-size viewports with headless Chrome.

### 6g. Konami Code Cheat
- [x] Add a 10-slot circular cheat buffer in `main.js`, filled from `keydown` event.key values (before potion/typing handlers consume them).
- [x] On match of `['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']`: call `activateFinalWaveCheat()`.
- [x] Implement `activateFinalWaveCheat()`: preserve current health if a run is in progress; start at full health if no run is active. Clear enemies and effects, set `waveSet = 10`, call `startFinalWave()`.
- [x] Show brief cheat-activated banner.

### 6i. Ending Scene — Open Bug: Canvas Still Blank on Chrome and Brave

> **Status**: Unresolved. The canvas-based ending renders correctly in Playwright/headless Chrome but appears blank on real Chrome and Brave browsers. The RAF-deferral fix (commit `db37271`) did not resolve it.

- [ ] Diagnose why `ending-fx.js` canvas is blank on Chrome and Brave (confirmed on both).
  - Possible causes: `canvas.offsetWidth` still 0 at the time `createEndingFX` is called even after one RAF delay; `mix-blend-mode: screen` on a dark background making content invisible; CSS z-index stacking issue hiding the canvas behind another element; canvas 2D context not receiving draw calls due to a silent error.
  - Try: log `W`, `H`, and `canvas.offsetWidth` inside `resize()` on the first frame to confirm dimensions are non-zero; add a solid opaque test fill (`fillRect` red) as a smoke test; inspect element in DevTools to check canvas computed size and z-stack order.
- [ ] Fix and verify on real Chrome and Brave (not just headless).

### 6i. Ending Scene Cinematic Rework (2026-05-25)

- [x] Replace CSS-only ending with a canvas-based Star Wars victory cinematic.
- [x] Create `src/ending-fx.js`: canvas 2D engine with animated nebula (6 screen-blended radial gradient layers), 180 pre-generated background stars, particle system (embers, sparkles, burst, motes), explosion rings, and aurora band sweeps.
- [x] Replace `<div class="ending-starfield">` in `spellwave2.html` with `<canvas id="endingCanvas">`; add crawl container (`#endingCrawlContainer`), intro text, logo, and skip button elements.
- [x] Rewrite ending CSS: `.ending-canvas` layer, Star Wars perspective crawl keyframe, gold glowing crawl text (`.crawl-episode`, `.crawl-title`, `p`), grade-ceremony badge pulse animation, enhanced logo fly-away; rewire phase selectors to `phase-nebula` / `phase-title-fly` / `phase-crawl`.
- [x] Rewrite `startEndingSequence()` in `main.js` with 5-phase timed sequence: flash (0ms) → nebula + detonation FX (120ms) → titlefly sparkles (5700ms) → Star Wars crawl (9700ms) → stats screen (29700ms).
- [x] Expand `playVictoryFinaleSound()` in `audio.js` to ~15s orchestral arc: D-major 6-chord progression, shimmer breath noise filter, and bell-tail tones from 8.2–14.8s.
- [x] Fix blank ending canvas on Chrome (commit `db37271`): defer `resize()` to next RAF frame after `hidden` is removed; guard resize against 0-size; add `ctx` null check; force resize in `setPhase()` if W/H unresolved; remove duplicate RAF start at bottom of `createEndingFX`.

### 6h. Playtest Bug Fixes (2026-05-25) — see `implementation_plan.md` for full root-cause analysis

**Bug 1: Space background not working**
- [x] Cancel seasonFade and apply deep-space scene.background (`0x000008`) in `startFinalWave()`; boost starField size to 0.22 and opacity to 1.0.
- [x] Restore starField.material.size to 0.08 in `applySeasonInstant` so Play Again resets it.
- [x] Retain moon-haze nebula CSS class as ambient border glow on top of the canvas.

**Bug 2: Boss visuals need structural differentiation**
- [x] Add 7 dedicated mesh builder functions: `createSolarAnvilMesh`, `createGlacialTitanMesh`, `createMagmaSovereignMesh`, `createVoidSpecterMesh`, `createCelestialArbiterMesh`, `createPhantomRiftMesh`, `createStellarDreadnoughtMesh`.
- [x] Update `createSpecificBossMesh` dispatch to name all 10 bosses with fallback to phoenix.
- [x] All 10 bosses now have distinct silhouette archetypes (anvil+hammer, golem+ice spikes, boulder/hunch, phantom+tentacles, angel+halo, diamond+ring, fortress+guns, plus original dragon/devil/skeleton).

**Bug 3: Wave 10 music has no audible melody**
- [x] Increase `baseStep` from 0.096 to 0.138 (notes were 96ms blips, now 138ms — audible as melody).
- [x] Rewrite melody in D minor at 440–880 Hz (was 220–370 Hz, too low and overlapping bass).
- [x] Reduce `drumGain` and `bassGain`; raise `melodyGain` to 0.048 so melody sits on top.
- [x] Follow-up quality pass: replace the simple melodic boss loop with an immersive interstellar final-wave scheduler.

**Bug 4: End-game scene never appears**
- [x] Change `enemies.length === 0` check to `enemies.filter(e => !e.dying).length === 0` to exclude chain-lightning victims still awaiting setTimeout removal.
- [x] Fix WPM calculation: `endingStartTime` is game-seconds, not wall-clock — remove `Date.now()` subtraction.
- [x] Add `console.log` diagnostics at queue-exhaustion check and `startEndingSequence` entry for further playtesting.
- [x] Remove temporary diagnostics after verification.
- [x] Follow-up quality pass: redesign the ending overlay as a cinematic victory scene with tracked timers and responsive layout.

---

## 5. Phase 4: Campaign Mode & Setup Expansion (NEW)

> [!IMPORTANT]
> **Asset Constraint**: Do not use emojis anywhere in the UI (e.g. for topic selectors or subject buttons). All icons must be clean, high-performance inline SVGs, styled and animated with CSS keyframes.

### Interim Difficulty Curve Tuning
- [x] Add normal-wave typed-workload budgets so wave completion is not driven only by enemy count.
- [x] Add an active typing-pressure cap to reduce prompt pile-ups when long terms are visible.
- [x] Reduce wave speed and spawn cadence growth so word length, speed, and count do not all spike together.
- [x] Add one-keyword limiting for long boss vocabulary phrases while preserving the two-word equation-boss limiter.
- [x] Keep normal-wave typing label neutral instead of showing wave progress.
- [ ] Playtest waves 3 and 5 specifically for remaining workload spikes.
- [ ] Decide whether workload-budget progress needs a separate UI treatment outside the typing area after playtesting.

### Pre-Run Setup UI
- [ ] Add Subject selection (Physics, Chemistry [Locked], Biology [Locked]) buttons to the starting screen utilizing custom SVG icons.
- [ ] Add Curriculum Tier selection (Combined Science vs Separate Science) toggle using custom inline SVG components.

### Subject & Curriculum Data Restructuring
- [ ] Restructure `question-bank.js` under a top-level `SUBJECTS` configuration to support multi-subject expansion.
- [ ] Implement `separateOnly: true` tags on topics (e.g., Space Physics) and specific terms/equations that only appear in Separate (Triple) Science.
- [ ] Dynamically construct legacy exports `EASY_WORDS` etc. to preserve compatibility.

### Map / Topic Selection UI
- [ ] Design a glassmorphic **Topic Selector Modal** that pauses the game and renders when starting a run or between wave completions.
- [ ] Implement a node/progress map tracker UI at the top of the selector overlay showing the 5-node journey (`[Wave 1] ➔ [Wave 2] ➔ [Wave 3] ➔ [Wave 4] ➔ [Final Boss]`).
- [ ] Populate selector with 3 choice cards representing randomly selected remaining topics (filtering out `separateOnly: true` topics/words if Combined is chosen). Use custom inline SVG graphics for topic cards.
- [ ] Include rewards on choice cards:
  - [ ] Standard: heal health or gain a potion.
  - [ ] Elite modifiers: faster enemies, more mimics, double score.

### Wave Logic & Progression
- [ ] Limit campaign to 5 waves.
- [ ] Store active topic, completed topics array, and choice-reward state in the game controller.
- [ ] Retrieve word spawn pools dynamically based on the selected topic and difficulty corresponding to the wave index.
- [ ] Force the wave's equation boss to select an equation specifically from the active topic.

### Victory Ending
- [ ] Create a celebratory fullscreen **Victory Overlay** triggered upon defeating the third boss of Wave 5.
- [ ] Display GCSE Grade (1-9) computed based on accuracy, WPM, and final health.
- [ ] Render visual badge icons (using custom animated SVGs) representing the 5 chosen topics completed along the path.
- [ ] List detailed stats (Score, Time, WPM, accuracy, mimics defeated, potions used) and include a "Play Again" button.
