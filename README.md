# PanPhy Labs

Small, useful physics apps that run wherever a browser does.

[Open PanPhy Labs](https://panphy.app/)

Welcome to **PanPhy Labs**. These tools, simulations, and games are built with AI and designed to be interactive and educational. There are many great physics tools online, but not all of them fit my lessons. On school-managed devices, students and teachers often don't have the admin rights to install software, so I build my own web apps that are simple, run in any browser, and need no installation.

The aim is simple: build tools I'm proud to use in my own classroom and happy to recommend to others.

## Have a look around

Here are a few places to start. The [homepage](https://panphy.app/) has the full app catalog.

- **Work with real data.** Plot graphs and fit curves in [PanPhyPlot](tools/panphyplot.html), track motion from video in [PanPhyTrack](tools/motion_tracker.html), build and measure circuits in [PanPhyCircuits](tools/panphycircuits.html), or explore microphone signals in [Sound Analyzer](tools/sound_analyzer.html).
- **Try out the physics.** Make waves in the [Virtual Ripple Tank](simulations/ripple_tank.html), investigate collisions in [Collision Lab](simulations/collision.html), or see how [Electric Motors](simulations/electric_motors.html) work.
- **Make lessons a little easier.** Put an [Exam Timer](for_teachers/timer.html) on the board, turn a camera into a [Visualizer](for_teachers/visualizer.html), mix waves with the [Tone Generator](tools/tone_generator.html), or write notes in [PanPhyMD](tools/panphymd.html).
- **Take a break.** Try the spelling game [Spellwave](fun/spellwave.html) or turn your webcam into text with [ASCII Camera](fun/ascii_cam.html).

## Curriculum hubs

I also keep my course resources here: teaching decks, workbooks, revision material, and lesson starters. These have their own hubs, separate from the homepage app catalog. You're welcome to use them in your lessons or for your own study; see [License](#license) for the details.

- **[GCSE Physics](https://panphy.app/gcsephy/):** course summaries of AQA Physics 8463 and the physics in Combined Science: Trilogy 8464, AO1 starters and revision resources, then teaching decks and workbook hubs for Years 9 to 11. Each unit folder, `gcsephy/course-summary/` and `gcsephy/do-now/` has its own README; [teaching deck styles and controls](gcsephy/decks/README.md) are documented separately.
- **[IB DP Physics](https://panphy.app/ibdpphy/):** the IB Diploma Programme Physics course (first assessment 2025). See the [folder overview](ibdpphy/README.md).

## Offline use

Most tools and simulations can come along even when the Wi-Fi doesn't. Visit online first and look for the **Offline ready** badge on each homepage card before relying on an app offline. When an app or its shared files change, it offers an update prompt.

Games, trial apps, unlisted resources, and both curriculum hubs need an internet connection, as do features such as leaderboards. The curriculum hubs check for fresh content on every load and offer a Reload banner when an open page's files or watched data change.

## Running it locally

The site is plain HTML, CSS, and JavaScript, served through GitHub Pages. There's no build step. From the repository folder, run:

```sh
python3 -m http.server 8000
```

Then open [localhost:8000](http://localhost:8000). Each app has its own HTML entry point, so you can open it directly. When checking changes, use a clean browser context to avoid an older service-worker cache.

## Repository map

| Path | Contents |
| --- | --- |
| `index.html` | The homepage, app catalog, topic filters, and offline readiness indicators |
| `sw.js`, `manifest.json` | Caching, updates, and PWA configuration |
| `assets/` | The shared Spectrum design system (`design.css`), shared app footers (`footer.css`), controls, icons, locally hosted fonts, and service-worker registration |
| `tools/`, `simulations/`, `for_teachers/` | Published educational apps |
| `fun/` | Games and demos that need an internet connection |
| `beta/` | Trial apps, listed in `beta/index.html` |
| `misc/` | Unlisted resources, including the phone-compatible introductory [PanPhyPlotOG](misc/panphyplotog.html), inventoried in `misc/index.html` |
| `gcsephy/` | GCSE Physics curriculum resources, course summaries and the Do Now starters, inventoried in `gcsephy/index.html` |
| `ibdpphy/` | IB DP Physics teaching decks, inventoried in `ibdpphy/index.html` |
| `.github/` | Repository checks, app tests, and scheduled Supabase keepalive automation |

For editing conventions, caching rules, and verification commands, see [AGENTS.md](AGENTS.md).

## License

Copyright © 2026 PanPhy Labs. All rights reserved.

You're welcome to use the site in lessons, link to it, and print or download pages for your own study or teaching your own students, free of charge, with the copyright notice left in place. The source is public to read but is not open source. Copying, adapting, or republishing the code or content beyond those uses needs written permission. Third-party libraries, fonts, and credited images keep their own licenses. See [LICENSE](LICENSE).

## Contact

- [Email PanPhy Labs](mailto:panphylabs@icloud.com)
- [Support the project](https://buymeacoffee.com/panphy)
