# Implementation Plan - Phase 2: Mimic Chest Enemy for Spellwave2

This plan outlines the design and implementation details for Phase 2, which introduces the **Mimic Chest Enemy** to `beta/spellwave2`. Mimics behave similarly to the Medic archetype: they spawn during normal wave phases, travel quickly, do not damage the player upon escaping, and reward the player with a random potion on defeat.

## User Review Required

> [!IMPORTANT]
> - All code modifications are confined to the `beta/spellwave2` subfolder. No changes are made to production files.
> - Because this tool is located in the `/beta` folder, it is excluded from the service worker pre-cache (`sw.js`). A `BUILD_ID` bump is therefore not required.

## Proposed Changes

### [Spellwave2]

#### [MODIFY] [audio.js](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/audio.js)

1. **Synthesize Mimic Chest SFX**:
   - Add `playChestClackSound()`: A wooden clasping/shutting sound synthesized via a short, high Q bandpass noise burst paired with a pitch-decaying triangle tone.
   - Add `playChestOpenSound()`: A wooden creak effect synthesized using a rapid series of three short sawtooth tone segments, followed immediately by an ascending sine wave chime.
   - Add both functions to the returned API object.

---

#### [MODIFY] [main.js](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/main.js)

1. **Import Audio Synth Hooks**:
   - Update imports from `./audio.js` to include `playChestClackSound` and `playChestOpenSound`.

2. **Define Mimic Archetype & State Variables**:
   - Declare `MIMIC_TYPE`:
     ```javascript
     const MIMIC_TYPE = {
       name: 'Mimic Chest',
       isMimic: true,
       body: 0x8b5a2b, // Brown wood
       trim: 0xd4af37, // Gold trimmings
       eye: 0xd946ef,  // Purple/magenta glow
       speed: 7.8,
       scale: 1.1,
       weight: 0,
       score: 0,
     };
     ```
   - Declare state variables: `mimicsSpawnedThisSet`, `mimicSpawnSlots`, `firstMimicHintShown`.
   - Implement `getMimicCountForWave(wave)` and `chooseMimicSpawnSlots(target, count)` (staggering slots by using fractional offsets so they do not spawn simultaneously with Medics).
   - Implement `shouldSpawnMimic()` checking against `normalEnemiesSpawned` and `mimicSpawnSlots`.

3. **Voxel Chest Mesh Assembly**:
   - Implement `createMimicChestMesh(type)`:
     - **Base Group**: Contains a wooden core block, dark interior block, shiny metal trim rings and corner blocks, glowing eyes (emissive material), lower white teeth (pointing slightly up/outward), and a red/purple PointLight inside the interior.
     - **Lid Group**: Positioned at the hinge axis (back-top corner: `y = 0.56`, `z = -0.4`). Relative to the hinge, contains a wood lid top, metal border strips, a front hanging metal lock clasp, and upper white teeth (pointing downwards).
     - Store reference to `lidGroup` and `chestGlow` in the group's `userData`.

4. **Lid Animation & Targeted Detection**:
   - In `updateEnemies()`:
     - For Mimic enemies, check if `activeTarget === enemy` and `isEnemyTargetable(enemy)`.
     - Interpolate `enemy.lidOpenProgress` towards `1.0` (open) if targeted, or `0.0` (closed) if not.
     - If progress crosses the `0.05` threshold upwards, trigger `playChestOpenSound()`. If it crosses `0.05` downwards, trigger `playChestClackSound()`.
     - Apply rotation `rotation.x = -enemy.lidOpenProgress * (Math.PI / 3)` to the lid group.
     - Adjust the chest PointLight intensity proportionally with `lidOpenProgress`.

5. **Spawning Integration**:
   - In `prepareWavePlan()`: Reset `mimicsSpawnedThisSet = 0` and compute `mimicSpawnSlots`.
   - In `spawnEnemy()` options:
     - Support `options.isMimic`. If true, pull a term from a custom theme list (e.g. `MIMIC_WORDS`), load `MIMIC_TYPE`, and set up lid properties.
     - Add CSS tags `is-mimic` for the word label and trigger banner hints.
   - In the main update loop (when `wavePhase === 'normal'`), check `shouldSpawnMimic()` and trigger `spawnEnemy({ isMimic: true })` inside the spawning sequence.

6. **Defeat & Escape Logic**:
   - Add helper `awardMimicLoot(enemy)`:
     - Attempt to add a potion via `addPotion()`.
     - If successful, play chime/collection sound and spawn `spawnLootRewardPopup(left, top, addedType)` (e.g., "+1 TIME FREEZE").
     - If full, play mistake sound and spawn `spawnInventoryFullPopup(left, top)`.
     - Log encountered term.
   - Update `defeatEnemy()` and `defeatEnemyChainBurst()`: If `enemy.isMimic`, bypass point accumulation/heals, and call `awardMimicLoot(enemy)` instead. Ensure debris and explosions still occur normally.
   - Update `leakEnemy()`: If `enemy.isMimic`, play `playChestClackSound()`, spawn `spawnLootEscapedPopup`, spawn debris, and cleanly remove without damage or streak loss.

---

### [Styles]

#### [MODIFY] [styles.css](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/styles.css)

1. **Add Mimic UI Visual Styling**:
   - Style `.word-tag.is-mimic` using a magenta/purple gradient border and shadow (to represent the magical mimic theme).
   - Style `.score-popup.is-loot-reward`, `.score-popup.is-inventory-full`, and `.score-popup.is-loot-escaped` with appropriate glow text-shadows and colors.
   - Add `.boss-banner.is-mimic-hint` color and text shadow styles.

## Verification Plan

### Automated Tests
- Validate Three.js geometry alignments and file integrity.

### Manual Verification
- **Spawning & Movement**: Verify Mimics spawn correctly, move fast, and present purple tags/hints.
- **Visual Opening/Closing**: Highlight the Mimic and confirm the lid opens smoothly to reveal glowing eyes and teeth. Un-target it and confirm it snaps shut with a clacking sound.
- **Defeat & Reward**:
  - Defeat with space in potion slots: verify it plays collection sound, gives a random potion, and floats a reward popup (e.g. `+1 CHAIN LIGHTNING`).
  - Defeat with full slots: verify it shakes the potion bar and floats `INVENTORY FULL`.
- **Escape**: Let the Mimic reach the screen boundary and verify it triggers `LOOT ESCAPED` and play chest clack without taking damage or breaking the multiplier.
