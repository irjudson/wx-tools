<template>
  <div class="min-h-screen bg-gray-950 text-white p-4 md:p-6 space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight">Tonight's Sky</h1>
      <span class="text-xs text-gray-500">{{ dateLabel }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16 text-gray-500">
      <span class="text-sm">Loading forecast…</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
      {{ error }}
    </div>

    <template v-else-if="forecast">

      <!-- Suitability banner -->
      <div :class="['rounded-xl p-5 border', suitabilityStyle.bg, suitabilityStyle.border]">
        <div class="flex items-center justify-between mb-1">
          <span class="text-2xl font-extrabold capitalize">{{ forecast.suitability }}</span>
          <span class="text-3xl">{{ suitabilityStyle.icon }}</span>
        </div>
        <div class="text-sm opacity-70">Overall observing score: {{ Math.round(forecast.score * 100) }}%</div>
        <ul v-if="forecast.issues.length" class="mt-2 space-y-0.5">
          <li v-for="issue in forecast.issues" :key="issue" class="text-xs opacity-60">⚠ {{ issue }}</li>
        </ul>
      </div>

      <!-- Info cards row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <!-- Moon card -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Moon</div>
          <div class="text-3xl mb-1">{{ moonEmoji }}</div>
          <div class="text-base font-semibold">{{ forecast.moon.phase }}</div>
          <div class="text-sm text-gray-400 mt-1">{{ forecast.moon.illumination_pct.toFixed(0) }}% illuminated</div>
          <div v-if="forecast.moon.interfering" class="mt-2 text-xs text-amber-400">
            Bright moon may wash out faint objects
          </div>
          <div v-else class="mt-2 text-xs text-green-400">Low moon interference</div>
        </div>

        <!-- Sky quality card -->
        <div v-if="forecast.sky_quality" class="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sky Quality</div>
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-3xl font-extrabold">{{ forecast.sky_quality.bortle_class }}</span>
            <span class="text-xs text-gray-400">/ 9 Bortle</span>
          </div>
          <div class="text-sm font-medium">{{ forecast.sky_quality.bortle_name }}</div>
          <div class="text-xs text-gray-400 mt-1">Limiting mag {{ forecast.sky_quality.limiting_magnitude.toFixed(1) }}</div>
          <div class="text-xs text-gray-400">Milky Way: {{ forecast.sky_quality.milky_way_visibility }}</div>
          <div v-if="forecast.sky_quality.source === 'estimated'" class="text-xs text-gray-600 mt-2">estimated</div>
        </div>

        <!-- Local conditions card -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Local Conditions</div>
          <template v-if="weatherStore.latestReading">
            <div class="text-3xl font-extrabold mb-1">
              {{ Math.round(weatherStore.latestReading.outdoor_temp_f) }}<span class="text-lg font-semibold">°F</span>
            </div>
            <div class="text-sm text-gray-400">{{ weatherStore.latestReading.humidity_pct }}% humidity</div>
            <div class="text-sm text-gray-400">{{ weatherStore.latestReading.wind_speed_mph?.toFixed(1) }} mph wind</div>
            <div v-if="weatherStore.latestReading.uv_index != null" class="text-sm text-gray-400">
              UV {{ weatherStore.latestReading.uv_index }}
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-gray-600">No station data</p>
          </template>
        </div>

      </div>

      <!-- Hourly forecast strip -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">12-Hour Forecast</div>
        <div class="grid gap-2" :style="`grid-template-columns: repeat(${forecast.forecast.length}, minmax(0, 1fr))`">
          <div
            v-for="h in forecast.forecast"
            :key="h.hour"
            class="flex flex-col items-center gap-1"
          >
            <span class="text-xs text-gray-500">{{ hourLabel(h.hour) }}</span>
            <span class="text-lg">{{ cloudEmoji(h.cloud_cover) }}</span>
            <div class="w-full bg-gray-800 rounded-full h-1.5">
              <div
                class="h-1.5 rounded-full transition-all"
                :class="scoreBarColor(h.score)"
                :style="`width: ${h.score * 100}%`"
              ></div>
            </div>
            <span class="text-xs font-semibold" :class="scoreTextColor(h.score)">
              {{ Math.round(h.score * 100) }}%
            </span>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWeatherStore } from '../stores/weather';

const weatherStore = useWeatherStore();

const loading = ref(true);
const error = ref<string | null>(null);
const forecast = ref<any>(null);

const dateLabel = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
);

const suitabilityStyle = computed(() => {
  const s = forecast.value?.suitability;
  if (s === 'excellent') return { bg: 'bg-indigo-900/40', border: 'border-indigo-700/50', icon: '✨' };
  if (s === 'good')      return { bg: 'bg-green-900/40',  border: 'border-green-700/50',  icon: '🌟' };
  if (s === 'fair')      return { bg: 'bg-amber-900/40',  border: 'border-amber-700/50',  icon: '🌤' };
  return                        { bg: 'bg-gray-800/60',   border: 'border-gray-700/50',   icon: '☁️' };
});

const moonEmoji = computed(() => {
  const pct = forecast.value?.moon?.illumination_pct ?? 0;
  if (pct < 6)  return '🌑';
  if (pct < 25) return '🌒';
  if (pct < 45) return '🌓';
  if (pct < 55) return '🌔';
  if (pct < 75) return '🌕';
  if (pct < 90) return '🌖';
  if (pct < 98) return '🌗';
  return '🌘';
});

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '');
}

function cloudEmoji(cover: string): string {
  const map: Record<string, string> = {
    CLEAR: '⭐', MOSTLY_CLEAR: '🌙', PARTLY_CLOUDY: '⛅',
    MOSTLY_CLOUDY: '🌥', OVERCAST: '☁️',
  };
  return map[cover] ?? '?';
}

function scoreBarColor(score: number): string {
  if (score >= 0.75) return 'bg-indigo-500';
  if (score >= 0.5)  return 'bg-green-500';
  if (score >= 0.25) return 'bg-amber-500';
  return 'bg-gray-600';
}

function scoreTextColor(score: number): string {
  if (score >= 0.75) return 'text-indigo-400';
  if (score >= 0.5)  return 'text-green-400';
  if (score >= 0.25) return 'text-amber-400';
  return 'text-gray-500';
}

async function loadForecast() {
  loading.value = true;
  error.value = null;
  try {
    const resp = await fetch('/api/astronomy/tonight');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    forecast.value = await resp.json();
  } catch (e: any) {
    error.value = 'Could not load astronomy forecast. Check that station coordinates are configured.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  weatherStore.fetchLatestReading();
  loadForecast();
});
</script>
