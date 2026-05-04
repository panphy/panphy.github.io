# Spellwave

Beta-only Three.js typing combat prototype for low-pressure exposure to GCSE physics keywords, units, definitions, and later formula prompts.

Run it from the repository root with a simple local server:

```bash
python3 -m http.server 8000
```

Then open `/beta/spellwave/`.

This page intentionally avoids service-worker registration, published navigation, and `sw.js` cache entries because everything under `/beta` is excluded from the production offline cache.
