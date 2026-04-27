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
        <div class="logo-text sidebar-text">
          <span class="station-name">Buffalo Jump Ranch</span>
          <span v-if="stationCoords" class="station-coords">{{ stationCoords }}</span>
        </div>
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
      <button class="sidebar-toggle" @click="toggleSidebar"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
        <NavIcons :name="sidebarCollapsed ? 'chevron-right' : 'chevron-left'" :size="12" />
      </button>
    </nav>

    <!-- ── Mobile Top App Bar ── -->
    <header class="top-app-bar">
      <span class="text-white font-semibold text-base">Buffalo Jump Ranch</span>
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
          <span class="logo-text">Buffalo Jump Ranch</span>
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

// ── Station coordinates ──
const stationCoords = ref<string | null>(null);

const fetchStationCoords = async () => {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const data = await res.json();
    const { latitude, longitude } = data.station ?? {};
    if (latitude != null && longitude != null) {
      const lat = `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? 'N' : 'S'}`;
      const lon = `${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? 'E' : 'W'}`;
      stationCoords.value = `${lat}  ${lon}`;
    }
  } catch { /* silent */ }
};

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
  { to: '/sky',      label: "Tonight's Sky",   icon: 'star' },
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
  fetchStationCoords();
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
