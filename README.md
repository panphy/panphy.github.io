Welcome to PanPhy Projects. The tools, simulations, and games here are built with AI and designed to be interactive, educational, and aligned with my teaching goals. While there are many great physics simulations online, not all meet my needs. Additionally, with school devices locked down, installing software has become a hassle. So, I decided to create my own web apps: simple, browser-based, and ready for everyone to explore and enjoy.

Most importantly, the site is now offline-friendly (apart from EAL Learning Companion, which is a Streamlit app). Once you have opened it in a browser, you can keep using the tools, simulations, and games even without an internet connection.

## Tech Stack
- **HTML/CSS:** Lightweight, fast-loading UI with a consistent look and feel  
- **Vanilla JavaScript:** Framework-free interactive logic (simulations, controls, rendering, state)  
- **Offline support:** Service Worker caching for offline use after the first visit

## Offline & App Behavior
- `manifest.json` defines the Progressive Web App (PWA) metadata: app name, icons, start URL, and display mode. It lets browsers offer “install to home screen” and ensures the app launches with the correct branding and colors.
- `sw.js` is the service worker that pre-caches core assets and manages runtime caching. It serves cached pages and assets when offline and updates caches when online, enabling the offline-friendly experience described above.
