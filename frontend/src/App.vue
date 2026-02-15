<template>
  <div class="container">
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
import { computed, onMounted, ref } from 'vue';
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
  const voltage = weatherStore.latestReading?.battery_voltage;
  if (!voltage) return 'N/A';

  // Convert voltage to percentage (typical range: 1.0V = 0%, 1.6V = 100%)
  const pct = Math.min(100, Math.max(0, ((voltage - 1.0) / 0.6) * 100));
  return `${pct.toFixed(0)}%`;
});

const batteryClass = computed(() => {
  const voltage = weatherStore.latestReading?.battery_voltage;
  if (!voltage) return '';

  const pct = ((voltage - 1.0) / 0.6) * 100;
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

    const data = await response.json();
    const readings = data.readings || [];

    if (readings.length === 0) return;

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

// Load stats on mount and refresh every 5 minutes
onMounted(() => {
  fetch24hStats();
  setInterval(fetch24hStats, 5 * 60 * 1000);
});
</script>

<style scoped>
/*
  This file is intentionally left blank as styles are being migrated to Tailwind CSS.
  Any remaining styles here should be considered temporary or under migration.
*/
</style>
