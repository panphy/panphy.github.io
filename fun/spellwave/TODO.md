# Spellwave Roguelike Expansion - TODO

## Implementation Order
Core mechanics first: **Potion System → Mimic Chest → UI → VFX**

---

## 1. Potion System

### Mechanics (settled decisions)
- [ ] Potion inventory: 4 slots, mapped to arrow keys (Left=1, Up=2, Right=3, Down=4)
- [ ] Activation only when slot is occupied and game is actively running
- [ ] Arrow-key activation must not bleed into the typing buffer
- [ ] Potion kills are **neutral**: no score, streak, combo, or glossary credit

### Potion Types
- [ ] **Time Freeze**: pause enemy movement, spawn timers, boss projectiles in flight, and boss attack cooldown; duration TBD
- [ ] **Chain Lightning**: chain to N nearest targetable enemies (define N before coding); use the normal defeat/cleanup path so state stays consistent
- [ ] **Shield**: absorb the next 2 damage hits (leaked enemies and boss projectiles both count)

---

## 2. Mimic Chest Enemy

- [ ] New enemy type: reward target only, never a damage threat
- [ ] Spawn rule: rare normal-wave only; excluded from boss waves; does not count toward required kill total
- [ ] Behavior: mirrors Medic archetype — fast approach, short timer, escapes if not defeated in time
- [ ] On defeat: drop one random potion if a slot is free; show "INVENTORY FULL" feedback if not
- [ ] On escape: remove without damaging the player; play missed-loot feedback
- [ ] 3D animation: lid opens when targeted, snaps shut on escape (Dragon Quest style)
- [ ] SFX: chest clack/snap sound

---

## 3. UI

- [ ] Potion Bar: 4-slot bar at top center, below the title banner
- [ ] Each slot shows: arrow-key label, empty state, occupied potion icon
- [ ] Unique icon per potion type (Time Freeze, Chain Lightning, Shield)
- [ ] Collection feedback: potion animates from chest to inventory slot
- [ ] Activation feedback: flash/animation on the used slot
- [ ] Blocked feedback: distinct state when inventory is full

---

## 4. VFX & Polish
*Defer until core mechanics are playable.*

- [ ] Time Freeze: screen desaturation + blueish tint
- [ ] Chain Lightning: electric bolts jumping between chained enemies
- [ ] Shield: rotating geometric barrier around the wall area
- [ ] All activations: particle burst + screen shake

---

## 5. Backlog / Brainstorm

- Gold Mimics: rare variant dropping rare potions or multi-charge relics
- Potion synergies: e.g. Chain Lightning during Time Freeze increases its range
- Typing Combo Meter: 50-word streak awards a random potion
- Cursed Potions: big benefit with a trade-off (e.g. Speed Potion — enemies move 2x speed for 5s)
- Boss Potions: drop only from boss defeats
