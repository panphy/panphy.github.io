# Implementation Plan: Boss Projectile Concurrency Firing Cap & Staggered Spacing

Limit the maximum number of simultaneous boss projectiles in flight and enforce a minimum spacing interval between throws to make Wave 10 challenging but readable and playable.

## Proposed Changes

### Configuration Constants & State Variables

#### [main.js](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/main.js)
- Add a concurrency limit: `const MAX_CONCURRENT_BOSS_PROJECTILES = 2;` (no more than 2 rocks can be in flight simultaneously).
- Add a spacing limit: `const MIN_PROJECTILE_SPACING = 1.6;` (forces a minimum time interval of 1.6s between consecutive projectile launches).
- Declare state variable: `let lastBossShotTime = -999;` (tracks the game-time timestamp of the last rock thrown).

### Firing Logic & State Cleanup

#### [main.js](file:///Users/ypleung/dropbox/work_in_progress/my_projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/main.js)
- Update the boss projectile firing check in `updateEnemies()`:
  - Check both the concurrency cap (`activeRocksCount < MAX_CONCURRENT_BOSS_PROJECTILES`) and the launch spacing (`seconds - lastBossShotTime >= MIN_PROJECTILE_SPACING`).
  - If both conditions are met, allow the throw and set `lastBossShotTime = seconds`.
  - Otherwise, hold the shot and keep `shotTimer = 0` to fire as soon as both conditions are met.
- Update `clearEffects()` to reset `lastBossShotTime = -999;` on restart.

---

## Verification Plan

### Manual Verification
- Deploy locally using `python3 -m http.server 8006` or similar.
- Trigger wave 10 or spawn boss projectiles using the Konami Code cheat.
- Verify that even if multiple bosses are active:
  - There are never more than 2 rocks in the air at the same time.
  - Projectiles are launched with a distinct 1.6-second delay between them, preventing them from grouping up and launching in pairs or clusters.
  - When a rock hits the player or is blocked, the waiting boss immediately throws its rock once spacing allows.
