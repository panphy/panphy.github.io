# Walkthrough - Interim Difficulty Curve Pass

This beta pass updates `beta/spellwave2/src/main.js` to make wave difficulty track the actual typing workload more closely. The published `/fun/spellwave` version was not changed.

## Changes Implemented

### 1. Normal-Wave Workload Budget
- Added normal-wave typed-workload budgets, starting low and increasing gradually across waves.
- Normal waves can now finish when either the normal enemy target is reached or the typed-workload budget has been spent.
- Medics and mimics contribute reduced workload cost because they are reward/support targets rather than core threats.

### 2. Active Typing-Pressure Cap
- Added an active typing-pressure limit based on currently unresolved normal-wave prompt cost.
- New normal-wave spawns pause while unresolved prompt workload is above the cap.
- This should reduce late-wave pile-ups where several long terms appear together.

### 3. Speed and Spawn Growth Tuning
- Reduced per-wave enemy speed pressure.
- Reduced spawn-delay shrinkage per wave.
- Raised the minimum spawn delay to keep later waves from compounding count, speed, and prompt length too sharply.

### 4. Long Prompt Mitigation
- Kept equation bosses on the existing two-word limiter.
- Added one-keyword limiting for long boss vocabulary phrases only.
- Normal monster vocabulary remains full-word; the mitigation only affects long boss medium/hard phrases.

### 5. Progress Readout
- Changed normal-wave progress from `spawned/target` to a percentage.
- The percentage uses whichever is further along: enemy-count progress or typed-workload-budget progress.

## Playtest Focus

1. Start at `http://localhost:8000/beta/spellwave2.html`.
2. Compare waves 1-2 against the previous feel; they should remain familiar.
3. Watch waves 3 and 5 for difficulty jumps caused by medium/hard vocabulary entering the pool.
4. Check whether long boss vocabulary prompts that ask for one key word still feel educational.
5. Check whether late waves feel tense enough after the active typing-pressure cap delays extra spawns.
6. Decide whether the percentage progress label is clear enough during normal waves.

---

# Historical Walkthrough - Phase 3 Revision: Potion Redesign (Shockwave)

I have completed the requested changes for the Phase 3 potion revision, removing the **Blaze Barrier** potion and updating **Repulsor Blast** into **Shockwave** with a powerful new visual wave effect and SFX.

## Changes Implemented

### 1. Potion Redesign & Removal
- **Removed Blaze Barrier**:
  - Deleted all fire-wall related states (`blazeBarrierTimer`, `blazeBarrierCharges`), meshes, and lights from `src/potions.js`.
  - Removed collision and projectile block checks (`checkBlazeCollision`, `checkBlazeProjectileCollision`) from `src/main.js` and `src/potions.js`.
  - Cleaned up styles, SVG templates, and audio hooks (`playBlazeIgniteSound`, `playBlazeBurnSound`).
- **Renamed to Shockwave**:
  - Renamed the potion key from `repulsor_blast` to `shockwave` across the codebase.
  - Replaced the concentric ground circles with a new SVG icon showing three expanding crescent wave crests.
  - Renamed the sound hook to `playShockwaveSound()` and updated the tone to sound like a rushing force wave.

### 2. Beautiful Traveling 3D Wave Visuals
- Created a custom 3D mesh for the Shockwave spell using a semi-cylindrical shape:
  - `THREE.CylinderGeometry(radiusTop=8, radiusBottom=8, height=3, radialSegments=16, heightSegments=1, openEnded=true, thetaStart=-Math.PI/2, thetaLength=Math.PI)`
  - Material is an electric blue, transparent, additive-blended double-sided material.
  - When the Shockwave potion is cast, the crescent wave stands vertically at the castle wall (`WALL_Z`) and travels rapidly along the Z axis towards the spawn point (`SPAWN_Z`).
  - As it sweeps forward, it expands in size and fades out to look like a realistic shockwave.

### 3. Balancing & Cheats
- The mimic loot tables and `idkfa` cheat now select from the three active potions: `['time_freeze', 'chain_lightning', 'shockwave']`.
- **Time Freeze Duration**: Tuned to `3.5` seconds (down from `5.0` seconds) to keep it as an emergency panic button requiring quick typing.
- **Chain Lightning Targeting**: Can target and chain to any targetable enemy (including Bosses, Medics, and Mimic chests). Chaining to a Boss stuns them for 3.0s instead of defeating them. Chained defeats award normal score, streak, and glossary credit, and trigger Medic healing or Mimic loot awards. Decreased the chain jump limit to `1` (max `2` targets total).
- **Shockwave Behavior**: Stuns and pushes back enemies by 15 units.
- **Mimic Spawning Frequency**: Increased spawn rates (Wave 1: `1` mimic; Waves 2–5: `2` mimics; Waves 6+: `3` mimics) with dynamic distribution across wave slots.

---

## Files Modified

- [potions.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/potions.js): Rewrote the factory system to support the new `shockwave` wave mesh and removed all fire barrier codes.
- [main.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/main.js): Updated sound imports, potion system callback parameters, enemy collision/leaking paths, rock collision paths, and loot lists.
- [audio.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/audio.js): Renamed repulsor sound to `playShockwaveSound` and removed fire barrier sound synthesizers.
- [styles.css](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/styles.css): Replaced `.magic-repulsor` with `.magic-shockwave` animations, crest styling, and banner CSS. Removed blaze barrier styles, removed the `.shockwave-dot` styling, configured a staggered cascading animation delay (`0.2s` intervals) for the three equal-arc crests, and set the resting opacity to `0.45` so that all three lines remain visibly blue while only one glows brightly at a time.

---

## How to Test Locally

1. Open `http://localhost:8000/beta/spellwave2.html`.
2. Type `idkfa` to fill your inventory.
3. Verify the **Time Freeze** potion icon displays correctly (no longer broken, animated hands rotating within an illuminated clock face).
4. Verify the **Shockwave** potion icon shows three parallel waves of equal shape and arc length, with no Wi-Fi-style dot.
5. Press `3` (or the corresponding key/click the slot) to cast **Shockwave**.
6. Verify:
   - Three distinct, glowing, semi-cylindrical wavefronts spawn consecutively at `0.0s`, `0.15s`, and `0.30s` delay offsets and travel down the Z-axis in a ripple pattern.
   - All targetable/revealed enemies are pushed back and stunned.
   - The synthesized SFX sounds like a rushing energy wave.
