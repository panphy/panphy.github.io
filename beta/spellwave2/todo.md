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

> Resolve all open questions in Section 10 of `implementation_plan.md` before implementation begins.

### 6a. Boss Roster Expansion
- [ ] Add 6 new boss types to `BOSS_TYPES` in `main.js`: Glacial Titan, Magma Sovereign, Void Specter, Celestial Arbiter, Phantom Rift, Stellar Dreadnought.
- [ ] Update `chooseBossType()` for waves 1–9: shuffle all 10 type indices at wave start, pick first 3 without repeating a type within a wave.
- [ ] For wave 10: Fisher-Yates shuffle all 10 type indices into `finalWaveBossOrder` at wave 10 start; `chooseBossType` returns `BOSS_TYPES[finalWaveBossOrder[bossesSpawned]]`.

### 6b. Wave 10 Structure
- [ ] Add `isFinalWave()` helper (`waveSet === 10`).
- [ ] Add `FINAL_WAVE_BOSS_COUNT = 10` constant.
- [ ] In the wave start logic, skip the normal phase when `isFinalWave()` is true — call `startFinalWave()` directly.
- [ ] Implement `startFinalWave()`: sets `wavePhase = 'boss'`, `bossesSpawned = 0`, `bossesDefeated = 0`, shows FINAL WAVE banner, triggers space background, starts music.
- [ ] Update the boss-phase spawn loop to use `FINAL_WAVE_BOSS_COUNT` instead of `BOSSES_PER_WAVE` when `isFinalWave()`.
- [ ] Build the wave 10 spawn queue at wave start: 10 boss entries + 3 mimic entries + 2 medic entries, Fisher-Yates shuffled, with first slot forced to be a boss.
- [ ] Drive the boss-phase spawn loop from the queue; pause the spawn timer when a support enemy is active and resume after it escapes or is defeated.
- [ ] On wave 10 all-bosses-defeated: call `startEndingSequence()` instead of `advanceWaveSet()`.

### 6c. FINAL WAVE! Banner
- [ ] Add CSS `.boss-banner.is-final-wave` variant in `styles.css`: large font (~5–6rem, viewport-clamped), gradient animated text, multi-layer glow shadow, slam-in scale entrance, screen-shake keyframe.
- [ ] Call `showBanner('FINAL WAVE!', 'final-wave')` in `startFinalWave()`.

### 6d. Space Background
- [ ] Add `#starfield` div to `spellwave2.html` (hidden by default, behind canvas via z-index).
- [ ] Write CSS for `#starfield`: radial-gradient star pattern, `@keyframes` drift animation, deep-space background gradient.
- [ ] Add/remove `final-wave-active` class on `<body>` when wave 10 starts/ends.
- [ ] Change Three.js renderer clear color to near-black on wave 10 start; restore on reset.
- [ ] Transition the moon-haze element to nebula-purple glow via CSS class in wave 10.
- [ ] Add warp-speed variant CSS (`#starfield.warp`): star streaks, used during the ending sequence.

### 6e. Wave 10 Music
- [ ] Add `playFinalWaveMusic()` to `audio.js`: bass drone, rhythm pulse, harmonic layer, melodic arpeggio, tension accents (see plan for Web Audio API spec).
- [ ] Add `stopFinalWaveMusic(fadeSeconds)` to `audio.js`: ramp gain to 0, then disconnect.
- [ ] Export both functions; import and wire them in `main.js`.
- [ ] Respect existing audio toggle: call `playFinalWaveMusic()` only when audio is enabled; stop if player toggles audio off mid-wave.

### 6f. End-game Scene
- [ ] Add `#gameEnding` fullscreen overlay to `spellwave2.html` (hidden by default).
- [ ] Write CSS for overlay: full-screen fixed, black background, centered content, fade-in/slide-up animations for title and stats panel.
- [ ] Implement `startEndingSequence()` in `main.js`: pause animation loop, trigger flash, initiate warp, fade music, reveal title and stats on a timed sequence.
- [ ] Animate stat counters (score, WPM, accuracy, streak, mimics) from 0 to final values.
- [ ] Show "Play Again" button after stats reveal; wire it to a full reset that removes final-wave state and returns to the start screen.

### 6g. Konami Code Cheat
- [x] Add a 10-slot circular cheat buffer in `main.js`, filled from `keydown` event.key values (before potion/typing handlers consume them).
- [x] On match of `['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']`: call `activateFinalWaveCheat()`.
- [x] Implement `activateFinalWaveCheat()`: preserve current health if a run is in progress; start at full health if no run is active. Clear enemies and effects, set `waveSet = 10`, call `startFinalWave()`.
- [x] Show brief cheat-activated banner.

### 6h. Playtest Bug Fixes (2026-05-25) — see `implementation_plan.md` for full root-cause analysis

**Bug 1: Space background not working**
- [ ] Replace CSS-only `#starfield` approach with a Three.js `THREE.Points` geometry rendered as a background star layer inside the scene (renders before all other objects, always visible regardless of canvas z-stack).
- [ ] Set scene clear color to very deep blue-black (`0x000005`) at wave 10 start; restore on reset/Play Again.
- [ ] Retain moon-haze nebula CSS class as ambient border glow on top of the canvas.

**Bug 2: Boss visuals need structural differentiation**
- [ ] Read and understand the boss mesh-builder block in `main.js`.
- [ ] Extend `BOSS_TYPES` schema with structural fields: `bodyShape` (`'box'`|`'sphere'`|`'diamond'`|`'cylinder'`), `hasShoulderSpikes`, `hasOrbitalRing`, `hasClaws`, `hasWings`, `legCount`, `scaleX`, `scaleZ`.
- [ ] Update the boss mesh-builder to consume the new schema fields and generate distinct geometry accordingly.
- [ ] Assign distinct silhouette archetypes to all 10 bosses so each is recognisable by shape alone (see `implementation_plan.md` Bug 2 table for per-boss targets).

**Bug 3: Wave 10 music has no audible melody**
- [ ] Diff `FINAL_WAVE_MUSIC` against working `BOSS_MUSIC` to identify the broken parameter.
- [ ] Redesign `FINAL_WAVE_MUSIC` from scratch: use `triangle` or `sine` for the melody oscillator, raise `melodyGain` to ≥ 0.18, use an 8–16 step clear minor-key melodic hook.
- [ ] Balance drum/bass gains down relative to melody so the melody sits audibly on top.
- [ ] Target feel: dark and propulsive with a recognisable repeating melody — epic final-boss energy, not ambient.

**Bug 4: End-game scene never appears**
- [ ] Add temporary `console.log` checkpoints at: queue-exhaustion check, `enemies.length === 0` guard, and entry of `startEndingSequence()` to identify which condition is failing.
- [ ] Audit `endingStartTime`: if set to frame-relative `elapsed`, change WPM calculation to use a wall-clock timestamp stored at `startGame()`.
- [ ] Confirm `document.getElementById('gameEnding')` resolves at module load time and the DOM reference is not null when `startEndingSequence()` runs.
- [ ] Walk the phase-class `setTimeout` chain (`phase-flash` → `phase-warp` → `phase-title` → `phase-stats` → `phase-replay`) and verify each fires after the trigger is confirmed working.

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
