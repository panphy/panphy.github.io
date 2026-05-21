# Implementation Plan - Phase 3 Revision: Potion Redesign & Shockwave Visuals

This plan details the removal of the **Blaze Barrier** potion and the renaming/redesign of the **Repulsor Blast** potion to **Shockwave**, featuring a large semi-cylindrical 3D wave visual sweeping down the road to push enemies back.

## Proposed Changes

### [Spellwave2]

#### [MODIFY] [potions.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/potions.js)
1. **Rename Potion Type and State**:
   - Rename `repulsor_blast` to `shockwave`.
   - Remove all references to `blaze_barrier`, `blazeBarrierTimer`, `blazeBarrierCharges`, `blazeBarrierMesh`, `blazeBarrierLight`, `checkBlazeCollision`, and `checkBlazeProjectileCollision`.
2. **Update Potion SVG List**:
   - Remove `blaze_barrier` SVG template.
   - Rename SVG selector `repulsor_blast` to `shockwave`. Update its class/icon to reflect a "wave sweep" visual.
3. **Shockwave Visual (3D Semi-Cylinder Wave)**:
   - When the `shockwave` potion is activated:
     - Push back all targetable/revealed enemies by 15 units along the Z-axis (constrained to `SPAWN_Z`) and stun them for 1.5 seconds (same balance logic as before).
     - Instantiate a 3D wave mesh:
       - Geometry: `THREE.CylinderGeometry(radiusTop=8, radiusBottom=8, height=3, radialSegments=16, heightSegments=1, openEnded=true, thetaStart=-Math.PI/2, thetaLength=Math.PI)`.
       - Material: `THREE.MeshBasicMaterial` with electric blue color, `transparent=true`, `opacity=0.9`, `side=THREE.DoubleSide`, and `blending=THREE.AdditiveBlending`.
       - Rotation/Position: Face the open side of the crescent towards the spawn point (Z negative). Position it standing vertically: `(0, 1.5, WALL_Z)`.
     - Track active shockwave waves in an array: `const activeShockwaves = []`.
4. **Update `update(delta)` Loop**:
   - Move active shockwaves forward (decreasing Z) towards `SPAWN_Z` at a speed of e.g. `30.0` units/sec.
   - Fade out their opacity as they travel.
   - Dispose and remove meshes once they travel past `SPAWN_Z` or their opacity reaches 0.
   - Remove the `blazeBarrier` logic.
5. **Adjust Return API**:
   - Remove `checkBlazeCollision` and `checkBlazeProjectileCollision`.
   - Update random potion list in `addPotion` and cheat refill code to only include: `['time_freeze', 'chain_lightning', 'shockwave']`.

---

#### [MODIFY] [main.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/main.js)
1. **Remove Blaze Barrier Collisions**:
   - In `updateEnemies()`, remove the call to `potionsSystem.checkBlazeCollision(enemy)`.
   - In `updateEffects()`, remove the call to `potionsSystem.checkBlazeProjectileCollision()`.
2. **Update Audio Hooks**:
   - Keep `playRepulsorSound` or rename it to `playShockwaveSound`. Remove references to blaze barrier burn/ignite sound helpers.
3. **Update Potion Spawning / Mimic Loot**:
   - In `awardMimicLoot()`, update the types array to `['time_freeze', 'chain_lightning', 'shockwave']`.

---

#### [MODIFY] [audio.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/audio.js)
1. **Remove Blaze SFX**:
   - Remove `playBlazeIgniteSound` and `playBlazeBurnSound`.
2. **Rename Repulsor SFX**:
   - Rename `playRepulsorSound` to `playShockwaveSound`. Customize the synthesizer parameters to make it sound like a deep rushing wind/wave sweep.

---

#### [MODIFY] [styles.css](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/styles.css)
1. **Update Potion Selectors**:
   - Rename `.magic-repulsor` styling/animations to `.magic-shockwave`.
   - Remove `.magic-blaze` and all blaze barrier animations/classes.
   - Rename `.boss-banner.is-repulsor-blast` to `.boss-banner.is-shockwave`. Remove `.boss-banner.is-blaze-barrier`.

---

## Verification Plan

### Manual Verification
1. **Visual Test**: Run the game at `http://localhost:8000/beta/spellwave2.html`.
2. **Cheat Code**: Activate `idkfa`. Ensure only the three active potions (`time_freeze`, `chain_lightning`, `shockwave`) fill the bar.
3. **Shockwave Spell**: Cast the Shockwave potion.
   - Verify a beautiful glowing crescent-shaped 3D wave stands vertically and sweeps forward down the path towards the spawn point.
   - Verify that all enemies are pushed back and stunned.
   - Verify the sound synthesized for the wave sounds powerful and matches the movement.
4. **Blaze Barrier Removal**: Confirm no errors are thrown during gameplay or boss battles where rocks hit the player or enemies reach the wall.
