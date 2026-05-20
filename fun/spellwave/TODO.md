# Spellwave Roguelike Expansion - TODO

## Implementation Order
Core mechanics first: **Potion System → Mimic Chest → UI → VFX**

---

## 1. Potion System

### Current status
- Phase 1 is implemented and being tested in `beta/spellwave2`.
- Debug testing shortcut: press `P` during a run to add a random potion to the first free slot.
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
- [x] **Time Freeze**: pauses enemy movement, spawn timers, boss projectiles in flight, and boss attack cooldown for 5 seconds
- [x] **Chain Lightning**: after the next typed defeat, chains to 4 nearest targetable enemies using neutral defeat/cleanup
- [x] **Shield**: absorbs the next 2 damage hits (leaked enemies and boss projectiles both count)
- [ ] Balance pass: tune Time Freeze duration, Chain Lightning target count/range, and Shield charges after mimic drops are playable

---

## 2. Mimic Chest Enemy

### Next implementation target
Build this in `beta/spellwave2` before adding more potion polish. The goal is to replace the temporary `P` debug shortcut as the real potion source while keeping `P` available for internal testing until the mechanic feels stable.

- [ ] New enemy type: reward target only, never a damage threat
- [ ] Spawn rule: rare normal-wave only; excluded from boss waves; does not count toward required kill total
- [ ] Behavior: mirrors Medic archetype — fast approach, short timer, escapes if not defeated in time
- [ ] On defeat: drop one random potion if a slot is free; show "INVENTORY FULL" feedback if not
- [ ] On escape: remove without damaging the player; play missed-loot feedback
- [ ] 3D animation: lid opens when targeted, snaps shut on escape (Dragon Quest style)
- [ ] SFX: chest clack/snap sound

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

1. Implement Mimic Chest spawning in normal waves only.
2. Give mimic its reward-only defeat/escape paths and wire defeat to `addPotion()`.
3. Add inventory-full and missed-loot feedback.
4. Playtest potion economy: spawn rate, potion distribution, and whether `P` should remain debug-only behind a dev flag.
5. Run a focused balance pass on potion durations/counts once mimic drops are working.

---

## 6. Backlog / Brainstorm

- Gold Mimics: rare variant dropping rare potions or multi-charge relics
- Potion synergies: e.g. Chain Lightning during Time Freeze increases its range
- Typing Combo Meter: 50-word streak awards a random potion
- Cursed Potions: big benefit with a trade-off (e.g. Speed Potion — enemies move 2x speed for 5s)
- Boss Potions: drop only from boss defeats
