---
name: spellwave-reset
description: Resetting the Spellwave "Hall of Wizards" leaderboard after a gameplay change (speed, timing, damage, rock frequency, scoring, waves, the question bank or boss options). Use when changing Spellwave gameplay in fun/spellwave.html or fun/spellwave/.
---

# Resetting the Spellwave leaderboard

Any Spellwave gameplay change (speed, timing, damage, rock frequency, scoring, waves, the question bank or boss options) needs the leaderboard reset once the change is live, so old scores never compete with new rules.

`fun/spellwave/README.md` (section "Leaderboard") holds the procedure and the details; follow it. In short:

1. In the same pull request as the gameplay change, bump `CACHE_KEY` in `fun/spellwave/src/leaderboard.js` and add the old key to `OLD_CACHE_KEYS`, so browsers drop their saved copy of the old board. If the change lets a legitimate run score more, raise `MAX_SCORE` there and the server's range check together.
2. Once the change is live, back up the table into the `backup` schema, check the row counts match, then delete the rows from `public.spellwave_leaderboard`, with the SQL in the README. The table lives in the Supabase project, not in this repository; ask the user before running SQL on it.

Spellwave uses British English in its UI and accepts British and American spellings as answers.
