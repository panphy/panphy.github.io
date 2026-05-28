# Boss Projectile Concurrency Cap & Staggered Spacing - Tasks

- `[x]` Add `MAX_CONCURRENT_BOSS_PROJECTILES` constant in `main.js`
- `[x]` Add `MIN_PROJECTILE_SPACING` constant in `main.js`
- `[x]` Declare and initialize `lastBossShotTime` global variable in `main.js`
- `[x]` Modify boss projectile shooting logic in `updateEnemies()` to enforce cap and spacing
- `[x]` Reset `lastBossShotTime` in `clearEffects()` in `main.js`
- `[x]` Verify staggered projectile launches and concurrency cap in the browser
