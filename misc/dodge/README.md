# Asteroid Storm

The game behind `misc/dodge.html`: a pixel-art dodger with no shooting. Every image, the font, the music and the sound effects are made in code; there are no asset files.

- `main.js`: game loop, stages, hazards, capsules, input and the initials dialog.
- `art.js`: palette, ship sprite, procedural asteroids, capsules, the 5 × 7 bitmap font, nebulae, stars and planets.
- `audio.js`: Web Audio chiptune loop (it adds layers each stage) and effects.
- `leaderboard.js`: the Top Survivors board.

## Difficulty

The asteroid curve (speeds, spawn rate, sizes, hitboxes) matches the previous version's, so a strong human lasts roughly 30 to 60 seconds. The world advances in fixed 1/120 s steps whatever the frame rate, so speeds, collisions and the clock are the same on every device. A stage lasts 15 seconds and adds comets, splitting rocks and gravity wells. Capsules give a shield, slow time or a smaller ship. Slow time also slows the clock, so it never pads a score. `STAGES` and the constants at the top of `main.js` hold the numbers.

## Leaderboard

Scores (survival times in seconds) are read from the `dodge_leaderboard` table and written only through the `submit_dodge_score` function, both in the "PanPhy Games" Supabase project rather than in this repository. The page uses plain REST calls with the public anon key. The function and a table constraint (`dodge_survival_time_range`) accept only 1 to 600 seconds; `MIN_SCORE` and `MAX_SCORE` in `leaderboard.js` match them, so raise all three together if a legitimate run could exceed 600 seconds.

To reset the board after a gameplay change: copy the table into the `backup` schema (`create table backup.dodge_leaderboard_YYYYMMDD as table public.dodge_leaderboard;`), check that the row counts match, then run `delete from public.dodge_leaderboard;`. In the same change, bump `CACHE_KEY` in `leaderboard.js` and add the old key to `OLD_CACHE_KEYS`, so browsers drop their saved copy of the old board.
