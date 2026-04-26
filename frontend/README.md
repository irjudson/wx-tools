# WX Tools — Frontend

Vue 3 + TypeScript PWA dashboard for the WX Tools weather station system.

## Stack

- **Vue 3** with `<script setup>` + TypeScript
- **Tailwind CSS 4** — utility-first styling
- **Pinia** — weather data store
- **Vue Router** — SPA routing with `meta.public` flags
- **Chart.js** — wind rose, solar sparkline, historical graphs
- **vite-plugin-pwa** — Workbox service worker, offline support

## Development

```bash
npm install
npm run dev      # HMR dev server at localhost:5173 (proxies /api to localhost:7000)
npm test         # vitest unit tests
npm run build    # production build → dist/
```

After building, copy to the backend's static directory to deploy:

```bash
cp -r dist/* ../static/
```

## Structure

```
src/
├── views/
│   ├── Home.vue           # Dashboard: condition banner + metric cards
│   ├── Graphs.vue         # Historical charts
│   ├── ImportData.vue     # CSV bulk import
│   ├── EnergyAnalysis.vue # Solar/wind energy calculator
│   ├── DataExplorer.vue   # Raw data table
│   └── Settings.vue       # Station config, timezone, MQTT
├── stores/
│   └── weather.ts         # Pinia store — latest reading, sampled history, auto-refresh
├── composables/
│   └── useConditionTheme.ts  # Maps rain_rate + solar_radiation → gradient/label/icon
├── components/
│   └── NavIcons.vue       # Inline SVG icon set (home, graphs, import, analysis, explorer, settings, menu, x, wifi-off, chevrons)
├── router/
│   └── index.ts           # Routes with meta.public flags (enforced at Caddy, not here)
├── types/
│   └── weather.ts         # WeatherReading TypeScript interface
└── style.css              # Tailwind base + component classes (metric-card, severity-badge, sidebar, drawer)
```

## PWA

The app is installable as a standalone PWA on iOS and Android. Assets:

- `public/manifest.json` — name, theme color, icons
- `public/icons/wx-icon.svg` — source SVG
- `public/icons/wx-192.png` / `wx-512.png` — generated with ImageMagick

Workbox caches all static assets at install time and uses NetworkFirst (5s timeout) for `/api/weather/*` so the last reading is available offline.

## Routing and Security

Routes are defined with `meta.public: true/false`. Only `/` (Dashboard) and `/graphs` are public — all others return 403 when accessed via the public Caddy proxy. The flags are documentation only; the real enforcement is in the Caddyfile (see `docs/caddy-security.md`).
