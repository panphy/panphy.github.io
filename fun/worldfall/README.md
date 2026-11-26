# Worldfall

The game behind `fun/worldfall.html`: a reaction-time test played on seven worlds, from the Moon to Jupiter. A ball is released at a random moment and falls 0.5 m at that world's g beside a ruler; the player catches it with a tap, a click or Space before it hits the floor. The result is the median reaction time over the seven worlds. Like everything in `fun/`, it is network-only and needs no build step. Three.js comes from jsDelivr through the page's import map.

- `game.js`: the worlds (`WORLDS`: g, axial tilt, atmosphere tint, a fact and the map's source), the scene with the spinning planet behind the stand, the run, timing and input, and the results table.
- `rig.js`: the drop stand: ruler, clamp, ball and the green mark where a caught ball stopped.
- `music.js`: an original pipe-organ score in D minor, synthesized with Web Audio.
- `sfx.js`: synthesized catch, smash and false-start sounds.
- `game.css`: the HUD, panels and results table.
- `maps/`: one equirectangular WebP surface map per world, from NASA missions (credited on each world's intro card). Only the current and next maps stay on the GPU, so phones do not run out of memory.

## Timing

The measurement rules are in the comment at the top of `game.js`; keep them intact when changing the game.

- The wait before release is a truncated exponential (`FORE_MIN`, `FORE_MEAN`, `FORE_MAX`), so the release cannot be anticipated.
- Onset is the timestamp of the animation frame after the one that drew the release, the vsync at which it reached the screen. The response is the input event's own `timeStamp`, on the same clock.
- Under `MIN_RT` (100 ms) is a false start and over `MAX_RT` (1000 ms) a lapse; a stalled frame (`MAX_FRAME_GAP`) voids the attempt and the same world is tried again, and `MAX_STALLS` stalls in one wait pause the game. Hiding the page or leaving the window also pauses it until the next tap.
- Sound never cues a reaction: effects play only after the response, and the music runs on its own clock.
- A ball is caught if the reaction time is under the world's fall time, √(2d/g). A smashed ball still records its time.

The best median and the mute setting are kept in localStorage (`panphy-worldfall-best`, `panphy-worldfall-muted`). There is no online leaderboard.
