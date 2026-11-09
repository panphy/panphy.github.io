# Virtual Ripple Tank: physics and modeling choices

[Open the simulation](../ripple_tank.html). This folder contains its wave models, numerical solver, rendering, and controls. The aim is to make interference, refraction, and diffraction clear enough to investigate in a classroom.

## What is being modeled?

The tank represents a 16 cm × 16 cm horizontal area. Lengths are in centimeters, time in seconds, frequency in hertz, and wave speed in centimeters per second. A scalar height field represents displacement from the undisturbed water surface; the 3D view displays that field.

The underlying picture is a linear, nondispersive wave: disturbances superpose, and the chosen speed is independent of frequency and amplitude. In a uniform region, wavelength is

$$
\lambda = \frac{v}{f}.
$$

Each tab uses a model suited to its demonstration:

| Tab | Model | What it emphasizes |
| --- | --- | --- |
| Interference | Sum of two prescribed circular waves | Superposition, phase, and path difference |
| Refraction | Prescribed plane waves with phase matched across a straight boundary | Changes in wavelength and direction, including total internal reflection |
| Diffraction | Numerical evolution of the wave equation around solid barriers | Propagation through gaps and around edges |

The first two tabs evaluate their formulas at the current time, so their waves already fill the tank. Diffraction starts with still water and takes time to establish a pattern. Its spreading waves emerge from the solver; circular arcs are not drawn in advance.

## Interference

Each source contributes a sinusoidal circular wave. Before the visual rim fade, its height at distance $r$ is

$$
\eta_i(r,t) = \frac{A_i}{\sqrt{1+r/r_0}}
\cos\left[2\pi f_i\left(\frac{r}{v}-t\right)+\phi_i\right],
\qquad r_0 = 1\,\mathrm{cm}.
$$

The total height is the sum of the two contributions. The amplitude envelope approaches the cylindrical spreading law $1/\sqrt{r}$ far from a source, while staying finite at the source. It is a convenient regularization, rather than an exact solution for a physical dipper near its contact point.

For equal frequencies, the relative phase is determined by path difference and the source phase setting. With $\Delta r=r_1-r_2$ and $\phi$ the phase added to source 2 in the formula, the overlays use

$$
\frac{\Delta r}{\lambda}-\frac{\phi}{2\pi}
= \begin{cases}
m & \text{in phase},\\
m+\tfrac12 & \text{in antiphase},
\end{cases}
\qquad m\in\mathbb{Z}.
$$

These constant-path-difference curves are hyperbolas. The nodal and antinodal overlays show phase conditions: exact cancellation also requires equal local amplitudes. Different source strengths or unequal spreading losses can leave a nonzero minimum on a nominal nodal line. Different frequencies produce a changing pattern, so the steady-line overlays are hidden. Probe classifications allow a tolerance of 0.1 cycle around the phase conditions.

## Refraction

A plane wave travels from the left toward a straight boundary between two chosen speeds. Frequency stays constant, so changing speed changes wavelength. Matching phase along the boundary gives Snell's law, with angles measured from the normal:

$$
\frac{\sin\theta_1}{v_1}=\frac{\sin\theta_2}{v_2}.
$$

A slower second region bends the wave toward the normal; a faster region bends it away. The deep/shallow presets illustrate this behavior by choosing different speeds. Water depth itself is not calculated or evolved. Boundary position and incidence angle are constrained to keep the boundary across the visible tank and clear of the incoming source.

When $v_2>v_1$, the critical angle satisfies

$$
\sin\theta_c=\frac{v_1}{v_2}.
$$

Above it, the model adds a reflected plane wave in region 1 and an evanescent field in region 2. That field oscillates along the boundary and decays exponentially with perpendicular distance; it is not a propagating transmitted wave traveling into region 2.

This is primarily a phase-and-direction model. Below the critical angle, it keeps the prescribed wave amplitude across the boundary and omits partial reflection. Its total-reflection illustration uses an equal-amplitude reflected wave with a simplified phase. It does not calculate physical reflection/transmission coefficients, their phase shifts, or a conserved energy flux across a real depth step.

## Diffraction

Away from sources and absorbing regions, the solver approximates the constant-speed scalar wave equation:

$$
\frac{\partial^2\eta}{\partial t^2}
=v^2\left(\frac{\partial^2\eta}{\partial x^2}
+\frac{\partial^2\eta}{\partial y^2}\right).
$$

It advances a staggered first-order form on the GPU, using height contributions split by direction and scaled velocity variables on cell faces. These auxiliary variables support propagation and absorption; they are not a simulation of individual water particles.

The grid has 256 × 256 cells, giving a spacing of 0.0625 cm. The fixed time step is 0.003125 s, keeping $v\Delta t/\Delta x$ at or below 0.4 over the allowed speeds. The frequency is capped to keep wavelengths at least 0.8 cm long, about 13 cells. This limits numerical dispersion and direction-dependent grid artifacts, but does not eliminate them.

A straight source adds height along a column, launching waves in both directions; the left-going wave is absorbed near the tank edge. A point source drives a small disk, rather than a mathematical point. Sources add to the existing field instead of pinning its height, allowing returning waves to pass through the source region. The point-source gain is calibrated approximately against the Interference tab, not to a physical dipper's power. Continuous forcing ramps up over its first cycle; a single pulse uses a smooth, one-period forcing envelope.

Solid barriers block normal wave velocity at their faces. Water is excluded from their interior cells. The solver then produces diffraction through a single slit, interference of waves from a double slit, or spreading around an edge. A gap comparable to a wavelength produces substantial spreading; a much wider gap transmits a straighter central wavefront.

## Absorption and the displayed surface

### Tank edges

In Diffraction, the outer 2.4 cm is a gradual numerical absorbing layer. Its purpose is to approximate an open tank, so waves leaving the demonstration do not return as strong wall echoes.

Absorption acts separately on each direction's paired height and velocity variables. At the top and bottom edges, it damps the y-directed part of the wave, preserving a uniform plane wave traveling along x. Damping the entire height field along those sides would disturb the incoming plane wave and create unwanted scattering. The layer is finite and approximate, so some residual reflection remains possible, particularly for long waves or grazing propagation.

### Barriers

The solid wall faces are intrinsically reflecting. A separate, 1.2 cm absorbing strip in the water immediately in front of each barrier's left face suppresses most of that reflection, like a foam lining. Its strength grows gradually toward the wall. The gaps stay open.

This deliberately favors a clear transmitted diffraction pattern over strong standing waves on the incident side. The strips remove wave energy and alter amplitudes near the barriers; these are lossy obstacles, not demonstrations of perfectly reflecting walls. The lining assumes the upright barriers used by the presets. It is not a general absorber for arbitrarily rotated obstacles or waves arriving from every direction, including a point source moved behind a barrier.

### Visual treatment

The 3D water displacement tapers smoothly to zero over the outer 1.8 cm. For Diffraction, this is a rendering operation and is never fed back into the solver. The analytical tabs also taper their prescribed waves at the rim.

Lighting, source colors, and nonlinear contrast make crests, troughs, and weak diffracted waves easier to see. Diffraction's top-view contrast uses the underlying solver height. These views are teaching visualizations of displacement, not calculations of optical caustics or calibrated maps of wave intensity or energy. Use the central tank for comparisons of wave shape and spacing; the absorbing and faded rim regions intentionally modify what is seen.

## Limits of interpretation

- **Idealized water:** the model omits viscosity in the interior, surface tension, realistic gravity/capillary dispersion, currents, breaking waves, and nonlinear interactions. Chosen speeds represent depth changes only qualitatively. Large displayed amplitudes still follow the same linear model.
- **Approximate amplitudes:** source regularization, finite source size, absorber losses, and simplified refraction amplitudes prevent quantitative energy, transmission, or reflection measurements. The three tabs are separate demonstrations, not interchangeable numerical experiments.
- **Finite resolution:** barriers are rasterized onto the grid, and the displayed surface is interpolated. Small features and short wavelengths have limited accuracy; nominal $v/f$ readouts are model values, not measurements of the numerical field. Floating-point precision also varies with device support.
- **Small residual disturbances:** diffraction and remaining reflections can legitimately perturb incident fronts near a barrier. An empty tank's straight source should remain uniform along each front, but perfect straightness beside an obstacle is not required by the model.
- **Playback and changes:** frame time is capped and solver work per frame is limited to keep the interface responsive, so slow devices can run behind wall-clock time. Diffraction cannot step backward. Changing its frequency, speed, amplitude, or source position can leave existing waves in flight; use **Clear ripples**, **Send a pulse**, or **Reset** to start a fresh comparison.
- **GPU support:** Diffraction requires WebGL 2 and renderable floating-point textures. The solver uses full precision with linear filtering when supported, otherwise half precision. Unsupported devices show an unavailable message for that tab.

## Editing and checking the model

The HTML entry point is [../ripple_tank.html](../ripple_tank.html). [app.js](app.js) contains analytical wave shaders, source driving, rendering, and controls; [physics.js](physics.js) mirrors analytical relationships for readouts and overlays; [solver.js](solver.js) advances Diffraction; [shapes.js](shapes.js) defines barriers and their absorption masks. Keep matching formulas and readouts consistent when editing.

There is no build step. From the repository root, run `python3 -m http.server 8000`, then open [the local simulation](http://localhost:8000/simulations/ripple_tank.html) in a clean browser context. For physics changes, check phase/path-difference overlays, refraction and total reflection, straight fronts in an empty solver tank, all three barrier presets, point sources, pulses, and both supported texture precisions. Follow the repository's verification and cache-version rules in [AGENTS.md](../../AGENTS.md).

© 2026 PanPhy Labs. All rights reserved.
