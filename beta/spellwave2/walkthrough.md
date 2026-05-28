# Walkthrough - Boss Projectile Concurrency Cap & Staggered Spacing

We have successfully implemented and verified the boss projectile rate-limiting optimizations for Wave 10. Below is a summary of the changes.

## Changes Made

### 1. Projectile Concurrency Cap
- Added a new constant `MAX_CONCURRENT_BOSS_PROJECTILES = 2` in `main.js`.
- Modified the boss shot timer loop in `updateEnemies()` to check the active count of rocks in the air. If the count is at or above the cap, the boss holds their throw (keeping `shotTimer = 0`).
- This prevents the screen from becoming cluttered and protects the player from taking massive, unavoidable damage from multiple synchronized hits.

### 2. Staggered Launch Spacing
- Added `MIN_PROJECTILE_SPACING = 1.6` seconds in `main.js`.
- Declared a global `lastBossShotTime = -999` state variable to track the timestamp of the last rock thrown.
- Modified the boss shot timer loop in `updateEnemies()` to verify that `seconds - lastBossShotTime >= 1.6` before firing.
- This forces bosses to stagger their throws even if multiple bosses are waiting at `shotTimer = 0`, resolving the issue where projectiles synchronized and fired in pairs.
- Updated `clearEffects()` to reset `lastBossShotTime = -999` to ensure clean state resets between runs.

---

## Verification & Manual Testing

1. **Local Server**: Serves files on port `8006`.
2. **Combat Playtesting**:
   - Triggering Wave 10 with 10 bosses spawns a steady, readable stream of rocks.
   - Verified that even under high pressure (all bosses revealed), there are never more than 2 rocks in the air at the same time.
   - Verified that projectiles are launched with a distinct 1.6-second delay between them, completely breaking up synchronized launches.
   - Verified that resetting the game correctly clears all timers.
