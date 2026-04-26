# WX Tools: Responsive, Beautiful, Secure PWA Design

**Date:** 2026-04-26  
**Status:** Approved, ready for implementation

## Goals

Transform the wx-tools weather dashboard into a responsive, mobile-friendly, visually vibrant PWA that is safe to expose to the public internet.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary mobile use case | Quick glance at Home view | Most common mobile interaction is checking current conditions |
| Visual direction | Vibrant & data-rich | Color as information — every metric owns a color |
| Desktop sidebar | Collapsible full ↔ icon-rail | Maximizes data space while keeping nav accessible |
| Mobile navigation | Top app bar + hidden slide-out drawer | Home gets full viewport, nav out of the way |
| Mobile Home hero | Condition banner + scrollable stats | Fast to read, thumb-friendly |
| Public vs. protected | Home view public, all other routes local-only | Weather data is public, station controls are not |
| Auth method | None — admin via localhost only | Simplest and most secure: no auth surface to attack |
| Reverse proxy | Caddy on port 7000 | User has existing Caddy config |
| PWA | vite-plugin-pwa + Workbox | Minimal overhead, handles everything automatically |

---

## Section 1: Color System & Visual Language

### Semantic Color System

Every weather metric owns a color used consistently across cards, icons, charts, and accent bars:

| Metric | Color | Tailwind Classes |
|--------|-------|-----------------|
| Temperature | Amber → Red | `text-amber-500`, `bg-amber-500` |
| Wind | Sky Blue | `text-sky-500`, `bg-sky-500` |
| Rain / Humidity | Indigo / Violet | `text-indigo-500`, `bg-indigo-500` |
| UV Index | Orange → Purple | `text-orange-500`, `bg-orange-500` |
| Solar / Energy | Yellow / Lime | `text-yellow-500`, `bg-yellow-500` |
| Pressure | Teal | `text-teal-500`, `bg-teal-500` |
| Feels Like | Warm Gray | `text-gray-400`, `bg-gray-400` |

### Condition Severity Colors

Dynamic classes applied based on reading values:
- Wind > 25mph → red badge
- UV > 8 → purple alert chip
- Temperature extremes → gradient shifts

### Typography

Switch from system fonts to **Inter** via Google Fonts CDN. Precision instrument, reads perfectly at small data label sizes.

### Card Treatment

Each metric card:
- Left-side color accent bar (4px, metric's color)
- Icon in that same color
- Value in bold `text-2xl`
- Subtle `bg-gray-50 dark:bg-gray-800` base, no heavy borders
- Hover: slight lift with `shadow-lg`, accent bar brightens

---

## Section 2: Layout Architecture

### Desktop (≥1024px)

- Sidebar toggles between **256px full** and **64px icon-rail**
- Toggle button: collapse arrow pinned to sidebar edge
- Preference saved to `localStorage`, persists across sessions
- Main content transitions width: `transition-all duration-200`
- Sidebar visual overhaul: `gray-900` background, color-coded nav items, live station stats card with pulsing green status dot

### Tablet (768px–1023px)

- Defaults to icon-rail (64px) automatically
- No manual toggle needed

### Mobile (<768px)

- Sidebar disappears entirely
- **Top app bar:** 56px tall, `gray-900` background, station name left, hamburger right
- Hamburger opens full-height slide-in drawer with dimmed overlay
- Drawer contains full sidebar content: station stats + nav links
- Home view owns the full viewport below the app bar

### Implementation Details

- Vue `provide/inject` for sidebar collapsed state
- `localStorage` key: `wx-sidebar-collapsed`
- CSS transitions only — no animation libraries
- App.vue is single source of truth for sidebar state

---

## Section 3: Home View Redesign

### Condition Gradient Composable

`src/composables/useConditionTheme.ts` maps API condition strings to Tailwind gradient classes:
- Sunny → `from-amber-400 to-yellow-300`
- Rain → `from-indigo-600 to-violet-500`
- Overcast → `from-slate-600 to-gray-500`
- etc.

### Mobile Layout

**Condition banner** (full width, dynamic gradient):
- Large condition label + SVG weather icon
- Current temp dominant, feels-like secondary
- Station name + last updated timestamp

**Scrollable stats list** (below banner):
- Full-width rows, thumb-friendly tap targets
- Left: color accent bar + metric icon in metric color
- Center: metric name + value in bold
- Right: small trend arrow (↑ ↓ →) based on change from previous reading
- No cards, no grid — single clean vertical scroll

### Desktop Layout

- Full-width condition banner spanning content area (same gradient)
- Below: card grid `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Cards use color accent bar system
- Hover states: `shadow-lg` lift, accent bar brightens

### Offline State

Cached last reading shown with amber banner: "Offline — showing last reading from X min ago."

---

## Section 4: Security Architecture

**Model: network-level separation, not app-level auth.**

### Caddy Configuration (port 7000)

```caddy
yourdomain.com {
    # Block admin routes
    @admin path /import* /analysis* /explorer* /settings*
    respond @admin 403

    # Block all write API methods
    @writes method POST PUT DELETE PATCH
    respond @writes 403

    # Block FastAPI docs
    respond /docs* 403
    respond /redoc* 403
    respond /openapi.json 403

    # Rate limit public API (30 req/min per IP)
    rate_limit {
        zone public 30r/m
    }

    # Security headers
    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin"
        Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
        -Server
    }

    reverse_proxy localhost:7000
}
```

### Access Model

| Access Point | Routes Available |
|-------------|-----------------|
| Public internet (via Caddy) | `/`, `/api/weather/current`, `/api/weather/readings`, `/static/` |
| Local (`localhost:7000` direct) | All routes, all API methods |

### Vue Router

Public routes marked with `meta.public = true` as documentation — real enforcement is Caddy, not the client.

---

## Section 5: PWA Setup

### Dependencies

- `vite-plugin-pwa` — manifest + service worker generation
- Workbox (bundled with vite-plugin-pwa) — caching strategies

### Manifest

```json
{
  "name": "WX Station",
  "short_name": "WX",
  "theme_color": "#111827",
  "background_color": "#111827",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/icons/wx-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/wx-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Caching Strategy

| Resource | Strategy | Rationale |
|----------|----------|-----------|
| App shell (HTML/JS/CSS) | Cache-first | Loads instantly offline |
| `/api/weather/current` | Network-first, cache fallback | Show stale data with age indicator |
| All other API routes | Network-only | Admin/local use only |

### Icons

Generate weather-themed icon set (SVG → PNG at 192px and 512px), replacing the empty `favicon.ico`.

---

## Implementation Plan

### Phase 1: Visual Foundation
1. Add Inter font, build semantic color system in `style.css`
2. Redesign metric cards with color accent bars + SVG icons
3. Create `useConditionTheme.ts` composable

### Phase 2: Layout & Navigation
4. Refactor `App.vue` — collapsible sidebar with `localStorage` persistence and CSS transitions
5. Mobile top app bar + slide-out drawer with dimmed overlay
6. Tablet auto-collapse at 768px

### Phase 3: Home View
7. Desktop hero — full-width condition banner with dynamic gradient
8. Mobile hero — condition banner + scrollable stats list with trend arrows
9. Redesign card grid for desktop

### Phase 4: PWA
10. Install `vite-plugin-pwa`, configure manifest + Workbox caching
11. Generate weather-themed icon set (192px, 512px)
12. Offline banner in Home view

### Phase 5: Security
13. Caddy security directives snippet (blocked routes, rate limiting, security headers, port 7000)
14. Mark public routes in Vue Router `meta.public`
