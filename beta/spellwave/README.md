# Spellwave (beta rework)

A working copy of Spellwave (`fun/spellwave.html`) for reworking it in the spirit of rail-shooter typing games. The live game is untouched; this copy has no leaderboard (`src/leaderboard.js` is a stub) and keeps its best score and word history under its own localStorage keys. The page is `beta/spellwave.html`. It needs no build step, and the files share the `?v=` value `beta1`.

Run the tests with `node --test beta/spellwave/tests/*.test.mjs`.

## What differs from the live game

- **On rails.** `src/stages.js` builds a new stage for each wave: a winding path through a valley, a stop for each ambush and a boss arena. The game never moves its camera. Instead it moves and turns `stageRig` so the current point on the route sits at the origin, facing −z. At a stop, the stop's frame is the game's frame, so hiding spots are written in game coordinates. Spring meadow props (cottages, haystacks, fences, a windmill) are the only kit so far.
- **Ambushes.** The rail section of `src/main.js` splits the wave's monsters, healers and chests into bursts, one per stop. Monsters jump out from behind cover, rise from the ground or drop from the sky, then rush to `STRIKE_Z`, wind up and strike. Each one's walk time comes from an estimate of how long the player needs for its word and for every word already on screen. Healers and chests run across the stop instead.
- **Typing.** The input bar is gone: what the player types shows under the word in the target's own card. A wrong key is only a miss. It costs accuracy and the chain, but the letters typed so far and the target stay.
- **Units and symbols.** `SYMBOL_WORDS` in `src/question-bank.js` are the quickest monsters. They are matched exactly, capitals included (`caseSensitive`); superscripts are typed as digits and spaces are optional.
- **Feel.** Every correct letter flicks a bolt from a wand and makes the monster flinch. A finishing letter adds a hit pause and a camera kick, and the last kill of an ambush plays in slow motion.

- **Bosses.** Each wave ends with one boss in the arena. It speaks whole statements from `BOSS_PHRASES` in `src/question-bank.js`, shown at the bottom of the screen. The player types them word by word, and each finished statement takes a segment off the health bar at the top. Between words the player can shatter the rocks it throws, each marked with a short unit; no rock starts with the same letter as the boss's next word or another rock. `bossPlan` in `src/difficulty.js` sets the statements, the longest statement, the throw rate, the rock flight time and the rock damage for each wave. Wave 10 is a single eight-statement final boss. A line finished with chain lightning primed takes two segments and clears the rocks.

The live game's clue-question code (hidden words, hint letters, boss previews) is still in the files but no longer runs. The other chapters' stages come next.
