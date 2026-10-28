# Spellwave Neo (beta)

Trial build of Spellwave with **arena boss fights** instead of walking typed MCQ bosses. The published game stays at `/fun/spellwave.html`.

## Play

Serve the repo root and open `/beta/spellwave-neo.html`, or use the [beta index](../index.html).

## What changed vs published Spellwave

- One parked boss per wave with an HP bar
- Question **orbs**: answer with `1` / `2` / `3` or tap (wrong or timeout = ½ heart)
- Fight minions still spawn; typing them chips the boss
- Wave 10 is a three-headed triad
- Does **not** write to the published Hall of Wizards

Numbers live in `src/arena-config.js`. Fight flow is `src/arena-fight.js`.

## Note

British English in the UI, same as Spellwave. Not offline-cached (beta).
