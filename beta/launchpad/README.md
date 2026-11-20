# Launchpad

A rocket game in the browser: build a staged rocket, launch it from the equator and fly it to orbit. Experimental, so it lives in `beta/` and keeps its own style.

## Files

| File | Role |
| --- | --- |
| `physics.js` | Gravity, atmosphere, RK4 steps, exact two-body coasting, orbit elements. Pure functions. |
| `rocket.js` | Parts catalog and design analysis (mass, Δv, thrust-to-weight). |
| `flight.js` | One flight: staging, attitude, time warp, failures. No DOM, so tests can fly it. |
| `missions.js` | Missions, their default rockets and success checks. |
| `earth.js` | The Earth, clouds and atmosphere as one full-screen shader. |
| `models.js` | Rocket, exhaust, launch site and stars, all built in code. |
| `scene.js` | Renderer, camera, lighting, smoke and the map view. |
| `audio.js` | Engine and wind sound made with Web Audio; no audio files. |
| `main.js` | Game flow, input and the flight display. |

## What is not obvious

- **Motion is planar.** The rocket moves in the equatorial plane; the scene only looks 3D. Steering is one angle.
- **Scale.** Physics uses double-precision meters from Earth's center. The scene is centered on the rocket (x east, y up, z south), and the Earth is ray traced in the shader from the camera's exact height, so there is no planet mesh and no jitter on the pad.
- **Two ways to move.** Under thrust or in air, fixed 0.02 s RK4 steps (up to 4× speed). Coasting above 140 km, exact Kepler steps on rails (up to 1000×), which stop at the top of the atmosphere.
- **Failures.** Dynamic pressure × sine of the angle of attack above 9 kPa breaks the rocket up; stagnation heating burns it up on the way back from orbit.
- **Textures** in `textures/` are NASA Blue Marble (July), Black Marble 2016 and the Blue Marble cloud map, resized and saved as WebP. Desktop loads the larger set; touch devices and `?quality=low` load the smaller.
- **Gameplay changes** (parts, atmosphere, limits) must keep `tests/physics.test.mjs` passing: it flies every mission's default rocket with `tests/autopilot.mjs`.

## Testing

```bash
node --test beta/launchpad/tests/*.test.mjs
```

In the browser console, `launchpad.tick(n)` runs `n` frames of the game loop and `launchpad.advance(seconds)` flies ahead, which helps when the tab is in the background and animation is throttled.
