---
name: keyfire-reset
description: Resetting the KeyFire High Scores leaderboard after a gameplay change (speed, timing, damage, scoring, ranks, stages, bosses or the question bank). Use when changing KeyFire gameplay in fun/keyfire.html or fun/keyfire/.
---

# Resetting the KeyFire leaderboard

Any KeyFire gameplay change (speed, timing, damage, scoring, ranks, stages, bosses or the question bank) needs the leaderboard reset once the change is live, so old scores never compete with new rules.

`fun/keyfire/README.md` (section "Leaderboard") holds the procedure and the details; follow it. In short:

1. In the same pull request as the gameplay change, bump `CACHE_KEY` in `fun/keyfire/src/leaderboard.js` and add the old key to `OLD_CACHE_KEYS`, so browsers drop their saved copy of the old board. If the change lets a legitimate run score more, raise `MAX_SCORE` there and the server's range check together.
2. Once the change is live, back up the table into the `backup` schema, check the row counts match, then delete the rows from `public.keyfire_leaderboard`, with the SQL in the README. The table lives in the Supabase project, not in this repository; ask the user before running SQL on it.

KeyFire uses British English in its UI and accepts British and American spellings as answers.
