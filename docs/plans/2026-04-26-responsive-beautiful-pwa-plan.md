# WX Tools: Responsive, Beautiful, Secure PWA — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the wx-tools Vue 3 dashboard into a responsive, mobile-first, vibrant PWA safe to expose to the public internet.

**Architecture:** Collapsible sidebar (full ↔ icon-rail on desktop, slide-out drawer on mobile) with semantic per-metric color system. Home view gets a dynamic condition-gradient hero + scrollable stats list on mobile. PWA via vite-plugin-pwa + Workbox. Security enforced at Caddy reverse proxy level.

**Tech Stack:** Vue 3 + TypeScript, Tailwind CSS 4, Pinia, Vue Router, Chart.js, vite-plugin-pwa, Workbox

**Key Files:**
- `frontend/src/App.vue` — root layout (sidebar, top bar, drawer)
- `frontend/src/style.css` — all base Tailwind `@apply` classes
- `frontend/src/views/Home.vue` — primary mobile view
- `frontend/src/router/index.ts` — route meta flags
- `frontend/src/composables/useConditionTheme.ts` — new file
- `frontend/vite.config.ts` — PWA plugin config
- `frontend/index.html` — Inter font, PWA meta tags
- `frontend/public/manifest.json` — new file
- `docs/caddy-security.md` — Caddy snippet to drop in

---

## Phase 1: Visual Foundation

### Task 1: Add Inter Font

**Files:**
- Modify: `frontend/index.html`

**Step 1: Edit index.html to add Inter font**

Current `<head>` in `frontend/index.html` has only basic meta tags. Add Inter font and PWA meta before `</head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

**Step 2: Update body font in style.css**

In `frontend/src/style.css`, change the `body` rule:
```css
body {
  @apply leading-relaxed text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
```

**Step 3: Verify build still passes**

```bash
cd frontend && npm run build
```
Expected: exits 0, no TypeScript errors.

**Step 4: Commit**

```bash
git add frontend/index.html frontend/src/style.css
git commit -m "feat: add Inter font for refined typography"
```

---

### Task 2: Build Semantic Color System

**Files:**
- Modify: `frontend/src/style.css`

**Step 1: Add metric color CSS custom properties**

Add to the `@layer base` section in `frontend/src/style.css`:

```css
@layer base {
  :root {
    --color-temp: theme(colors.amber.500);
    --color-wind: theme(colors.sky.500);
    --color-rain: theme(colors.indigo.500);
    --color-uv: theme(colors.orange.500);
    --color-solar: theme(colors.yellow.500);
    --color-pressure: theme(colors.teal.500);
    --color-indoor: theme(colors.violet.500);
    --color-humidity: theme(colors.blue.500);
  }
}
```

**Step 2: Add reusable metric card classes**

Append to `frontend/src/style.css`:

```css
/* Metric card with color accent bar */
.metric-card {
  @apply relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2 overflow-hidden transition-shadow duration-200 hover:shadow-md;
}

.metric-card::before {
  content: '';
  @apply absolute left-0 top-0 bottom-0 w-1 rounded-l-xl;
}

.metric-card.temp::before    { @apply bg-amber-500; }
.metric-card.wind::before    { @apply bg-sky-500; }
.metric-card.rain::before    { @apply bg-indigo-500; }
.metric-card.uv::before      { @apply bg-orange-500; }
.metric-card.solar::before   { @apply bg-yellow-500; }
.metric-card.pressure::before { @apply bg-teal-500; }
.metric-card.indoor::before  { @apply bg-violet-500; }

.metric-icon { @apply w-6 h-6 flex-shrink-0; }
.metric-value { @apply text-3xl font-bold text-gray-900 dark:text-white leading-none; }
.metric-unit  { @apply text-sm font-medium text-gray-500 dark:text-gray-400 ml-1; }
.metric-label { @apply text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400; }
.metric-secondary { @apply text-sm text-gray-600 dark:text-gray-300; }

/* Severity badge */
.severity-badge {
  @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold;
}
.severity-badge.low    { @apply bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300; }
.severity-badge.medium { @apply bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300; }
.severity-badge.high   { @apply bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300; }
.severity-badge.extreme { @apply bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300; }
```

**Step 3: Verify build**

```bash
cd frontend && npm run build
```
Expected: exits 0.

**Step 4: Commit**

```bash
git add frontend/src/style.css
git commit -m "feat: add semantic metric color system and card classes"
```

---

### Task 3: Create useConditionTheme Composable

**Files:**
- Create: `frontend/src/composables/useConditionTheme.ts`
- Create: `frontend/src/composables/useConditionTheme.test.ts`

**Step 1: Write failing tests**

Create `frontend/src/composables/useConditionTheme.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { useConditionTheme } from './useConditionTheme';

describe('useConditionTheme', () => {
  it('returns rainy theme when rain rate > 0', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: 0.5, solar_radiation_wm2: 200 });
    expect(theme.label).toBe('Rainy');
    expect(theme.gradient).toContain('indigo');
  });

  it('returns night theme when solar < 10', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: 0, solar_radiation_wm2: 5 });
    expect(theme.label).toBe('Night');
    expect(theme.gradient).toContain('slate');
  });

  it('returns sunny theme when solar >= 400', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: 0, solar_radiation_wm2: 600 });
    expect(theme.label).toBe('Sunny');
    expect(theme.gradient).toContain('amber');
  });

  it('returns cloudy theme when solar 10-399', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: 0, solar_radiation_wm2: 150 });
    expect(theme.label).toBe('Cloudy');
    expect(theme.gradient).toContain('slate');
  });

  it('returns unknown theme when data missing', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: null, solar_radiation_wm2: null });
    expect(theme.label).toBe('Unknown');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- useConditionTheme
```
Expected: FAIL — module not found.

**Step 3: Implement the composable**

Create `frontend/src/composables/useConditionTheme.ts`:

```typescript
interface ConditionInput {
  rain_rate_in_hr: number | null;
  solar_radiation_wm2: number | null;
}

interface ConditionTheme {
  label: string;
  icon: string;
  gradient: string;       // Tailwind gradient classes for the banner
  textColor: string;      // Banner text color
  accentColor: string;    // Ring/border accent
}

export function useConditionTheme() {
  function getConditionTheme(data: ConditionInput): ConditionTheme {
    if (data.rain_rate_in_hr !== null && data.rain_rate_in_hr > 0) {
      return {
        label: 'Rainy',
        icon: '🌧️',
        gradient: 'from-indigo-700 via-violet-600 to-indigo-500',
        textColor: 'text-indigo-50',
        accentColor: 'ring-indigo-400',
      };
    }

    if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 < 10) {
      return {
        label: 'Night',
        icon: '🌙',
        gradient: 'from-slate-900 via-slate-800 to-gray-700',
        textColor: 'text-slate-100',
        accentColor: 'ring-slate-500',
      };
    }

    if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 >= 400) {
      return {
        label: 'Sunny',
        icon: '☀️',
        gradient: 'from-amber-400 via-orange-400 to-yellow-300',
        textColor: 'text-amber-950',
        accentColor: 'ring-amber-300',
      };
    }

    if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 >= 10) {
      return {
        label: 'Cloudy',
        icon: '☁️',
        gradient: 'from-slate-500 via-gray-500 to-slate-400',
        textColor: 'text-slate-50',
        accentColor: 'ring-slate-300',
      };
    }

    return {
      label: 'Unknown',
      icon: '❓',
      gradient: 'from-gray-600 to-gray-500',
      textColor: 'text-gray-100',
      accentColor: 'ring-gray-400',
    };
  }

  return { getConditionTheme };
}
```

**Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- useConditionTheme
```
Expected: 5 tests PASS.

**Step 5: Commit**

```bash
git add frontend/src/composables/useConditionTheme.ts frontend/src/composables/useConditionTheme.test.ts
git commit -m "feat: add useConditionTheme composable with condition-to-gradient mapping"
```

---

## Phase 2: Layout & Navigation

### Task 4: Sidebar Icon SVGs Component

**Files:**
- Create: `frontend/src/components/NavIcons.vue`

**Step 1: Create SVG icon component**

Replace emoji nav icons with clean SVGs. Create `frontend/src/components/NavIcons.vue`:

```vue
<template>
  <component :is="'svg'" xmlns="http://www.w3.org/2000/svg" :width="size" :height="size"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" :class="className">
    <template v-if="name === 'home'">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </template>
    <template v-else-if="name === 'graphs'">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </template>
    <template v-else-if="name === 'import'">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </template>
    <template v-else-if="name === 'analysis'">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </template>
    <template v-else-if="name === 'explorer'">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </template>
    <template v-else-if="name === 'menu'">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </template>
    <template v-else-if="name === 'chevron-left'">
      <polyline points="15 18 9 12 15 6"/>
    </template>
    <template v-else-if="name === 'chevron-right'">
      <polyline points="9 18 15 12 9 6"/>
    </template>
    <template v-else-if="name === 'x'">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </template>
    <template v-else-if="name === 'wifi-off'">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </template>
  </component>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  size?: number;
  className?: string;
}>();
</script>
```

**Step 2: Verify build**

```bash
cd frontend && npm run build
```
Expected: exits 0.

**Step 3: Commit**

```bash
git add frontend/src/components/NavIcons.vue
git commit -m "feat: add SVG nav icon component replacing emoji icons"
```

---

### Task 5: Refactor App.vue — Collapsible Sidebar

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/style.css`

**Step 1: Update style.css for collapsible sidebar**

Replace the existing `.sidebar`, `.main-content`, `.nav-item`, `.nav-icon`, and `.logo` classes in `frontend/src/style.css` with:

```css
/* ── Sidebar ── */
.sidebar {
  @apply fixed left-0 top-0 h-screen bg-gray-900 border-r border-gray-700/50 flex flex-col overflow-hidden z-30;
  transition: width 200ms ease;
}

.sidebar.expanded  { width: 256px; }
.sidebar.collapsed { width: 64px; }

/* Hide text/stats when collapsed */
.sidebar.collapsed .sidebar-text   { @apply hidden; }
.sidebar.collapsed .station-stats  { @apply hidden; }
.sidebar.collapsed .logo-text      { @apply hidden; }

.logo {
  @apply flex items-center gap-3 px-4 py-5 border-b border-gray-700/50 flex-shrink-0;
}

.logo-icon {
  @apply w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0;
}

.logo-text {
  @apply text-lg font-bold text-white truncate;
}

/* Station stats card */
.station-stats {
  @apply mx-3 my-3 p-3 bg-gray-800 rounded-xl border border-gray-700/60 flex-shrink-0;
}

.station-stats .stats-header {
  @apply flex items-center gap-2 mb-3;
}

.station-stats .stats-header h3 {
  @apply text-xs uppercase text-gray-400 font-semibold tracking-wider m-0;
}

/* Live status dot */
.status-dot {
  @apply w-2 h-2 rounded-full bg-green-400 flex-shrink-0;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.8); }
}

.station-stats .stats-grid {
  @apply grid grid-cols-2 gap-2;
}

.station-stats .stat-item {
  @apply text-center p-2 bg-gray-900/60 rounded-lg;
}

.station-stats .stat-value {
  @apply text-sm font-bold text-sky-400 leading-tight;
}

.station-stats .stat-value.error {
  @apply text-red-400;
}

.station-stats .stat-label {
  @apply text-xs text-gray-500 uppercase tracking-tight font-medium;
}

/* Nav items */
.nav-menu {
  @apply flex flex-col flex-1 overflow-y-auto py-2;
}

.nav-item {
  @apply flex items-center gap-3 py-2.5 px-4 text-gray-400 no-underline transition-all duration-150 rounded-lg mx-2 my-0.5;
}

.sidebar.collapsed .nav-item {
  @apply justify-center px-0 mx-2;
}

.nav-item:hover {
  @apply bg-gray-800 text-white;
}

.nav-item.active {
  @apply bg-gray-800 text-white font-semibold;
}

.nav-item.active svg {
  @apply text-sky-400;
}

/* Collapse toggle button */
.sidebar-toggle {
  @apply absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-600 transition-colors cursor-pointer z-40;
}

/* ── Main Content ── */
.main-content {
  @apply flex-1 overflow-y-auto;
  transition: margin-left 200ms ease;
}

.main-content.sidebar-expanded  { margin-left: 256px; }
.main-content.sidebar-collapsed { margin-left: 64px; }

/* Mobile: no sidebar offset */
@media (max-width: 767px) {
  .main-content.sidebar-expanded,
  .main-content.sidebar-collapsed {
    margin-left: 0;
    margin-top: 56px; /* top app bar height */
  }
}

/* ── Mobile Top App Bar ── */
.top-app-bar {
  @apply fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-700/50 flex items-center justify-between px-4 z-40 md:hidden;
}

/* ── Mobile Drawer Overlay ── */
.drawer-overlay {
  @apply fixed inset-0 bg-black/60 z-40 md:hidden;
}

.mobile-drawer {
  @apply fixed top-0 left-0 h-full w-72 bg-gray-900 z-50 flex flex-col md:hidden;
  transition: transform 200ms ease;
}

.mobile-drawer.open   { transform: translateX(0); }
.mobile-drawer.closed { transform: translateX(-100%); }
```

**Step 2: Rewrite App.vue template and script**

Replace `frontend/src/App.vue` entirely:

```vue
<template>
  <div class="app-container">

    <!-- ── Desktop Sidebar ── -->
    <nav :class="['sidebar hidden md:flex flex-col', sidebarCollapsed ? 'collapsed' : 'expanded']">
      <!-- Logo -->
      <div class="logo">
        <div class="logo-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
          </svg>
        </div>
        <span class="logo-text sidebar-text">WX Station</span>
      </div>

      <!-- Station Statistics -->
      <div class="station-stats sidebar-text">
        <div class="stats-header">
          <div class="status-dot"></div>
          <h3>24h Station Stats</h3>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ stats24h.minTemp !== null ? stats24h.minTemp.toFixed(1) + '°' : '--' }}</div>
            <div class="stat-label">Min Temp</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats24h.maxTemp !== null ? stats24h.maxTemp.toFixed(1) + '°' : '--' }}</div>
            <div class="stat-label">Max Temp</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats24h.avgTemp !== null ? stats24h.avgTemp.toFixed(1) + '°' : '--' }}</div>
            <div class="stat-label">Avg Temp</div>
          </div>
          <div class="stat-item">
            <div :class="['stat-value', batteryClass]">{{ batteryStatus }}</div>
            <div class="stat-label">Battery</div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="nav-menu">
        <router-link v-for="link in navLinks" :key="link.to"
          :to="link.to" class="nav-item" active-class="active"
          :title="sidebarCollapsed ? link.label : undefined">
          <NavIcons :name="link.icon" :size="20" />
          <span class="sidebar-text text-sm">{{ link.label }}</span>
        </router-link>
      </nav>

      <!-- Collapse toggle -->
      <button class="sidebar-toggle" @click="toggleSidebar" :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
        <NavIcons :name="sidebarCollapsed ? 'chevron-right' : 'chevron-left'" :size="12" />
      </button>
    </nav>

    <!-- ── Mobile Top App Bar ── -->
    <header class="top-app-bar">
      <span class="text-white font-semibold text-base">WX Station</span>
      <button @click="drawerOpen = true" class="text-gray-300 hover:text-white p-1" aria-label="Open menu">
        <NavIcons name="menu" :size="24" />
      </button>
    </header>

    <!-- ── Mobile Drawer ── -->
    <Transition name="fade">
      <div v-if="drawerOpen" class="drawer-overlay" @click="drawerOpen = false" />
    </Transition>

    <div :class="['mobile-drawer', drawerOpen ? 'open' : 'closed']">
      <div class="logo border-b border-gray-700/50 justify-between">
        <div class="flex items-center gap-3">
          <div class="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
          </div>
          <span class="logo-text">WX Station</span>
        </div>
        <button @click="drawerOpen = false" class="text-gray-400 hover:text-white">
          <NavIcons name="x" :size="20" />
        </button>
      </div>

      <!-- Station stats in drawer -->
      <div class="station-stats mx-3 my-3">
        <div class="stats-header">
          <div class="status-dot"></div>
          <h3>24h Station Stats</h3>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ stats24h.minTemp !== null ? stats24h.minTemp.toFixed(1) + '°' : '--' }}</div>
            <div class="stat-label">Min</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats24h.maxTemp !== null ? stats24h.maxTemp.toFixed(1) + '°' : '--' }}</div>
            <div class="stat-label">Max</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats24h.avgTemp !== null ? stats24h.avgTemp.toFixed(1) + '°' : '--' }}</div>
            <div class="stat-label">Avg</div>
          </div>
          <div class="stat-item">
            <div :class="['stat-value', batteryClass]">{{ batteryStatus }}</div>
            <div class="stat-label">Battery</div>
          </div>
        </div>
      </div>

      <nav class="nav-menu">
        <router-link v-for="link in navLinks" :key="link.to"
          :to="link.to" class="nav-item" active-class="active"
          @click="drawerOpen = false">
          <NavIcons :name="link.icon" :size="20" />
          <span class="text-sm">{{ link.label }}</span>
        </router-link>
      </nav>
    </div>

    <!-- ── Main Content ── -->
    <main :class="['main-content', sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded']">
      <router-view />
    </main>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useWeatherStore } from './stores/weather';
import NavIcons from './components/NavIcons.vue';

const weatherStore = useWeatherStore();

// ── Sidebar state ──
const STORAGE_KEY = 'wx-sidebar-collapsed';
const sidebarCollapsed = ref(localStorage.getItem(STORAGE_KEY) === 'true');
const drawerOpen = ref(false);

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem(STORAGE_KEY, String(sidebarCollapsed.value));
}

// ── Nav links ──
const navLinks = [
  { to: '/',         label: 'Dashboard',       icon: 'home' },
  { to: '/graphs',   label: 'Graphs',          icon: 'graphs' },
  { to: '/import',   label: 'Import Data',     icon: 'import' },
  { to: '/analysis', label: 'Energy Analysis', icon: 'analysis' },
  { to: '/explorer', label: 'Data Explorer',   icon: 'explorer' },
  { to: '/settings', label: 'Settings',        icon: 'settings' },
];

// ── 24h statistics ──
const stats24h = ref<{ minTemp: number | null; maxTemp: number | null; avgTemp: number | null }>({
  minTemp: null, maxTemp: null, avgTemp: null,
});

const batteryStatus = computed(() => {
  const battery = weatherStore.latestReading?.outdoor_battery;
  if (battery === null || battery === undefined) return 'N/A';
  return `${(battery * 100).toFixed(0)}%`;
});

const batteryClass = computed(() => {
  const battery = weatherStore.latestReading?.outdoor_battery;
  if (battery === null || battery === undefined) return '';
  return battery * 100 < 20 ? 'error' : '';
});

const fetch24hStats = async () => {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString(), limit: '1440' });
    const response = await fetch(`/api/weather/readings?${params}`);
    if (!response.ok) return;
    const readings = await response.json();
    if (!Array.isArray(readings) || readings.length === 0) return;
    const temps = readings.map((r: any) => r.outdoor_temp_f).filter((t: any) => t !== null && t !== undefined);
    if (temps.length > 0) {
      stats24h.value.minTemp = Math.min(...temps);
      stats24h.value.maxTemp = Math.max(...temps);
      stats24h.value.avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
    }
  } catch (err) {
    console.error('Failed to fetch 24h stats:', err);
  }
};

let statsInterval: ReturnType<typeof setInterval>;

onMounted(() => {
  weatherStore.fetchLatestReading();
  fetch24hStats();
  statsInterval = setInterval(fetch24hStats, 5 * 60 * 1000);
  weatherStore.startDashboardAutoRefresh();
});

onUnmounted(() => {
  clearInterval(statsInterval);
  weatherStore.stopDashboardAutoRefresh();
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 150ms ease; }
.fade-enter-from, .fade-leave-to      { opacity: 0; }
</style>
```

**Step 3: Verify build**

```bash
cd frontend && npm run build
```
Expected: exits 0.

**Step 4: Commit**

```bash
git add frontend/src/App.vue frontend/src/style.css
git commit -m "feat: collapsible sidebar with icon-rail, mobile drawer, dark nav"
```

---

## Phase 3: Home View Redesign

### Task 6: Redesign Home View

**Files:**
- Modify: `frontend/src/views/Home.vue`

This is a full replacement of the Home view template. The script logic (chart init, computeds) is preserved — only the template and styling change.

**Step 1: Replace Home.vue template**

Replace everything in `frontend/src/views/Home.vue` with the following. Keep the entire `<script setup>` section unchanged (lines 249–615 of the original). Only the `<template>` block changes:

```vue
<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">

    <!-- Offline banner -->
    <div v-if="isOffline"
      class="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm">
      <NavIcons name="wifi-off" :size="16" />
      <span>Offline — showing last reading from {{ formattedLastUpdated }}</span>
    </div>

    <!-- ── Condition Banner (full width) ── -->
    <div v-if="weatherStore.latestReading"
      :class="['bg-gradient-to-br w-full px-6 py-8 md:py-10', conditionTheme.gradient]">
      <div class="max-w-7xl mx-auto">
        <!-- Mobile: stacked, Desktop: side by side -->
        <div class="flex flex-col md:flex-row md:items-center md:gap-10">

          <!-- Left: main condition -->
          <div :class="['flex items-center gap-5 mb-6 md:mb-0', conditionTheme.textColor]">
            <span class="text-6xl md:text-7xl select-none">{{ weatherCondition.icon }}</span>
            <div>
              <div class="text-4xl md:text-6xl font-extrabold leading-none tracking-tight">
                {{ Math.round(weatherStore.latestReading.outdoor_temp_f) }}<span class="text-2xl md:text-3xl font-semibold align-top mt-1 inline-block">°F</span>
              </div>
              <div class="text-lg font-semibold mt-1 opacity-90">{{ weatherCondition.condition }}</div>
              <div class="text-sm opacity-70 mt-0.5">
                Feels like {{ Math.round(weatherStore.latestReading.feels_like_f) }}°F · {{ formattedLastUpdated }}
              </div>
            </div>
          </div>

          <!-- Right: quick stats row (hidden on mobile — they're in the list below) -->
          <div :class="['hidden md:grid grid-cols-3 gap-6 flex-1 md:border-l md:pl-10 md:border-white/20', conditionTheme.textColor]">
            <div class="flex flex-col">
              <span class="text-xs uppercase tracking-widest opacity-70 font-semibold">Humidity</span>
              <span class="text-2xl font-bold">{{ weatherStore.latestReading.humidity_pct }}%</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs uppercase tracking-widest opacity-70 font-semibold">Wind</span>
              <span class="text-2xl font-bold">
                {{ weatherStore.latestReading?.wind_speed_mph != null ? weatherStore.latestReading.wind_speed_mph.toFixed(1) : '--' }} mph
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs uppercase tracking-widest opacity-70 font-semibold">Pressure</span>
              <span class="text-2xl font-bold">
                {{ weatherStore.latestReading?.relative_pressure_inhg != null ? weatherStore.latestReading.relative_pressure_inhg.toFixed(2) : '--' }} inHg
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading / error states -->
    <div v-else-if="weatherStore.isLoading" class="p-10 text-center text-gray-500 dark:text-gray-400">
      Loading current conditions…
    </div>
    <div v-else-if="weatherStore.error" class="p-10 text-center text-red-500">
      Error: {{ weatherStore.error.message }}
    </div>
    <div v-else class="p-10 text-center text-gray-500 dark:text-gray-400">
      No weather data available.
    </div>

    <div class="max-w-7xl mx-auto px-4 py-6">

      <!-- ── Mobile: Scrollable Stats List ── -->
      <div class="md:hidden space-y-2 mb-6">
        <h2 class="text-sm uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-3">All Readings</h2>

        <!-- Outdoor Temp -->
        <div class="metric-card temp flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-amber-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Outdoor Temp</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.outdoor_temp_f) : '--' }}</span>
              <span class="metric-unit">°F</span>
            </div>
          </div>
          <div class="text-right pr-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">Feels like</div>
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.feels_like_f) : '--' }}°F
            </div>
          </div>
          <span :class="['text-lg font-bold', tempTrendColor]">{{ tempTrendArrow }}</span>
        </div>

        <!-- Indoor Temp -->
        <div class="metric-card indoor flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-violet-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Indoor</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.indoor_temp_f) : '--' }}</span>
              <span class="metric-unit">°F</span>
            </div>
          </div>
          <div class="text-right pr-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">Humidity</div>
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {{ weatherStore.latestReading ? weatherStore.latestReading.indoor_humidity_pct : '--' }}%
            </div>
          </div>
        </div>

        <!-- Wind -->
        <div class="metric-card wind flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-sky-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Wind</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.wind_speed_mph != null ? weatherStore.latestReading.wind_speed_mph.toFixed(1) : '--' }}</span>
              <span class="metric-unit">mph</span>
            </div>
          </div>
          <div class="text-right pr-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">{{ windDirectionFormatted }}</div>
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Gust: {{ weatherStore.latestReading?.wind_gust_mph != null ? weatherStore.latestReading.wind_gust_mph.toFixed(1) : '--' }} mph
            </div>
          </div>
          <span :class="['severity-badge', windSeverity]">{{ windLabel }}</span>
        </div>

        <!-- Rain -->
        <div class="metric-card rain flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-indigo-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
            <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
            <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
            <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Rainfall</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.daily_rain_in != null ? weatherStore.latestReading.daily_rain_in.toFixed(2) : '--' }}</span>
              <span class="metric-unit">in today</span>
            </div>
          </div>
          <div class="text-right pr-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">Rate</div>
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {{ weatherStore.latestReading?.rain_rate_in_hr != null ? weatherStore.latestReading.rain_rate_in_hr.toFixed(2) : '--' }} in/hr
            </div>
          </div>
        </div>

        <!-- Humidity -->
        <div class="metric-card flex-row items-center gap-4 pl-5" style="--accent: theme(colors.blue.500)">
          <svg class="metric-icon text-blue-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Humidity</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading ? weatherStore.latestReading.humidity_pct : '--' }}</span>
              <span class="metric-unit">%</span>
            </div>
          </div>
          <style scoped>
            /* Blue accent for humidity card */
            .metric-card:has(.text-blue-500)::before { background-color: theme(colors.blue.500); }
          </style>
        </div>

        <!-- Pressure -->
        <div class="metric-card pressure flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-teal-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Pressure</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.relative_pressure_inhg != null ? weatherStore.latestReading.relative_pressure_inhg.toFixed(2) : '--' }}</span>
              <span class="metric-unit">inHg</span>
            </div>
          </div>
          <span :class="['font-semibold text-sm', pressureTrend.color]">{{ pressureTrend.icon }} {{ pressureTrend.text }}</span>
        </div>

        <!-- UV Index -->
        <div class="metric-card uv flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-orange-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">UV Index</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.uv_index != null ? weatherStore.latestReading.uv_index.toFixed(1) : '--' }}</span>
            </div>
          </div>
          <span :class="['severity-badge', uvSeverityClass]">{{ uvLabel }}</span>
        </div>

        <!-- Solar Radiation -->
        <div class="metric-card solar flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-yellow-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Solar Radiation</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.solar_radiation_wm2 != null ? weatherStore.latestReading.solar_radiation_wm2.toFixed(0) : '--' }}</span>
              <span class="metric-unit">W/m²</span>
            </div>
          </div>
          <div class="h-8 w-24">
            <canvas id="solar-uv-sparkline" ref="solarSparklineRef" class="w-full h-full"></canvas>
          </div>
        </div>
      </div>

      <!-- ── Desktop: Card Grid ── -->
      <div class="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

        <!-- Outdoor Temp Card -->
        <div class="metric-card temp">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
            </svg>
            <span class="metric-label">Outdoor Temp</span>
            <span :class="['ml-auto font-bold', tempTrendColor]">{{ tempTrendArrow }}</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.outdoor_temp_f) : '--' }}</span>
            <span class="metric-unit">°F</span>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div>
              <div class="metric-label">Humidity</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading ? weatherStore.latestReading.humidity_pct : '--' }}%</div>
            </div>
            <div>
              <div class="metric-label">Feels Like</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.feels_like_f) : '--' }}°F</div>
            </div>
          </div>
          <router-link to="/graphs" class="mt-auto pt-2 text-amber-500 hover:text-amber-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Indoor Card -->
        <div class="metric-card indoor">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-violet-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span class="metric-label">Indoor</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.indoor_temp_f) : '--' }}</span>
            <span class="metric-unit">°F</span>
          </div>
          <div class="mt-2">
            <div class="metric-label">Humidity</div>
            <div class="metric-secondary font-semibold text-xl">{{ weatherStore.latestReading ? weatherStore.latestReading.indoor_humidity_pct : '--' }}%</div>
          </div>
          <router-link to="/graphs" class="mt-auto pt-2 text-violet-500 hover:text-violet-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Wind Card -->
        <div class="metric-card wind">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-sky-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
            </svg>
            <span class="metric-label">Wind</span>
            <span :class="['ml-auto severity-badge', windSeverity]">{{ windLabel }}</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading?.wind_speed_mph != null ? weatherStore.latestReading.wind_speed_mph.toFixed(1) : '--' }}</span>
            <span class="metric-unit">mph</span>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div>
              <div class="metric-label">From</div>
              <div class="metric-secondary font-semibold">{{ windDirectionFormatted }}</div>
            </div>
            <div>
              <div class="metric-label">Gusts</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading?.wind_gust_mph != null ? weatherStore.latestReading.wind_gust_mph.toFixed(1) : '--' }} mph</div>
            </div>
          </div>
          <canvas id="wind-rose" ref="windRoseRef" class="w-full h-28 mt-2"></canvas>
          <router-link to="/graphs" class="mt-auto pt-1 text-sky-500 hover:text-sky-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Rainfall Card -->
        <div class="metric-card rain">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
              <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
              <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
              <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
            </svg>
            <span class="metric-label">Rainfall</span>
          </div>
          <div class="flex justify-around items-end h-20 mb-2">
            <div class="flex flex-col items-center gap-1">
              <div class="w-7 rounded-t-full overflow-hidden flex-1 flex flex-col justify-end" style="min-height: 8px;">
                <div :class="['rounded-t-full', (weatherStore.latestReading?.daily_rain_in ?? 0) > 0 ? 'bg-indigo-500' : 'bg-indigo-200 dark:bg-indigo-900']" style="height: 100%"></div>
              </div>
              <span class="text-xs font-semibold">{{ weatherStore.latestReading?.daily_rain_in != null ? weatherStore.latestReading.daily_rain_in.toFixed(2) : '--' }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Today</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-7 rounded-t-full overflow-hidden flex-1 flex flex-col justify-end" style="min-height: 8px;">
                <div :class="['rounded-t-full', (weatherStore.latestReading?.weekly_rain_in ?? 0) > 0 ? 'bg-indigo-400' : 'bg-indigo-200 dark:bg-indigo-900']" style="height: 100%"></div>
              </div>
              <span class="text-xs font-semibold">{{ weatherStore.latestReading?.weekly_rain_in != null ? weatherStore.latestReading.weekly_rain_in.toFixed(2) : '--' }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Week</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-7 rounded-t-full overflow-hidden flex-1 flex flex-col justify-end" style="min-height: 8px;">
                <div :class="['rounded-t-full', (weatherStore.latestReading?.monthly_rain_in ?? 0) > 0 ? 'bg-indigo-300' : 'bg-indigo-200 dark:bg-indigo-900']" style="height: 100%"></div>
              </div>
              <span class="text-xs font-semibold">{{ weatherStore.latestReading?.monthly_rain_in != null ? weatherStore.latestReading.monthly_rain_in.toFixed(2) : '--' }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Month</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-1">
            <div>
              <div class="metric-label">Rate</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading?.rain_rate_in_hr != null ? weatherStore.latestReading.rain_rate_in_hr.toFixed(2) : '--' }} in/hr</div>
            </div>
            <div>
              <div class="metric-label">Event</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading?.event_rain_in ? weatherStore.latestReading.event_rain_in.toFixed(2) : '--' }} in</div>
            </div>
          </div>
          <router-link to="/graphs" class="mt-auto pt-2 text-indigo-500 hover:text-indigo-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Pressure Card -->
        <div class="metric-card pressure">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-teal-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span class="metric-label">Pressure</span>
            <span :class="['ml-auto text-sm font-semibold', pressureTrend.color]">{{ pressureTrend.icon }} {{ pressureTrend.text }}</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading?.relative_pressure_inhg != null ? weatherStore.latestReading.relative_pressure_inhg.toFixed(2) : '--' }}</span>
            <span class="metric-unit">inHg</span>
          </div>
          <div class="mt-2">
            <div class="metric-label">Absolute</div>
            <div class="metric-secondary font-semibold">{{ weatherStore.latestReading?.absolute_pressure_inhg != null ? weatherStore.latestReading.absolute_pressure_inhg.toFixed(2) : '--' }} inHg</div>
          </div>
          <router-link to="/graphs" class="mt-auto pt-2 text-teal-500 hover:text-teal-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Solar & UV Card -->
        <div class="metric-card solar">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <span class="metric-label">Solar & UV</span>
            <span :class="['ml-auto severity-badge', uvSeverityClass]">{{ uvLabel }}</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading?.solar_radiation_wm2 != null ? weatherStore.latestReading.solar_radiation_wm2.toFixed(0) : '--' }}</span>
            <span class="metric-unit">W/m²</span>
          </div>
          <div class="mt-2">
            <div class="metric-label">UV Index</div>
            <div class="metric-secondary font-semibold">{{ uvIndexFormatted }}</div>
          </div>
          <div class="h-8 mt-2">
            <canvas id="solar-uv-sparkline" ref="solarSparklineRef" class="w-full h-full"></canvas>
          </div>
          <router-link to="/graphs" class="mt-auto pt-1 text-yellow-500 hover:text-yellow-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

      </div>
    </div>
  </div>
</template>
```

**Step 2: Add new computed properties to the script section**

At the end of the existing `<script setup>` block (before the closing `</script>`), add:

```typescript
import NavIcons from '../components/NavIcons.vue';
import { useConditionTheme } from '../composables/useConditionTheme';

const { getConditionTheme } = useConditionTheme();

// Online/offline detection
const isOffline = ref(!navigator.onLine);
window.addEventListener('online',  () => { isOffline.value = false; });
window.addEventListener('offline', () => { isOffline.value = true; });

// Condition theme for the banner gradient
const conditionTheme = computed(() => {
  const data = weatherStore.latestReading;
  if (!data) return getConditionTheme({ rain_rate_in_hr: null, solar_radiation_wm2: null });
  return getConditionTheme({
    rain_rate_in_hr: data.rain_rate_in_hr,
    solar_radiation_wm2: data.solar_radiation_wm2,
  });
});

// Temperature trend arrow
const tempTrendArrow = computed(() => {
  if (tempFromYesterday.value === null) return '→';
  if (tempFromYesterday.value > 1) return '↑';
  if (tempFromYesterday.value < -1) return '↓';
  return '→';
});

const tempTrendColor = computed(() => {
  if (tempFromYesterday.value === null) return 'text-gray-400';
  if (tempFromYesterday.value > 1) return 'text-red-500';
  if (tempFromYesterday.value < -1) return 'text-sky-500';
  return 'text-gray-400';
});

// Wind severity badge
const windSeverity = computed(() => {
  const mph = weatherStore.latestReading?.wind_speed_mph ?? 0;
  if (mph >= 25) return 'high';
  if (mph >= 15) return 'medium';
  return 'low';
});

const windLabel = computed(() => {
  const mph = weatherStore.latestReading?.wind_speed_mph ?? 0;
  if (mph >= 25) return 'Strong';
  if (mph >= 15) return 'Breezy';
  return 'Calm';
});

// UV severity badge
const uvSeverityClass = computed(() => {
  const uv = weatherStore.latestReading?.uv_index ?? 0;
  if (uv >= 11) return 'extreme';
  if (uv >= 8)  return 'high';
  if (uv >= 3)  return 'medium';
  return 'low';
});

const uvLabel = computed(() => {
  const uv = weatherStore.latestReading?.uv_index ?? 0;
  if (uv >= 11) return 'Extreme';
  if (uv >= 8)  return 'Very High';
  if (uv >= 6)  return 'High';
  if (uv >= 3)  return 'Moderate';
  return 'Low';
});
```

**Step 3: Verify build**

```bash
cd frontend && npm run build
```
Expected: exits 0, no TypeScript errors.

**Step 4: Run all tests**

```bash
cd frontend && npm test
```
Expected: all existing tests pass.

**Step 5: Commit**

```bash
git add frontend/src/views/Home.vue
git commit -m "feat: redesign Home view with condition banner, metric cards, mobile stats list"
```

---

## Phase 4: PWA Setup

### Task 7: Install and Configure vite-plugin-pwa

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/public/manifest.json`

**Step 1: Install vite-plugin-pwa**

```bash
cd frontend && npm install -D vite-plugin-pwa
```
Expected: package added to devDependencies.

**Step 2: Create public/manifest.json**

Create `frontend/public/manifest.json`:

```json
{
  "name": "WX Station",
  "short_name": "WX",
  "description": "Personal weather station dashboard",
  "theme_color": "#111827",
  "background_color": "#111827",
  "display": "standalone",
  "orientation": "portrait-primary",
  "start_url": "/",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/wx-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/wx-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Step 3: Update vite.config.ts**

Replace `frontend/vite.config.ts` with:

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we use our own public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/weather\/current/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-current',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 1, maxAgeSeconds: 600 },
            },
          },
          {
            urlPattern: /^\/api\/weather\/readings/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-readings',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 10, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

**Step 4: Add PWA meta tags to index.html**

In `frontend/index.html`, add inside `<head>` after the existing viewport meta:

```html
<link rel="manifest" href="/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="WX Station">
<meta name="theme-color" content="#111827">
```

**Step 5: Verify build**

```bash
cd frontend && npm run build
```
Expected: exits 0. The dist folder should contain `sw.js` and `workbox-*.js`.

**Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/public/manifest.json frontend/index.html
git commit -m "feat: add PWA support with service worker and offline caching"
```

---

### Task 8: Generate PWA Icons

**Files:**
- Create: `frontend/public/icons/wx-192.png`
- Create: `frontend/public/icons/wx-512.png`
- Create: `frontend/public/icons/generate-icons.sh`

**Step 1: Check if ImageMagick or rsvg-convert is available**

```bash
which convert 2>/dev/null || which rsvg-convert 2>/dev/null || echo "need to install"
```

**Step 2: Create the source SVG icon**

Create `frontend/public/icons/wx-icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="22" fill="#111827"/>
  <!-- Cloud -->
  <path d="M68 58H35a14 14 0 1 1 13.4-18H68a10 10 0 0 1 0 18Z"
    fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Rain drops -->
  <line x1="40" y1="66" x2="40" y2="72" stroke="#6366f1" stroke-width="4" stroke-linecap="round"/>
  <line x1="52" y1="70" x2="52" y2="76" stroke="#6366f1" stroke-width="4" stroke-linecap="round"/>
  <line x1="64" y1="66" x2="64" y2="72" stroke="#6366f1" stroke-width="4" stroke-linecap="round"/>
</svg>
```

**Step 3: Generate PNGs using ImageMagick (if available)**

```bash
cd frontend/public/icons
convert -background none wx-icon.svg -resize 192x192 wx-192.png
convert -background none wx-icon.svg -resize 512x512 wx-512.png
```

If ImageMagick is not available, use Node.js canvas or manually create simple PNG icons. As a fallback, copy the SVG and reference it in manifest.json with `"type": "image/svg+xml"` — most modern browsers accept SVG icons.

**Step 4: Update manifest.json if using SVG fallback**

If PNG generation fails, update `frontend/public/manifest.json` icons to:

```json
"icons": [
  {
    "src": "/icons/wx-icon.svg",
    "sizes": "any",
    "type": "image/svg+xml",
    "purpose": "any maskable"
  }
]
```

**Step 5: Verify build**

```bash
cd frontend && npm run build
```

**Step 6: Commit**

```bash
git add frontend/public/icons/
git commit -m "feat: add weather-themed PWA icons"
```

---

## Phase 5: Security

### Task 9: Caddy Security Configuration

**Files:**
- Create: `docs/caddy-security.md`

**Step 1: Create Caddy security snippet doc**

Create `docs/caddy-security.md`:

````markdown
# Caddy Security Configuration

Drop these blocks into your existing Caddyfile. The app runs on `localhost:7000`.
Replace `yourdomain.com` with your actual domain.

```caddy
yourdomain.com {

    # Block admin routes — accessible locally only
    @admin path /import* /analysis* /explorer* /settings*
    respond @admin 403

    # Block all write API methods
    @writes method POST PUT DELETE PATCH
    respond @writes 403

    # Block FastAPI auto-generated docs
    respond /docs* 403
    respond /redoc* 403
    respond /openapi.json 403

    # Security headers
    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; connect-src 'self'"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        -Server
    }

    # Rate limit public API endpoints
    @publicapi path /api/weather/*
    rate_limit @publicapi {
        zone wx_public {
            key {remote_host}
            events 30
            window 1m
        }
    }

    reverse_proxy localhost:7000
}
```

## Local Admin Access

Access the full app directly at `http://localhost:7000` (or your LAN IP).
Caddy only fronts the public-facing port — bypass it entirely for admin work.

## Vue Router Route Flags

Public routes are marked with `meta.public = true` in `frontend/src/router/index.ts`
for documentation purposes. Real access control is enforced here at Caddy, not the client.
````

**Step 2: Update Vue Router with public meta flags**

Modify `frontend/src/router/index.ts`:

```typescript
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { public: true },
  },
  {
    path: '/graphs',
    name: 'Graphs',
    component: Graphs,
    meta: { public: false },
  },
  {
    path: '/import',
    name: 'ImportData',
    component: ImportData,
    meta: { public: false },
  },
  {
    path: '/analysis',
    name: 'EnergyAnalysis',
    component: EnergyAnalysis,
    meta: { public: false },
  },
  {
    path: '/explorer',
    name: 'DataExplorer',
    component: DataExplorer,
    meta: { public: false },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { public: false },
  },
];
```

**Step 3: Verify build**

```bash
cd frontend && npm run build
```
Expected: exits 0.

**Step 4: Commit**

```bash
git add docs/caddy-security.md frontend/src/router/index.ts
git commit -m "feat: add Caddy security config and Vue Router public meta flags"
```

---

## Final Verification

**Step 1: Full test suite**

```bash
cd frontend && npm test
```
Expected: all tests pass.

**Step 2: Production build**

```bash
cd frontend && npm run build
```
Expected: exits 0, `dist/` contains `sw.js`.

**Step 3: Check bundle**

```bash
ls frontend/dist/assets/ && ls frontend/dist/
```
Expected: `index.html`, `sw.js`, `workbox-*.js`, and hashed JS/CSS assets.

**Step 4: Rebuild static assets for FastAPI**

```bash
cp -r frontend/dist/* static/
```

**Step 5: Smoke test the app**

Start the dev server: `cd frontend && npm run dev`

Verify:
- [ ] Desktop: sidebar collapses to icon-rail on click, expands back
- [ ] Desktop: preference persists after page refresh
- [ ] Mobile (resize to <768px): top app bar visible, sidebar hidden
- [ ] Mobile: hamburger opens drawer, nav link closes it
- [ ] Home: condition banner shows with gradient background
- [ ] Home mobile: scrollable stats list visible (hide card grid)
- [ ] Home desktop: card grid with color accent bars
- [ ] Inter font loaded (check in DevTools → Network → Fonts)
- [ ] PWA manifest: DevTools → Application → Manifest shows WX Station

---

**Plan complete and saved to `docs/plans/2026-04-26-responsive-beautiful-pwa-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open a new session, reference this plan with `superpowers:executing-plans`, batch execution with checkpoints

**Which approach?**
