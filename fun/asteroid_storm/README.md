# Asteroid Storm

The game behind `fun/asteroid_storm.html` (moved from `misc/dodge.html`, which now redirects here): a pixel-art dodger with no shooting. Every image, the font, the music and the sound effects are made in code; there are no asset files.

- `main.js`: game loop, stages, hazards, capsules, input and the initials dialog.
- `art.js`: palette, ship sprite, procedural asteroids, capsules, the 5 × 7 bitmap font, nebulae, stars and planets.
- `audio.js`: Web Audio chiptune loop (it adds layers each stage) and effects.
- `leaderboard.js`: the Top Survivors board.
- `trophies.js`: the 16 trophies (milestones, pixel-art badges and physics facts) and the trophy case beside the board.

Cloudflare keeps stylesheets and scripts at its edge for up to four hours, so the page loads them with a version query (`?v=YYYYMMDD-name`): in `fun/asteroid_storm.html` for `style.css` and `main.js`, and in the `import` lines of `main.js`, `trophies.js` and `title.js`. Change it everywhere at once whenever any of these files changes, or visitors can get a new page with old styles or code.

## Difficulty

The asteroid curve (speeds, spawn rate, sizes, hitboxes) starts from the previous version's, with its growth slowed by `RAMP`. The world advances in fixed 1/120 s steps whatever the frame rate, so speeds, collisions and the clock are the same on every device. A stage lasts 15 seconds. Comets and gravity wells (black holes) start in Stage 2, the first well 2.5 seconds in; splitting rocks and solar flares start in Stage 3. A flare is a loop of flame that arcs out of one edge of the field and back into it, as solar flares erupt along magnetic loops: blinking dashed lines mark the loop, drawn through the ship's position, for 1 second, then it blazes for half a second. Only the marked band can hit the ship; the flame tongues past it are for show. Each black hole and each flare gets its own size between a minimum and a maximum (`WELL_SIZE`, `FLARE_HALF_RANGE`); a bigger black hole has a bigger core, reach and pull. `RAMP` and the stage hazard intervals are tuned with a bot that reads the warnings: its median run is about 100 seconds. Capsules give a shield, slow time, a smaller ship or a shockwave that throws nearby rocks away without destroying them. Slow time also slows the clock, so it never pads a score. `STAGES` and the constants at the top of `main.js` hold the numbers.

## Leaderboard

Scores (survival times in seconds) are read from the `dodge_leaderboard` table and written only through the `submit_dodge_score` function, both in the "PanPhy Games" Supabase project rather than in this repository. The page uses plain REST calls with the public anon key. The function and a table constraint (`dodge_survival_time_range`) accept only 1 to 600 seconds; `MIN_SCORE` and `MAX_SCORE` in `leaderboard.js` match them, so raise all three together if a legitimate run could exceed 600 seconds.

A run in which the testing cheat (god mode) was switched on is unranked: it saves no personal best and is never offered for submission. The cheat code is stored only as a hash (`TRAIL_PHASE_SEED`), as in Spellwave.

To reset the board after a gameplay change: copy the table into the `backup` schema (`create table backup.dodge_leaderboard_YYYYMMDD as table public.dodge_leaderboard;`), check that the row counts match, then run `delete from public.dodge_leaderboard;`. In the same change, bump `CACHE_KEY` in `leaderboard.js` and add the old key to `OLD_CACHE_KEYS`, so browsers drop their saved copy of the old board.

## Trophies and callouts

Trophies are kept only in this browser (localStorage: `dodgeTrophiesV1`, `dodgeTrophiesSeenV1`, and `dodgeCapsulesSeenV1` for Collector), never on the server, and are not earned in a run that used god mode. They do not affect the leaderboard. The trophy case's "Clear local records" button (after a confirmation) forgets the trophies and the personal best on this device; the online leaderboard is untouched. A new trophy slides into the top-right corner of the field, and stays highlighted in the trophy case until opened. Close calls show a callout under the timer, bigger for closer passes; close calls within 2 seconds of each other build a streak, and the game-over screen shows the best streak.
