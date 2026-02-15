<template>
  <div class="app-container">
    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="logo">
        <h1>Weather Station</h1>
      </div>

      <!-- Station Statistics -->
      <div class="station-stats">
        <div class="stats-header">
          <span class="stats-icon">📊</span>
          <h3>Station Statistics</h3>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ stats24h.minTemp !== null ? stats24h.minTemp.toFixed(1) + '°F' : 'N/A' }}</div>
            <div class="stat-label">Min Temp</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats24h.maxTemp !== null ? stats24h.maxTemp.toFixed(1) + '°F' : 'N/A' }}</div>
            <div class="stat-label">Max Temp</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats24h.avgTemp !== null ? stats24h.avgTemp.toFixed(1) + '°F' : 'N/A' }}</div>
            <div class="stat-label">Avg Temp</div>
          </div>
          <div class="stat-item">
            <div :class="['stat-value', batteryClass]">{{ batteryStatus }}</div>
            <div class="stat-label">Outdoor Battery</div>
          </div>
        </div>
      </div>

      <!-- Navigation Menu -->
      <div class="nav-menu">
        <router-link to="/" class="nav-item" active-class="active">
          <span class="nav-icon">🏠</span>
          Dashboard
        </router-link>
        <router-link to="/graphs" class="nav-item" active-class="active">
          <span class="nav-icon">📈</span>
          Graphs & Analysis
        </router-link>
        <router-link to="/import" class="nav-item" active-class="active">
          <span class="nav-icon">📥</span>
          Import Data
        </router-link>
        <router-link to="/analysis" class="nav-item" active-class="active">
          <span class="nav-icon">🔬</span>
          Energy Analysis
        </router-link>
        <router-link to="/explorer" class="nav-item" active-class="active">
          <span class="nav-icon">🔭</span>
          Data Explorer
        </router-link>
        <router-link to="/settings" class="nav-item" active-class="active">
          <span class="nav-icon">⚙️</span>
          Settings
        </router-link>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useWeatherStore } from './stores/weather';

const weatherStore = useWeatherStore();

// 24-hour statistics
const stats24h = ref<{
  minTemp: number | null;
  maxTemp: number | null;
  avgTemp: number | null;
}>({
  minTemp: null,
  maxTemp: null,
  avgTemp: null,
});

// Battery status
const batteryStatus = computed(() => {
  const battery = weatherStore.latestReading?.outdoor_battery;
  if (battery === null || battery === undefined) return 'N/A';

  // Battery is 0-1 scale, convert to percentage
  const pct = battery * 100;
  return `${pct.toFixed(0)}%`;
});

const batteryClass = computed(() => {
  const battery = weatherStore.latestReading?.outdoor_battery;
  if (battery === null || battery === undefined) return '';

  const pct = battery * 100;
  if (pct < 20) return 'error';
  return '';
});

// Fetch 24h statistics
const fetch24hStats = async () => {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      limit: '1440', // 24h at 1 reading per minute
    });

    const response = await fetch(`/api/weather/readings?${params}`);
    if (!response.ok) return;

    const readings = await response.json();

    if (!Array.isArray(readings) || readings.length === 0) return;

    const temps = readings
      .map((r: any) => r.outdoor_temp_f)
      .filter((t: any) => t !== null && t !== undefined);

    if (temps.length > 0) {
      stats24h.value.minTemp = Math.min(...temps);
      stats24h.value.maxTemp = Math.max(...temps);
      stats24h.value.avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
    }
  } catch (err) {
    console.error('Failed to fetch 24h stats:', err);
  }
};

// Load stats and latest reading on mount
onMounted(() => {
  // Fetch latest reading for battery status
  weatherStore.fetchLatestReading();

  // Fetch 24h stats for min/max/avg
  fetch24hStats();
  setInterval(fetch24hStats, 5 * 60 * 1000);

  // Start auto-refresh for latest reading
  weatherStore.startDashboardAutoRefresh();
});

// Cleanup on unmount
onUnmounted(() => {
  weatherStore.stopDashboardAutoRefresh();
});
</script>

<style scoped>
/*
  This file is intentionally left blank as styles are being migrated to Tailwind CSS.
  Any remaining styles here should be considered temporary or under migration.
*/
</style>
