# Spellwave Roguelike Expansion - TODO

## Implementation Order
Core mechanics first: **Potion System → Mimic Chest → UI → VFX**

---

## 1. Potion System

### Current status
- Phase 1 is implemented and being tested in `beta/spellwave2`.
- Follow-up fixes completed after initial Phase 1:
  - Potion bar remains visible while paused and shifts down with the HUD.
  - Wrong-letter feedback now uses the original centered typing-strip shake without horizontal jump.
  - Potion icons were restyled as small 3D glass bottles.
  - Chain Lightning is now a primed one-shot effect: activate potion, type/defeat one enemy normally, then neutral chain lightning fires.

### Mechanics (settled decisions)
- [x] Potion inventory: 4 slots, mapped to arrow keys (Left=1, Up=2, Right=3, Down=4)
- [x] Activation only when slot is occupied and game is actively running
- [x] Arrow-key activation must not bleed into the typing buffer
- [x] Potion kills are **neutral**: no score, streak, combo, or glossary credit
- [x] Chain Lightning activates as a primed buff, then triggers after the next normal typed defeat

### Potion Types
- [x] **Time Freeze**: pauses enemy movement, spawn timers, boss projectiles in flight, and boss attack cooldown for 3 seconds
- [x] **Chain Lightning**: after the next typed defeat, chains to 1 nearest targetable normal enemy (max 2 targets total, excluding bosses, medics, and mimics)
- [x] **Shockwave**: pushes all enemies back by 15 units, stuns them for 1.5s
- [x] Balance pass: tune Time Freeze duration, Chain Lightning target count/range, and Shockwave visuals/behavior

---

## 2. Mimic Chest Enemy

### Current status
- Phase 2 Mimic Chest Enemy is implemented in `beta/spellwave2`.
- [x] New enemy type: reward target only, never a damage threat
- [x] Spawn rule: rare normal-wave only; excluded from boss waves; does not count toward required kill total
- [x] Behavior: mirrors Medic archetype — fast approach, short timer, escapes if not defeated in time
- [x] On defeat: drop one random potion if a slot is free; show "INVENTORY FULL" feedback if not
- [x] On escape: remove without damaging the player; play missed-loot feedback
- [x] 3D animation: lid opens when targeted, snaps shut on escape (Dragon Quest style)
- [x] SFX: chest clack/snap sound

---

## 3. UI

- [x] Potion Bar: 4-slot bar at top center; shifts below the title banner while paused/idle
- [x] Each slot shows: arrow-key label, empty state, occupied potion icon
- [x] Unique icon per potion type (Time Freeze, Chain Lightning, Shield)
- [ ] Collection feedback: potion animates from chest to inventory slot
- [ ] Activation feedback: flash/animation on the used slot
- [ ] Blocked feedback: distinct state when inventory is full
- [ ] Primed Chain Lightning feedback: consider a persistent slot/input glow or small status readout until the next typed defeat

---

## 4. VFX & Polish
*Defer until core mechanics are playable.*

- [x] Time Freeze: screen desaturation + blueish tint
- [x] Chain Lightning: electric bolts jumping between chained enemies
- [ ] Shield: rotating geometric barrier around the wall area
- [ ] All activations: particle burst + screen shake
- [ ] Upgrade Chain Lightning VFX timing after mimic work: make bolt order and target impacts easier to read
- [ ] Add collection/escape feedback for mimic chest: loot trail, inventory-full pulse, and missed-loot cue

---

## 5. Suggested Next Steps

- [x] Implement Mimic Chest spawning in normal waves only.
- [x] Give mimic its reward-only defeat/escape paths and wire defeat to `addPotion()`.
- [x] Add inventory-full and missed-loot feedback.
- [x] Remove the temporary P debug shortcut.
- [ ] Playtest potion economy: spawn rate and potion distribution.
- [ ] Run a focused balance pass on potion durations/counts once mimic drops are working.

---

## 6. Backlog / Brainstorm

- Gold Mimics: rare variant dropping rare potions or multi-charge relics
- Potion synergies: e.g. Chain Lightning during Time Freeze increases its range
- Typing Combo Meter: 50-word streak awards a random potion
- Cursed Potions: big benefit with a trade-off (e.g. Speed Potion — enemies move 2x speed for 5s)
- Boss Potions: drop only from boss defeats
