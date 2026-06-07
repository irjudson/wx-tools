<template>
  <div class="p-4 max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Data Explorer</h1>

    <!-- Query Form -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Query Parameters</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date & Time
          </label>
          <input
            v-model="queryForm.start"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date & Time
          </label>
          <input
            v-model="queryForm.end"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Limit (max 10,000)
          </label>
          <input
            v-model.number="queryForm.limit"
            type="number"
            min="1"
            max="10000"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <!-- Export resolution -->
      <div class="flex items-center gap-3 mb-4">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Export resolution:</span>
        <label class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="radio" v-model="exportResolution" value="raw" class="text-blue-600" />
          Raw (5-min, all rows in date range)
        </label>
        <label class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="radio" v-model="exportResolution" value="hourly" class="text-blue-600" />
          Hourly averages
        </label>
      </div>

      <div class="flex gap-3">
        <button
          @click="queryData"
          :disabled="isLoading"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-md transition-colors"
        >
          {{ isLoading ? 'Querying...' : 'Query Data' }}
        </button>
        <a
          v-if="readings.length > 0 && exportUrl"
          :href="exportUrl"
          :download="exportFilename"
          @click.prevent="handleExportClick"
          class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-md transition-colors inline-block"
        >
          Export CSV
          <span class="text-xs opacity-75 ml-1">({{ exportResolution === 'hourly' ? 'hourly avg' : 'all rows' }})</span>
        </a>
      </div>

      <div v-if="error" class="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p class="text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <div v-if="statusMessage" class="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <p class="text-blue-800 dark:text-blue-200">{{ statusMessage }}</p>
      </div>
    </div>

    <!-- Results -->
    <div v-if="readings.length > 0" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <!-- Summary -->
      <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-2">Query Results Summary</h3>
        <p class="text-gray-700 dark:text-gray-300">
          <strong>Total Readings:</strong> {{ readings.length }}
        </p>
        <p class="text-gray-700 dark:text-gray-300" v-if="readings.length > 0">
          <strong>Date Range:</strong> {{ formatDateTime(readings[0]!.timestamp) }} to {{ formatDateTime(readings[readings.length - 1]!.timestamp) }}
        </p>
      </div>

      <!-- Data Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Timestamp
              </th>
              <th class="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Temp (°F)
              </th>
              <th class="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Humidity (%)
              </th>
              <th class="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Wind (mph)
              </th>
              <th class="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Gust (mph)
              </th>
              <th class="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Direction (°)
              </th>
              <th class="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Rain (in)
              </th>
              <th class="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Pressure (inHg)
              </th>
              <th class="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                UV Index
              </th>
              <th class="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Solar (W/m²)
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="reading in readings" :key="reading.timestamp" class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {{ formatDateTime(reading.timestamp) }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                {{ reading.outdoor_temp_f != null ? reading.outdoor_temp_f.toFixed(1) : '-' }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                {{ reading.humidity_pct ?? '-' }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                {{ reading.wind_speed_mph != null ? reading.wind_speed_mph.toFixed(1) : '-' }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                {{ reading.wind_gust_mph != null ? reading.wind_gust_mph.toFixed(1) : '-' }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                {{ reading.wind_direction_deg ?? '-' }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                {{ reading.daily_rain_in != null ? reading.daily_rain_in.toFixed(3) : '-' }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                {{ reading.relative_pressure_inhg != null ? reading.relative_pressure_inhg.toFixed(2) : '-' }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                {{ reading.uv_index != null ? reading.uv_index.toFixed(1) : '-' }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                {{ reading.solar_radiation_wm2 != null ? reading.solar_radiation_wm2.toFixed(1) : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="readings.length >= queryForm.limit" class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
        <p class="text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Results are limited to {{ queryForm.limit }} readings. Increase the limit or narrow the date range to see more data.
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading && !error" class="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      <h3 class="mt-2 text-lg font-medium text-gray-900 dark:text-white">No Data</h3>
      <p class="mt-1 text-gray-500 dark:text-gray-400">
        Select a date range and click "Query Data" to explore your weather data.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { WeatherReading } from '../types/weather';

const queryForm = ref({
  start: '',
  end: '',
  limit: 1000,
});

const isLoading = ref(false);
const readings = ref<WeatherReading[]>([]);
const error = ref<string | null>(null);
const statusMessage = ref<string | null>(null);
const exportResolution = ref<'raw' | 'hourly'>('raw');

const exportUrl = computed(() => {
  if (!queryForm.value.start || !queryForm.value.end || readings.value.length === 0) return '';
  const params = new URLSearchParams({
    start: new Date(queryForm.value.start).toISOString(),
    end: new Date(queryForm.value.end).toISOString(),
  });
  const base = exportResolution.value === 'hourly' ? '/api/weather/export/hourly' : '/api/weather/export';
  return `${base}?${params}`;
});

const exportFilename = computed(() =>
  queryForm.value.start && queryForm.value.end
    ? `weather-${queryForm.value.start.slice(0, 10)}-to-${queryForm.value.end.slice(0, 10)}.csv`
    : 'weather.csv'
);

// Initialize with last 7 days
onMounted(() => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  queryForm.value.start = formatDateTimeLocal(weekAgo);
  queryForm.value.end = formatDateTimeLocal(now);
});

async function queryData() {
  if (!queryForm.value.start || !queryForm.value.end) {
    error.value = 'Please select both start and end dates';
    return;
  }

  isLoading.value = true;
  error.value = null;
  statusMessage.value = null;
  readings.value = [];

  try {
    const startISO = new Date(queryForm.value.start).toISOString();
    const endISO = new Date(queryForm.value.end).toISOString();
    const params = new URLSearchParams({
      start: startISO,
      end: endISO,
      limit: queryForm.value.limit.toString(),
    });

    const response = await fetch(`/api/weather/readings?${params}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to query data');
    }

    const data = await response.json();
    readings.value = data;
    statusMessage.value = `Found ${data.length} readings`;
  } catch (err: any) {
    error.value = `Query failed: ${err.message}`;
    console.error('Data explorer query error:', err);
  } finally {
    isLoading.value = false;
  }
}


async function handleExportClick() {
  if (!exportUrl.value) return;

  // In a sandboxed iframe (e.g. Claude Code browser), anchor downloads are blocked.
  // Detect iframe and try opening in a new top-level tab instead.
  if (window.self !== window.top) {
    const newWin = window.open(exportUrl.value, '_blank');
    if (!newWin) {
      statusMessage.value = `Popups blocked. Open manually: ${window.location.origin}${exportUrl.value}`;
    }
    return;
  }

  // Normal browser: fetch the data and trigger a blob download so the SW
  // NavigationRoute can never intercept it as a page navigation.
  statusMessage.value = 'Preparing download...';
  try {
    const resp = await fetch(exportUrl.value);
    if (!resp.ok) throw new Error(resp.statusText);
    const text = await resp.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename.value;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    statusMessage.value = `Downloaded ${exportFilename.value} (${readings.value.length} rows)`;
  } catch (err: any) {
    error.value = `Export failed: ${err.message}`;
    statusMessage.value = null;
  }
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString();
}
</script>
