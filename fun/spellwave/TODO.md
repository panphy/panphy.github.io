# Spellwave Roguelike Expansion - TODO

## 1. Mimic Chest Enemy
- [ ] Create a new "Treasure Chest" enemy type (Mimic) that is primarily a reward target, not a normal damage threat.
- [ ] Implement rushing behavior similar to the Medic: rare, fast, short-lived, and typed for loot before it escapes.
- [ ] Decide spawn rules: rare normal-wave spawn, outside boss waves initially, with no impact on required normal enemy count.
- [ ] On defeat, drop one random potion if inventory has space; if inventory is full, show a clear "full" feedback instead of silently losing the drop.
- [ ] On escape, remove it without damaging the player and play missed-loot feedback.
- [ ] Create 3D animation/logic for the lid opening and closing (Dragon Quest style).
- [ ] Sound effect for the chest "clacking" or "snapping".

## 2. Potion System
- [ ] Implement a Potion Inventory (Max 4 slots).
- [ ] Map potion slots to arrow keys:
    - Left Arrow: Slot 1
    - Up Arrow: Slot 2
    - Right Arrow: Slot 3
    - Down Arrow: Slot 4
- [ ] Consume a potion only when its slot is occupied and the game is actively running.
- [ ] Keep arrow-key potion activation separate from the typing buffer so equation prompts and numeric input remain unaffected.
- [ ] **Potion Types**:
    - **Time Freeze**: Temporarily stop enemy movement; decide whether spawn timers and boss projectiles also freeze before implementation.
    - **Chain Lightning**: Instantly clear multiple nearby targetable enemies; use the normal defeat/cleanup path so score, streak, labels, and active target state stay consistent.
    - **Shield**: Protect against the next two damage hits, including leaked enemies and boss projectiles.
- [ ] Decide whether potion-created defeats should affect score, streak, combo, and glossary tracking.

## 3. UI Updates
- [ ] Design and implement a Potion Bar at the top center (below the title banner).
- [ ] Show four fixed slots with arrow-key indicators, empty-slot state, and occupied-slot potion icons.
- [ ] Create unique icons/visuals for each potion type (Slay the Spire style).
- [ ] Add visual feedback when a potion is collected (e.g., flying from the chest to the bar).
- [ ] Add activation feedback on the used slot and a disabled/full feedback state when needed.

## 4. Visual Effects & Polish
- [ ] **Time Freeze Effect**: Screen desaturation, clock/ice particles, or a blueish tint.
- [ ] **Chain Lightning Effect**: Electric bolts jumping between enemies.
- [ ] **Shield Effect**: A rotating geometric barrier or a pulse around the "wall" area.
- [ ] **Activation Feedback**: Particle explosions and screen shakes.

## 5. Other Ideas (To Brainstorm)
- [ ] **Mimic Rarity**: Rare "Gold Mimics" that drop rare potions or multi-charge relics.
- [ ] **Potion Synergies**: e.g., using Chain Lightning during a Time Freeze increases its range.
- [ ] **Typing Combo Meter**: Reaching a 50-word streak gives you a random potion.
- [ ] **Cursed Potions**: Give a huge benefit but have a trade-off (e.g., "Speed Potion: You type faster but enemies move 2x speed for 5s").
- [ ] **Boss Potions**: Rare potions that only drop from Bosses.
