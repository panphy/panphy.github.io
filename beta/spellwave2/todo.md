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

## 5. Phase 4: Campaign Mode & Setup Expansion (NEW)

> [!IMPORTANT]
> **Asset Constraint**: Do not use emojis anywhere in the UI (e.g. for topic selectors or subject buttons). All icons must be clean, high-performance inline SVGs, styled and animated with CSS keyframes.

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
