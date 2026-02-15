<template>
  <section class="p-6 bg-white dark:bg-gray-800 shadow rounded-lg">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Current Conditions</h2>

    <!-- Hero Current Conditions -->
    <div v-if="weatherStore.latestReading" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-8 rounded-lg shadow-lg mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center gap-6">
        <!-- Temperature Display -->
        <div class="flex items-center gap-4">
          <div class="flex items-start">
            <span class="text-7xl font-bold">{{ Math.round(weatherStore.latestReading.outdoor_temp_f) }}</span>
            <span class="text-4xl mt-1">°F</span>
          </div>
          <div class="flex flex-col justify-center">
            <span class="text-2xl mb-1">{{ weatherCondition.icon }} {{ weatherCondition.condition }}</span>
            <span class="text-lg opacity-90">Feels like {{ Math.round(weatherStore.latestReading.feels_like_f) }}°F</span>
            <span class="text-sm opacity-75 mt-2">{{ formattedLastUpdated }}</span>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:border-l lg:border-indigo-400 lg:pl-8">
          <div class="flex items-center gap-3">
            <span class="text-3xl">💧</span>
            <div>
              <div class="text-2xl font-semibold">{{ weatherStore.latestReading.humidity_pct }}%</div>
              <div class="text-sm opacity-80">Humidity</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-3xl">🌬️</span>
            <div>
              <div class="text-2xl font-semibold">{{ weatherStore.latestReading?.wind_speed_mph != null ? weatherStore.latestReading.wind_speed_mph.toFixed(1) : '--' }} mph</div>
              <div class="text-sm opacity-80">Wind</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-3xl">🌡️</span>
            <div>
              <div class="text-2xl font-semibold">{{ weatherStore.latestReading?.relative_pressure_inhg != null ? weatherStore.latestReading.relative_pressure_inhg.toFixed(2) : '--' }} inHg</div>
              <div class="text-sm opacity-80">Pressure</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="weatherStore.isLoading" class="p-6 text-center text-gray-700 dark:text-gray-300">
      Loading current conditions...
    </div>
    <div v-else-if="weatherStore.error" class="p-6 text-center text-red-500">
      Error loading current conditions: {{ weatherStore.error.message }}
    </div>
    <div v-else class="p-6 text-center text-gray-700 dark:text-gray-300">
      No weather data available.
    </div>

    <!-- Weather Station Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      <!-- Outdoor Card -->
      <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-2">
          <span class="text-2xl mr-2">🌡️</span>
          <span class="text-xl font-semibold">Outdoor</span>
        </div>
        <div class="flex items-baseline mb-2">
          <span class="text-5xl font-bold">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.outdoor_temp_f) : '--' }}</span>
          <span class="text-2xl">°F</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Humidity</span>
            <span class="font-medium">{{ weatherStore.latestReading ? weatherStore.latestReading.humidity_pct : '--' }}%</span>
          </div>
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Feels Like</span>
            <span class="font-medium">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.feels_like_f) : '--' }}°F</span>
          </div>
        </div>
        <div class="flex justify-end">
          <router-link to="/graphs" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Indoor Card -->
      <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-2">
          <span class="text-2xl mr-2">🏠</span>
          <span class="text-xl font-semibold">Indoor</span>
        </div>
        <div class="flex justify-between items-baseline mb-2">
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Temperature</span>
            <span class="text-3xl font-bold">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.indoor_temp_f) : '--' }}°F</span>
          </div>
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Humidity</span>
            <span class="text-3xl font-bold">{{ weatherStore.latestReading ? weatherStore.latestReading.indoor_humidity_pct : '--' }}%</span>
          </div>
        </div>
        <div class="flex justify-end">
          <router-link to="/graphs" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Wind Card (Combined with Wind Rose) -->
      <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-2">
          <span class="text-2xl mr-2">💨</span>
          <span class="text-xl font-semibold">Wind</span>
        </div>
        <div class="flex items-baseline mb-2">
          <span class="text-4xl font-bold">{{ weatherStore.latestReading?.wind_speed_mph != null ? weatherStore.latestReading.wind_speed_mph.toFixed(1) : '--' }}</span>
          <span class="text-xl ml-1">mph</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">From</span>
            <span class="font-medium">{{ windDirectionFormatted }}</span>
          </div>
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Gusts</span>
            <span class="font-medium">{{ weatherStore.latestReading?.wind_gust_mph != null ? weatherStore.latestReading.wind_gust_mph.toFixed(1) : '--' }} mph</span>
          </div>
        </div>
        <canvas id="wind-rose" ref="windRoseRef" class="w-full h-32 mb-2"></canvas>
        <div class="flex justify-end">
          <router-link to="/graphs" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Rainfall Card with 3-Cylinder Graph -->
      <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-2">
          <span class="text-2xl mr-2">💧</span>
          <span class="text-xl font-semibold">Rainfall</span>
        </div>
        <div class="flex justify-around items-end mb-2 h-24">
          <div class="flex flex-col items-center">
            <div class="relative w-8 h-full rounded-t-full overflow-hidden" :class="(weatherStore.latestReading?.daily_rain_in ?? 0) > 0 ? 'bg-blue-500' : 'bg-blue-200 dark:bg-blue-900'">
            </div>
            <span class="mt-2 text-sm font-medium">{{ weatherStore.latestReading?.daily_rain_in != null ? weatherStore.latestReading.daily_rain_in.toFixed(2) : '--' }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Today</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="relative w-8 h-full rounded-t-full overflow-hidden" :class="(weatherStore.latestReading?.weekly_rain_in ?? 0) > 0 ? 'bg-blue-500' : 'bg-blue-200 dark:bg-blue-900'">
            </div>
            <span class="mt-2 text-sm font-medium">{{ weatherStore.latestReading?.weekly_rain_in != null ? weatherStore.latestReading.weekly_rain_in.toFixed(2) : '--' }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Weekly</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="relative w-8 h-full rounded-t-full overflow-hidden" :class="(weatherStore.latestReading?.monthly_rain_in ?? 0) > 0 ? 'bg-blue-500' : 'bg-blue-200 dark:bg-blue-900'">
            </div>
            <span class="mt-2 text-sm font-medium">{{ weatherStore.latestReading?.monthly_rain_in != null ? weatherStore.latestReading.monthly_rain_in.toFixed(2) : '--' }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Monthly</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Rate</span>
            <span class="font-medium">{{ weatherStore.latestReading?.rain_rate_in_hr != null ? weatherStore.latestReading.rain_rate_in_hr.toFixed(2) : '--' }} in/hr</span>
          </div>
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Event</span>
            <span class="font-medium">{{ weatherStore.latestReading?.event_rain_in ? weatherStore.latestReading.event_rain_in.toFixed(2) : '--' }} in</span>
          </div>
        </div>
        <div class="flex justify-end">
          <router-link to="/graphs" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Pressure Card -->
      <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-2">
          <span class="text-2xl mr-2">🌡️</span>
          <span class="text-xl font-semibold">Pressure</span>
        </div>
        <div class="flex items-baseline mb-2">
          <span class="text-5xl font-bold">{{ weatherStore.latestReading?.relative_pressure_inhg != null ? weatherStore.latestReading.relative_pressure_inhg.toFixed(2) : '--' }}</span>
          <span class="text-xl ml-1">inHg</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Trend</span>
            <span class="font-medium" :class="pressureTrend.color">{{ pressureTrend.icon }} {{ pressureTrend.text }}</span>
          </div>
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Absolute</span>
            <span class="font-medium">{{ weatherStore.latestReading?.absolute_pressure_inhg != null ? weatherStore.latestReading.absolute_pressure_inhg.toFixed(2) : '--' }} inHg</span>
          </div>
        </div>
        <div class="flex justify-end">
          <router-link to="/graphs" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Solar/UV Card -->
      <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-2">
          <span class="text-2xl mr-2">☀️</span>
          <span class="text-xl font-semibold">Solar & UV</span>
        </div>
        <div class="flex flex-col items-center mb-2">
          <div class="text-center mb-2">
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Solar Radiation</span>
            <span class="text-lg font-medium">{{ weatherStore.latestReading?.solar_radiation_wm2 != null ? weatherStore.latestReading.solar_radiation_wm2.toFixed(1) : '--' }} W/m²</span>
          </div>
          <div class="text-center">
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">UV Index</span>
            <span class="text-lg font-medium">{{ uvIndexFormatted }}</span>
          </div>
        </div>
        <div class="h-8 mb-2">
          <canvas id="solar-uv-sparkline" ref="solarSparklineRef" class="w-full h-full"></canvas>
        </div>
        <div class="flex justify-end">
          <router-link to="/graphs" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>
    </div>

  </section>
</template>

<script setup lang="ts">
import { useWeatherStore } from '../stores/weather';
import { computed, onMounted, onUnmounted, ref, watch, markRaw } from 'vue';
import type { WeatherReading } from '../types/weather';
import { Chart, registerables } from 'chart.js';


Chart.register(...registerables); // Register all Chart.js components

const weatherStore = useWeatherStore();

// Historical data for charts and statistics (last 24 hours)
const historicalReadings = ref<WeatherReading[]>([]);

// Fetch historical data (last 24 hours) - using sampled data for performance
const fetchHistoricalData = async () => {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Use sampled readings for better performance (max 100 points for smoother graphs)
    await weatherStore.fetchSampledReadings(start, end, 100);
    historicalReadings.value = weatherStore.sampledReadings;

    // Initialize/update wind rose after data is loaded
    if (windRoseRef.value && historicalReadings.value.length > 0) {
      if (!windRoseChart) {
        initWindRose();
      } else {
        updateWindRose();
      }
    }

    // Update solar sparkline after data is loaded
    if (solarSparklineRef.value && historicalReadings.value.length > 0) {
      if (!solarSparklineChart) {
        initSolarSparkline();
      } else {
        updateSolarSparkline();
      }
    }
  } catch (err) {
    console.error('Failed to fetch historical data:', err);
  }
};

// Daily statistics computed from historical data
const dailyStats = computed(() => {
  if (historicalReadings.value.length === 0) {
    return {
      outdoor: { min: null, max: null, avg: null },
      indoor: { min: null, max: null, avg: null },
    };
  }

  const outdoorTemps = historicalReadings.value
    .map(r => r.outdoor_temp_f)
    .filter(t => t !== null && t !== undefined);

  const indoorTemps = historicalReadings.value
    .map(r => r.indoor_temp_f)
    .filter(t => t !== null && t !== undefined);

  return {
    outdoor: {
      min: outdoorTemps.length > 0 ? Math.min(...outdoorTemps) : null,
      max: outdoorTemps.length > 0 ? Math.max(...outdoorTemps) : null,
      avg: outdoorTemps.length > 0 ? outdoorTemps.reduce((a, b) => a + b, 0) / outdoorTemps.length : null,
    },
    indoor: {
      min: indoorTemps.length > 0 ? Math.min(...indoorTemps) : null,
      max: indoorTemps.length > 0 ? Math.max(...indoorTemps) : null,
      avg: indoorTemps.length > 0 ? indoorTemps.reduce((a, b) => a + b, 0) / indoorTemps.length : null,
    },
  };
});

// "From Yesterday" - compare current temp to 24h ago
const tempFromYesterday = computed(() => {
  if (!weatherStore.latestReading || historicalReadings.value.length === 0) {
    return null;
  }

  const currentTemp = weatherStore.latestReading.outdoor_temp_f;
  const yesterday = historicalReadings.value[0]; // First reading is ~24h ago

  if (!yesterday || yesterday.outdoor_temp_f === null || yesterday.outdoor_temp_f === undefined) {
    return null;
  }

  const diff = currentTemp - yesterday.outdoor_temp_f;
  return diff;
});

// Initial data load and auto-refresh management
onMounted(async () => {
  await weatherStore.loadUserSettings();
  await weatherStore.fetchLatestReading();
  await fetchHistoricalData();

  // Note: Auto-refresh is managed by App.vue root component
  // Home.vue just consumes the reactive latestReading from the store

  // Refresh historical data every 5 minutes
  const historyRefreshInterval = setInterval(fetchHistoricalData, 5 * 60 * 1000);

  // Clean up interval on unmount
  onUnmounted(() => {
    clearInterval(historyRefreshInterval);

    // Clean up card visualization charts
    if (windRoseChart) windRoseChart.destroy();
    if (solarSparklineChart) solarSparklineChart.destroy();
  });
});

// --- Hero Card Logic ---
const weatherCondition = computed(() => {
  const data = weatherStore.latestReading;
  if (!data) {
    return { condition: 'Unknown', icon: '❓', description: 'Conditions unknown' };
  }

  // Priority 1: Rain
  if (data.rain_rate_in_hr !== null && data.rain_rate_in_hr > 0) {
    return { condition: 'Rainy', icon: '🌧️', description: 'Rain' };
  }

  // Priority 2: Night (very low solar radiation)
  if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 < 10) {
    return { condition: 'Night', icon: '🌙', description: 'Clear night' };
  }

  // Priority 3: Sunny (high solar radiation)
  if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 >= 400) {
    return { condition: 'Sunny', icon: '☀️', description: 'Clear skies' };
  }

  // Priority 4: Cloudy (low solar radiation)
  if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 < 400) {
    return { condition: 'Cloudy', icon: '☁️', description: 'Overcast' };
  }

  // Fallback if no solar radiation data
  return { condition: 'Unknown', icon: '❓', description: 'Conditions unknown' };
});

const formattedLastUpdated = computed(() => {
  if (!weatherStore.latestReading || !weatherStore.latestReading.timestamp) {
    return '--';
  }
  const timestamp = weatherStore.latestReading.timestamp;
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  const userTimezone = weatherStore.userTimezone;

  // Recent: show relative time
  if (diffMinutes < 60) {
    if (diffMinutes < 1) {
      return 'Updated just now';
    }
    const minutes = diffMinutes === 1 ? '1 minute' : `${diffMinutes} minutes`;
    return `Updated ${minutes} ago`;
  }

  // Today: show time only (timezone-aware comparison)
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    hour: 'numeric',
    minute: '2-digit',
  });

  const userDateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const isToday = userDateFormatter.format(date) === userDateFormatter.format(now);

  if (isToday) {
    return `Updated at ${dateFormatter.format(date)}`;
  }

  // Older: show date and time
  const fullFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Updated ${fullFormatter.format(date)}`;
});

const windDirectionFormatted = computed(() => {
    if (!weatherStore.latestReading || weatherStore.latestReading.wind_direction_deg === null) {
        return '--';
    }
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(weatherStore.latestReading.wind_direction_deg / 22.5) % 16;
    return `${directions[index]} (${weatherStore.latestReading.wind_direction_deg}°)`;
});

const uvIndexFormatted = computed(() => {
    if (!weatherStore.latestReading || weatherStore.latestReading.uv_index === null) {
        return '0 - Low Risk';
    }
    const uv = weatherStore.latestReading.uv_index;
    let level = '';
    if (uv < 3) level = 'Low Risk';
    else if (uv < 6) level = 'Moderate Risk';
    else if (uv < 8) level = 'High Risk';
    else if (uv < 11) level = 'Very High Risk';
    else level = 'Extreme Risk';
    return `${uv.toFixed(1)} - ${level}`;
});

// Calculate pressure trend based on last 3 hours of data
const pressureTrend = computed(() => {
  if (!weatherStore.latestReading || historicalReadings.value.length < 2) {
    return { text: 'Steady', icon: '→', color: 'text-gray-600 dark:text-gray-400' };
  }

  const currentPressure = weatherStore.latestReading.relative_pressure_inhg;

  // Get pressure from 3 hours ago (or as far back as we have)
  const threeHoursAgo = historicalReadings.value.length >= 36
    ? historicalReadings.value[historicalReadings.value.length - 36]
    : historicalReadings.value[0];

  if (!threeHoursAgo || threeHoursAgo.relative_pressure_inhg === null) {
    return { text: 'Steady', icon: '→', color: 'text-gray-600 dark:text-gray-400' };
  }

  const pressureChange = currentPressure - threeHoursAgo.relative_pressure_inhg;

  // Thresholds: >0.06 rising, <-0.06 falling, else steady
  if (pressureChange > 0.06) {
    return { text: 'Rising', icon: '↗', color: 'text-green-600 dark:text-green-400' };
  } else if (pressureChange < -0.06) {
    return { text: 'Falling', icon: '↘', color: 'text-red-600 dark:text-red-400' };
  } else {
    return { text: 'Steady', icon: '→', color: 'text-gray-600 dark:text-gray-400' };
  }
});

// --- Card Visualizations (wind rose, sparkline) ---
const windRoseRef = ref<HTMLCanvasElement | null>(null);
const solarSparklineRef = ref<HTMLCanvasElement | null>(null);

let windRoseChart: Chart | null = null;
let solarSparklineChart: Chart | null = null;

// Initialize wind rose (polar area chart showing wind direction distribution)
const initWindRose = () => {
  if (!windRoseRef.value || historicalReadings.value.length === 0) return;

  // Calculate wind direction distribution (16 directions)
  const directions = new Array(16).fill(0);
  historicalReadings.value.forEach(r => {
    if (r.wind_direction_deg !== null) {
      const index = Math.round(r.wind_direction_deg / 22.5) % 16;
      directions[index]++;
    }
  });

  windRoseChart = markRaw(new Chart(windRoseRef.value, {
    type: 'polarArea',
    data: {
      labels: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
      datasets: [{
        data: directions,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3b82f6',
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: { display: false }
        }
      }
    }
  }));
};

// Initialize solar radiation sparkline
const initSolarSparkline = () => {
  if (!solarSparklineRef.value || historicalReadings.value.length === 0) return;

  // Use last 24 readings (last 2 hours if readings are every 5 min)
  const recentReadings = historicalReadings.value.slice(-24);
  const data = recentReadings.map(r => r.solar_radiation_wm2 || 0);

  solarSparklineChart = markRaw(new Chart(solarSparklineRef.value, {
    type: 'line',
    data: {
      labels: recentReadings.map(() => ''),
      datasets: [{
        data: data,
        borderColor: '#eab308',
        backgroundColor: '#eab308',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: {
          display: false,
          beginAtZero: true
        }
      }
    }
  }));
};

// Update card visualizations when data changes
const updateWindRose = () => {
  if (!windRoseChart?.data?.datasets?.[0] || historicalReadings.value.length === 0) return;
  const directions = new Array(16).fill(0);
  historicalReadings.value.forEach(r => {
    if (r.wind_direction_deg !== null) {
      const index = Math.round(r.wind_direction_deg / 22.5) % 16;
      directions[index]++;
    }
  });
  windRoseChart.data.datasets[0].data = directions;
  windRoseChart.update('none');
};

const updateSolarSparkline = () => {
  if (!solarSparklineChart?.data?.datasets?.[0] || historicalReadings.value.length === 0) return;
  const recentReadings = historicalReadings.value.slice(-24);
  const data = recentReadings.map(r => r.solar_radiation_wm2 || 0);
  solarSparklineChart.data.datasets[0].data = data;
  solarSparklineChart.update('none');
};

// Watch for historical data changes to update wind rose and sparkline
watch(historicalReadings, () => {
  updateWindRose();
  updateSolarSparkline();
});

</script>
