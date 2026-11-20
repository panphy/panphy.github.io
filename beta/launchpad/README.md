# Launchpad

A rocket game in the browser: run a launch company, pick a ready-made rocket for each customer's payload, launch it from the equator and release the payload in the orbit the contract asks for. Experimental, so it lives in `beta/` and keeps its own style.

## Files

| File | Role |
| --- | --- |
| `physics.js` | Gravity, atmosphere, RK4 steps, exact two-body coasting, orbit elements. Pure functions. |
| `rocket.js` | Engines, the fleet of ready-made rockets and their analysis (mass, Δv, thrust-to-weight). |
| `flight.js` | One flight: staging, attitude, payload release, time warp, failures. No DOM, so tests can fly it. |
| `contracts.js` | Contracts, which rockets can fly them and how a delivery is paid. |
| `guidance.js` | Where to point and when to burn for a contract's orbit: the marker, the cues and the Guidance hold. |
| `earth.js` | The Earth, clouds and atmosphere as one full-screen shader. |
| `models.js` | Rocket, exhaust, launch site and stars, all built in code. |
| `scene.js` | Renderer, camera, lighting, smoke and the map view. |
| `audio.js` | Engine and wind sound made with Web Audio; no audio files. |
| `main.js` | Game flow, saved company, input and the flight display. |

## What is not obvious

- **Motion is planar.** The rocket moves in the equatorial plane; the scene only looks 3D. Steering is one angle.
- **Scale.** Physics uses double-precision meters from Earth's center. The scene is centered on the rocket (x east, y up, z south), and the Earth is ray traced in the shader from the camera's exact height, so there is no planet mesh and no jitter on the pad.
- **Two ways to move.** Under thrust or in air, fixed 0.02 s RK4 steps (up to 4× speed). Coasting above 140 km, exact Kepler steps on rails (up to 1000×), which stop at the top of the atmosphere.
- **Failures.** Dynamic pressure × sine of the angle of attack above 9 kPa breaks the rocket up; stagnation heating burns it up on the way back from orbit.
- **Textures** in `textures/` are NASA Blue Marble (July), Black Marble 2016 and the Blue Marble cloud map, resized and saved as WebP. Desktop loads the larger set; touch devices and `?quality=low` load the smaller.
- **Money.** Amounts are millions of dollars. The launch cost is charged at liftoff, the fee is paid when the payload is released, and the saved company (`launchpad-company` in local storage) may go into debt, so no flight is ever blocked.
- **Which rocket fits** is decided by `dvRequired` in `contracts.js`: a rocket's total Δv against a low orbit with its losses (9,500 m/s) plus the transfer. A new rocket or contract must keep that estimate honest.
- **Guidance only advises.** It keeps its own step (ascent, coast, burn, transfer, deliver) and returns a heading, a throttle and a cue. The Guidance hold follows the heading; the throttle is the player's, with a cue to ease off eight seconds before a burn should end.
- **Gameplay changes** (rockets, contracts, atmosphere, limits) must keep `tests/physics.test.mjs` passing: for every contract, `tests/pilot.mjs` flies the cheapest rocket that fits by following the guidance.

## Testing

```bash
node --test beta/launchpad/tests/*.test.mjs
```

In the browser console, `launchpad.tick(n)` runs `n` frames of the game loop and `launchpad.advance(seconds)` flies ahead, which helps when the tab is in the background and animation is throttled.
