# WX Tools — Personal Weather Station Dashboard

A personal weather station data system built with FastAPI, Vue 3, PostgreSQL/TimescaleDB, and Caddy. Ingests data from an Ambient Weather WS-2902 station, stores it in a time-series database, and serves a responsive mobile-first PWA dashboard.

## Architecture

```
Weather Station (WS-2902)
        │ HTTP GET
        ▼
┌──────────────────┐     ┌────────────────────┐
│  Caddy (HTTPS)   │────▶│  FastAPI + Vue PWA  │
│  wx.domain.com   │     │  Docker (port 7000) │
└──────────────────┘     └────────┬────────────┘
                                  │
                         ┌────────▼────────────┐
                         │  PostgreSQL +        │
                         │  TimescaleDB         │
                         │  (port 5432)         │
                         └─────────────────────┘
```

The Vue frontend is built as a static PWA, served directly by FastAPI from the `static/` directory (bind-mounted into the container). Caddy handles TLS termination and blocks admin routes from the public internet.

## Features

**Dashboard**
- Responsive mobile-first PWA — installable on iOS/Android
- Dynamic condition banner (Sunny/Cloudy/Rainy/Night) with matching gradient
- Collapsible sidebar on desktop, slide-out drawer on mobile
- Color-coded metric cards for all sensors
- Offline support via Workbox service worker

**Data**
- Real-time ingestion from Ambient Weather WS-2902 station
- 30+ weather metrics (temp, humidity, wind, rain, pressure, UV, solar)
- CSV bulk import for historical data
- Time-series queries with configurable ranges and sampling

**Analysis**
- Solar energy potential calculator
- Wind energy potential calculator
- Configurable panel/turbine parameters, ROI projections

**Security (via Caddy)**
- Admin routes (`/import`, `/analysis`, `/explorer`, `/settings`) return 403 publicly
- Write methods (POST/PUT/DELETE/PATCH) blocked at proxy
- API docs (`/docs`, `/redoc`) blocked publicly
- Full security header suite (CSP, HSTS, X-Frame-Options, etc.)

## Deployment

The service runs as a Docker container. Static frontend files are served from a bind-mounted `static/` directory so frontend updates deploy without rebuilding the image.

### Running Container

```bash
docker ps | grep wx-service    # confirm running on port 7000
```

### Frontend Deployment

After any frontend change, build and copy to `static/`:

```bash
cd frontend
npm run build
cp -r dist/* ../static/
```

The bind mount means the update is live immediately — no container restart needed.

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `STATION_PASSKEY` | Ambient Weather station passkey | Yes |
| `LOG_LEVEL` | DEBUG / INFO / WARNING / ERROR | No (INFO) |
| `MQTT_BROKER` | MQTT broker hostname | No |
| `MQTT_PORT` | MQTT broker port | No (1883) |
| `MQTT_TOPIC` | MQTT publish topic | No (weather/data) |

## Caddy Configuration

See [`docs/caddy-security.md`](docs/caddy-security.md) for the full Caddyfile block. In brief:

```caddy
wx.yourdomain.com {
    tls you@yourdomain.com

    @admin path /import* /analysis* /explorer* /settings*
    respond @admin 403

    @writes method POST PUT DELETE PATCH
    respond @writes 403

    reverse_proxy 127.0.0.1:7000 { ... }
}
```

Admin features remain accessible locally at `http://localhost:7000`.

## Frontend Development

```bash
cd frontend
npm install
npm run dev        # dev server with HMR at localhost:5173
npm test           # vitest unit tests
npm run build      # production build → dist/
```

**Stack:** Vue 3 + TypeScript, Tailwind CSS 4, Pinia, Vue Router, Chart.js, vite-plugin-pwa

## Weather Station Setup

1. Log in to Ambient Weather dashboard → My Devices → Device Settings
2. Set **Custom Server** to your server's IP/hostname, port `7000`, path `/api/weather/upload`
3. Set interval to 60 seconds
4. Add your passkey to the `.env` file

## API

Local access only (blocked at Caddy for public):

- `GET /api/weather/current` — latest reading
- `GET /api/weather/readings` — paginated readings with `start`, `end`, `limit` params
- `GET /api/weather/sampled` — downsampled readings for charts
- `GET /api/weather/stats` — 24h statistics
- `POST /api/weather/import` — bulk CSV import
- `POST /api/analysis/solar` — solar energy analysis
- `POST /api/analysis/wind` — wind energy analysis
- `GET /api/health` — health check with data freshness
- `GET /api/config` — station configuration

Interactive docs at `http://localhost:7000/docs`.

## Testing

```bash
# Backend (Python)
pytest

# Frontend (Vitest)
cd frontend && npm test
```

Frontend tests cover the `useConditionTheme` composable and the weather Pinia store (12 tests total).

## Project Structure

```
wx-tools/
├── src/                  # FastAPI application
│   └── main.py           # Routes, ingestion, analysis
├── frontend/             # Vue 3 PWA
│   ├── src/
│   │   ├── views/        # Home, Graphs, ImportData, EnergyAnalysis, DataExplorer, Settings
│   │   ├── stores/       # Pinia weather store
│   │   ├── composables/  # useConditionTheme
│   │   └── components/   # NavIcons
│   ├── public/
│   │   ├── manifest.json # PWA manifest
│   │   └── icons/        # wx-192.png, wx-512.png, wx-icon.svg
│   └── vite.config.ts    # Vite + PWA plugin config
├── static/               # Built frontend (bind-mounted into container)
├── docs/
│   ├── caddy-security.md # Caddyfile snippet for public deployment
│   ├── GRAPHS_PAGE.md
│   └── timezone-feature.md
├── tests/                # Backend pytest tests
└── alembic/              # Database migrations
```
