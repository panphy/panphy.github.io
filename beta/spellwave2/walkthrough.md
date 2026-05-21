# Walkthrough - Phase 2: Mimic Chest Enemy for Spellwave2

I have completed the implementation of Phase 2, introducing the **Mimic Chest Enemy** to `beta/spellwave2`.

## Features Implemented

### 1. Sound Synthesis (`audio.js`)
- **`playChestOpenSound()`**: Simulates a wooden creaking lid opening, synthesized using rapid, short sawtooth bursts followed by an ascending sine wave chime.
- **`playChestClackSound()`**: Simulates a dry wooden snap/shutting clasp, synthesized using a bandpass-filtered noise burst combined with a decaying low triangle tone.

### 2. Spawning Rules & Staggered Scheduler
- Mimics spawn exclusively during normal wave phases (never during boss waves) and do not count toward the wave's required kill threshold.
- Spawning slots are staggered dynamically relative to Medics (`chooseMimicSpawnSlots`), avoiding simultaneous spawns.
- Added a floating banner notification (`"MIMIC CHEST DETECTED!"`) on first encounter.

### 3. Voxel Chest Model & Lid Animations
- **3D Chest Model**: Consists of a dark hollow interior, glowing magenta/purple eyes, white upper/lower fangs, gold corners/trims, and a red interior `PointLight`.
- **Hinged Lid**: The lid is grouped under `lidGroup` and hinged at the upper-back corner (`y = 0.56, z = -0.45`).
- **Interactive Open/Close**:
  - When target-focused (actively being typed), the lid interpolates open (`lidOpenProgress` goes to `1.0`), raising the internal PointLight intensity and triggering `playChestOpenSound()`.
  - When focus is lost or the enemy escapes, the lid snaps shut (`lidOpenProgress` goes to `0.0`), triggering `playChestClackSound()`.

### 4. Defeat & Potion Loot Reward
- Defeating a Mimic chest (either by direct typing or chain lightning bursts) calls `awardMimicLoot()`:
  - Selects a random potion type (`Time Freeze`, `Chain Lightning`, or `Shield`) and adds it to the player inventory.
  - Floats a custom text popup (e.g. `"+1 TIME FREEZE"` in magenta/purple) and plays the collection chime.
  - If the player's inventory is full, it floats `"INVENTORY FULL"`, plays a error sound, and shakes the potion bar.
  - Mimic defeats are **neutral**: they do not award score, heal the player, increment normal kill counts, or break the typing streak.

### 5. Escape/Leak Behavior
- If a Mimic reaches the castle wall, it escapes cleanly:
  - Plays the wooden clacking sound (`playChestClackSound`).
  - Floats a `"LOOT ESCAPED"` text popup at the boundary.
  - Breaks into wood debris and disappears without damaging player health or resetting the streak/multiplier.

---

## Files Modified

- [audio.js](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/audio.js): Added and exported synthesized chest audio hooks.
- [styles.css](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/styles.css): Added styling for mimic labels, loot reward, inventory full, and loot escaped popups.
- [main.js](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/main.js): Wired mimic state, voxel model, lid animation, spawning, reward/escape pipelines, and chain-burst integration.
- [todo.md](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/todo.md): Updated checklist items to reflect Phase 2 completion.

---

## How to Test Locally

1. Navigate to: [http://localhost:8002/beta/spellwave2.html](http://localhost:8002/beta/spellwave2.html)
2. Press **Start** to begin playing.
3. Play normal waves and watch for the `"MIMIC CHEST DETECTED!"` banner and fast-approaching chests with purple labels.
4. **Test Interactive Animation**: Type the first letters of a Mimic's prompt. Verify the lid creaks open smoothly, revealing glowing eyes and teeth. Delete or switch targets, and verify the lid clacks shut.
5. **Test Defeat**: Defeat a Mimic chest.
   - If you have an empty slot: verify it drops a potion, plays the chime, and floats `"+1 [POTION]"` in the lower right.
   - If your inventory is full: verify it floats `"INVENTORY FULL"` and shakes the inventory grid.
6. **Test Escape**: Allow a Mimic chest to reach the wall boundary. Verify that:
   - It clacks shut.
   - A `"LOOT ESCAPED"` popup displays.
   - You take zero damage and your typing streak/multiplier remains intact.
7. **Test Chain Lightning Burst**: Defeat a Mimic chest as part of a chain lightning sequence. Verify that it bursts into debris with spark impacts, awards potion loot correctly, and cleanup is handled cleanly.
