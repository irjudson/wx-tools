<template>
  <div class="p-6 bg-white dark:bg-gray-800 shadow rounded-lg">
    <!-- Fixed Header with Date Range Filter -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-6">
      <h2 class="text-2xl font-semibold text-gray-800 dark:text-white mb-4 md:mb-0">Graphs & Analysis</h2>
      <div class="flex items-center space-x-4">
        <div class="relative">
          <button @click="toggleDropdown" id="date-filter-toggle" class="flex items-center gap-2 min-w-[180px] bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline" :aria-expanded="isDropdownOpen" aria-controls="date-filter-dropdown">
            <span id="current-range-label">{{ currentLabel }}</span>
            <span class="ml-2">▼</span>
          </button>

          <!-- Date Range Dropdown -->
          <div v-show="isDropdownOpen" id="date-filter-dropdown" class="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-700 rounded-lg shadow-xl z-10" role="dialog" aria-labelledby="date-filter-toggle">
            <div class="p-4 flex flex-col gap-3">
              <!-- Preset Buttons Grid -->
              <div class="grid grid-cols-2 gap-2">
                <button @click="handlePresetClick('24h')" class="py-2 px-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg text-sm">Last 24 Hours</button>
                <button @click="handlePresetClick('7d')" class="py-2 px-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg text-sm">Past 7 Days</button>
                <button @click="handlePresetClick('30d')" class="py-2 px-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg text-sm">Past 30 Days</button>
                <button @click="handlePresetClick('90d')" class="py-2 px-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg text-sm">Past 90 Days</button>
                <button @click="handlePresetClick('1y')" class="py-2 px-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg text-sm">Past Year</button>
                <button @click="handlePresetClick('ytd')" class="py-2 px-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg text-sm">Year to Date</button>
              </div>

              <!-- Divider -->
              <hr class="border-gray-300 dark:border-gray-500">

              <!-- Date Pickers -->
              <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-1">
                  <label for="start-date" class="block text-gray-700 dark:text-gray-200 text-sm font-bold">From:</label>
                  <input v-model="customStartDate" type="datetime-local" id="start-date" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-gray-500">
                </div>
                <div class="flex flex-col gap-1">
                  <label for="end-date" class="block text-gray-700 dark:text-gray-200 text-sm font-bold">To:</label>
                  <input v-model="customEndDate" type="datetime-local" id="end-date" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-gray-500">
                </div>
                <button @click="handleCustomApply" id="apply-custom-range" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline">Apply</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Reset Zoom Button -->
        <button v-show="isZoomed" @click="handleResetZoom" id="reset-zoom-btn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline">
          Reset Zoom
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-show="weatherStore.isLoadingCharts" id="loading-state" class="flex flex-col items-center justify-center py-10" role="status" aria-live="polite">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      <p class="mt-4 text-lg text-gray-700 dark:text-gray-200">Loading weather data...</p>
    </div>

    <!-- Error State -->
    <div v-show="weatherStore.chartsError" id="error-state" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert" aria-live="assertive">
      <p id="error-message" class="block sm:inline">{{ weatherStore.chartsError?.message || 'Failed to load weather data' }}</p>
      <button @click="loadChartData" id="error-retry" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg focus:outline-none focus:shadow-outline ml-4">Retry</button>
    </div>

    <!-- Chart Sections -->
    <div v-show="!weatherStore.isLoadingCharts && !weatherStore.chartsError" id="charts-container" class="grid grid-cols-1 gap-6">
      <!-- Outdoor Conditions (Temp + Humidity combined) -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Outdoor Conditions</h3>
          <div v-if="outdoorStats" class="flex flex-wrap gap-1.5 mt-1.5 text-xs">
            <span v-if="outdoorStats.temp" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
              Temp {{ outdoorStats.temp.min }}–{{ outdoorStats.temp.max }}°F (avg {{ outdoorStats.temp.avg }})
            </span>
            <span v-if="outdoorStats.dewPoint" class="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
              Dew Pt {{ outdoorStats.dewPoint.min }}–{{ outdoorStats.dewPoint.max }}°F (avg {{ outdoorStats.dewPoint.avg }})
            </span>
            <span v-if="outdoorStats.humidity" class="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
              Humidity {{ outdoorStats.humidity.min }}–{{ outdoorStats.humidity.max }}% (avg {{ outdoorStats.humidity.avg }})
            </span>
          </div>
        </div>
        <div class="h-64">
          <canvas :ref="outdoorChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Wind Speed Chart -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Wind Speed (mph)</h3>
          <div v-if="windStats" class="flex flex-wrap gap-1.5 mt-1.5 text-xs">
            <span v-if="windStats.speed" class="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
              Speed {{ windStats.speed.min }}–{{ windStats.speed.max }} mph (avg {{ windStats.speed.avg }})
            </span>
            <span v-if="windStats.gust" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
              Gust max {{ windStats.gust.max }} mph (avg {{ windStats.gust.avg }})
            </span>
          </div>
        </div>
        <div class="h-64">
          <canvas :ref="windSpeedChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Wind Direction Chart -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Wind Direction</h3>
          <div v-if="windDirStats" class="flex flex-wrap gap-1.5 mt-1.5 text-xs">
            <span class="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
              Predominant {{ windDirStats }}
            </span>
          </div>
        </div>
        <div class="h-64">
          <canvas :ref="windDirectionChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Rainfall Chart -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Rainfall (in)</h3>
          <div v-if="rainfallStats" class="flex flex-wrap gap-1.5 mt-1.5 text-xs">
            <span class="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
              Max daily {{ rainfallStats.maxDaily }} in
            </span>
            <span class="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
              Max event {{ rainfallStats.maxEvent }} in
            </span>
            <span class="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
              Monthly total {{ rainfallStats.maxMonthly }} in
            </span>
            <span class="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded">
              Peak rate {{ rainfallStats.maxRate }} in/hr
            </span>
          </div>
        </div>
        <div class="h-64">
          <canvas :ref="rainfallChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Barometric Pressure Chart -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Barometric Pressure (inHg)</h3>
          <div v-if="pressureStats" class="flex flex-wrap gap-1.5 mt-1.5 text-xs">
            <span v-if="pressureStats.relative" class="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
              Relative {{ pressureStats.relative.min }}–{{ pressureStats.relative.max }} inHg (avg {{ pressureStats.relative.avg }})
            </span>
            <span v-if="pressureStats.absolute" class="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
              Absolute {{ pressureStats.absolute.min }}–{{ pressureStats.absolute.max }} inHg (avg {{ pressureStats.absolute.avg }})
            </span>
          </div>
        </div>
        <div class="h-64">
          <canvas :ref="pressureChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Solar & UV (combined) -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Solar & UV</h3>
          <div v-if="solarStats" class="flex flex-wrap gap-1.5 mt-1.5 text-xs">
            <span v-if="solarStats.solar" class="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded">
              Solar peak {{ solarStats.solar.max }} W/m² (avg {{ solarStats.solar.avg }})
            </span>
            <span v-if="solarStats.uv" class="bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded">
              UV peak {{ solarStats.uv.max }} (avg {{ solarStats.uv.avg }})
            </span>
          </div>
        </div>
        <div class="h-64">
          <canvas :ref="solarChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Indoor Conditions (Temp + Humidity combined) -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Indoor Conditions</h3>
          <div v-if="indoorStats" class="flex flex-wrap gap-1.5 mt-1.5 text-xs">
            <span v-if="indoorStats.temp" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
              Temp {{ indoorStats.temp.min }}–{{ indoorStats.temp.max }}°F (avg {{ indoorStats.temp.avg }})
            </span>
            <span v-if="indoorStats.humidity" class="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
              Humidity {{ indoorStats.humidity.min }}–{{ indoorStats.humidity.max }}% (avg {{ indoorStats.humidity.avg }})
            </span>
          </div>
        </div>
        <div class="h-64">
          <canvas :ref="indoorChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Sensor 1 (Temp + Humidity combined) -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Sensor 1 (External Sensor)</h3>
          <div v-if="sensor1Stats" class="flex flex-wrap gap-1.5 mt-1.5 text-xs">
            <span v-if="sensor1Stats.temp" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
              Temp {{ sensor1Stats.temp.min }}–{{ sensor1Stats.temp.max }}°F (avg {{ sensor1Stats.temp.avg }})
            </span>
            <span v-if="sensor1Stats.humidity" class="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
              Humidity {{ sensor1Stats.humidity.min }}–{{ sensor1Stats.humidity.max }}% (avg {{ sensor1Stats.humidity.avg }})
            </span>
          </div>
        </div>
        <div class="h-64">
          <canvas :ref="sensor1Chart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Battery Status (Outdoor + Sensor1 combined) -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">System Status</h3>
        <div class="h-64">
          <canvas :ref="batteryChart.canvasRef"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useWeatherStore } from '../stores/weather';
import { useDateRange } from '../composables/useDateRange';
import { useChart } from '../composables/useChart';
import type { ChartConfiguration } from 'chart.js';

const weatherStore = useWeatherStore();
const { dateRange, currentLabel, applyPreset, applyCustomRange, updateUrl, initializeFromUrl } = useDateRange();

// Chart instances
const outdoorChart = useChart();
const windSpeedChart = useChart();
const windDirectionChart = useChart();
const rainfallChart = useChart();
const pressureChart = useChart();
const solarChart = useChart();
const indoorChart = useChart();
const sensor1Chart = useChart();
const batteryChart = useChart();

// UI state
const isDropdownOpen = ref(false);
const isZoomed = ref(false);
const customStartDate = ref('');
const customEndDate = ref('');

// Chart references
const allCharts = [
  outdoorChart,
  windSpeedChart,
  windDirectionChart,
  rainfallChart,
  pressureChart,
  solarChart,
  indoorChart,
  sensor1Chart,
  batteryChart,
];

// Stats helpers
function calcStats(values: (number | null | undefined)[], decimals = 1) {
  const nums = values.filter(v => v !== null && v !== undefined) as number[];
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...nums).toFixed(decimals),
    max: Math.max(...nums).toFixed(decimals),
    avg: (sum / nums.length).toFixed(decimals),
  };
}

function predominantDir(degrees: (number | null | undefined)[]): string {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const counts = new Array(8).fill(0);
  const valid = degrees.filter(d => d !== null && d !== undefined) as number[];
  if (!valid.length) return 'N/A';
  valid.forEach(d => counts[Math.round(((d % 360) + 360) % 360 / 45) % 8]++);
  return names[counts.indexOf(Math.max(...counts))] ?? 'N/A';
}

// Summary stats — only computed when range > 2 days
const outdoorStats = computed(() => {
  if (!showTrendlines.value || !weatherStore.sampledReadings.length) return null;
  return {
    temp: calcStats(weatherStore.sampledReadings.map(r => r.outdoor_temp_f)),
    humidity: calcStats(weatherStore.sampledReadings.map(r => r.humidity_pct), 0),
    dewPoint: calcStats(weatherStore.sampledReadings.map(r => r.dew_point_f)),
  };
});

const windStats = computed(() => {
  if (!showTrendlines.value || !weatherStore.sampledReadings.length) return null;
  return {
    speed: calcStats(weatherStore.sampledReadings.map(r => r.wind_speed_mph)),
    gust: calcStats(weatherStore.sampledReadings.map(r => r.wind_gust_mph)),
  };
});

const windDirStats = computed(() => {
  if (!showTrendlines.value || !weatherStore.sampledReadings.length) return null;
  return predominantDir(weatherStore.sampledReadings.map(r => r.wind_direction_deg));
});

const rainfallStats = computed(() => {
  if (!showTrendlines.value || !weatherStore.sampledReadings.length) return null;
  const validNums = (arr: (number | null | undefined)[]) => arr.filter(v => v !== null && v !== undefined) as number[];
  const daily = validNums(weatherStore.sampledReadings.map(r => r.daily_rain_in));
  const rate = validNums(weatherStore.sampledReadings.map(r => r.rain_rate_in_hr));
  const event = validNums(weatherStore.sampledReadings.map(r => r.event_rain_in));
  const monthly = validNums(weatherStore.sampledReadings.map(r => r.monthly_rain_in));
  return {
    maxDaily: daily.length ? Math.max(...daily).toFixed(2) : 'N/A',
    maxRate: rate.length ? Math.max(...rate).toFixed(2) : 'N/A',
    maxEvent: event.length ? Math.max(...event).toFixed(2) : 'N/A',
    maxMonthly: monthly.length ? Math.max(...monthly).toFixed(2) : 'N/A',
  };
});

const pressureStats = computed(() => {
  if (!showTrendlines.value || !weatherStore.sampledReadings.length) return null;
  return {
    relative: calcStats(weatherStore.sampledReadings.map(r => r.relative_pressure_inhg), 2),
    absolute: calcStats(weatherStore.sampledReadings.map(r => r.absolute_pressure_inhg), 2),
  };
});

const solarStats = computed(() => {
  if (!showTrendlines.value || !weatherStore.sampledReadings.length) return null;
  return {
    solar: calcStats(weatherStore.sampledReadings.map(r => r.solar_radiation_wm2), 0),
    uv: calcStats(weatherStore.sampledReadings.map(r => r.uv_index), 1),
  };
});

const indoorStats = computed(() => {
  if (!showTrendlines.value || !weatherStore.sampledReadings.length) return null;
  return {
    temp: calcStats(weatherStore.sampledReadings.map(r => r.indoor_temp_f)),
    humidity: calcStats(weatherStore.sampledReadings.map(r => r.indoor_humidity_pct), 0),
  };
});

const sensor1Stats = computed(() => {
  if (!showTrendlines.value || !weatherStore.sampledReadings.length) return null;
  return {
    temp: calcStats(weatherStore.sampledReadings.map(r => r.sensor1_temp_f)),
    humidity: calcStats(weatherStore.sampledReadings.map(r => r.sensor1_humidity_pct), 0),
  };
});

// Linear regression over (timestamp, value) pairs; returns fitted y values aligned to timestamps
function linReg(values: (number | null)[], timestamps: Date[]): (number | null)[] {
  const pts = values.map((y, i) => ({ x: timestamps[i]!.getTime(), y })).filter(p => p.y !== null) as { x: number; y: number }[];
  if (pts.length < 2) return new Array(values.length).fill(null);
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sx2 - sx * sx;
  if (denom === 0) return new Array(values.length).fill(sy / n);
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return timestamps.map(t => m * t.getTime() + b);
}

function trendDataset(label: string, values: (number | null)[], timestamps: Date[], color: string, yAxisID?: string) {
  return {
    label,
    data: linReg(values, timestamps),
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderDash: [10, 4],
    pointRadius: 0,
    tension: 0,
    order: -1,  // render on top of data lines
    ...(yAxisID ? { yAxisID } : {}),
  };
}

const showTrendlines = computed(() =>
  dateRange.value.end.getTime() - dateRange.value.start.getTime() > 2 * 24 * 60 * 60 * 1000
);

// Initialize charts
const initializeCharts = () => {
  if (!weatherStore.sampledReadings.length) return;

  const timestamps = weatherStore.sampledReadings.map(r => new Date(r.timestamp));
  const trends = showTrendlines.value;

  const tempData = weatherStore.sampledReadings.map(r => r.outdoor_temp_f);
  const feelsData = weatherStore.sampledReadings.map(r => r.feels_like_f);
  const dewData = weatherStore.sampledReadings.map(r => r.dew_point_f);
  const humData = weatherStore.sampledReadings.map(r => r.humidity_pct);

  // Outdoor Conditions Chart (Temp + Feels Like + Dew Point + Humidity)
  const outdoorConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Temperature',
          data: tempData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Feels Like',
          data: feelsData,
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Dew Point',
          data: dewData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Humidity',
          data: humData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        ...(trends ? [
          trendDataset('Temp Trend', tempData, timestamps, 'rgb(255, 120, 120)', 'y'),
          trendDataset('Humidity Trend', humData, timestamps, 'rgb(99, 179, 255)', 'y1'),
        ] : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 20,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Temp (°F)',
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Humidity (%)',
          },
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  };

  const windSpeedData = weatherStore.sampledReadings.map(r => r.wind_speed_mph);

  // Wind Speed Chart
  const windConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Wind Speed',
          data: windSpeedData,
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: 'Wind Gust',
          data: weatherStore.sampledReadings.map(r => r.wind_gust_mph),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: 'Max Daily Gust',
          data: weatherStore.sampledReadings.map(r => r.max_daily_gust_mph),
          borderColor: 'rgb(220, 38, 38)',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          borderDash: [5, 5],
        },
        ...(trends ? [trendDataset('Wind Speed Trend', windSpeedData, timestamps, 'rgb(180, 140, 255)')] : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 20,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Speed (mph)',
          },
          min: 0,
        },
      },
    },
  };

  const dailyRainData = weatherStore.sampledReadings.map(r => r.daily_rain_in);

  // Rainfall Chart
  const rainfallConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Rain Rate',
          data: weatherStore.sampledReadings.map(r => r.rain_rate_in_hr),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Daily',
          data: dailyRainData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        {
          label: 'Event',
          data: weatherStore.sampledReadings.map(r => r.event_rain_in),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        {
          label: 'Weekly',
          data: weatherStore.sampledReadings.map(r => r.weekly_rain_in),
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        {
          label: 'Monthly',
          data: weatherStore.sampledReadings.map(r => r.monthly_rain_in),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        ...(trends ? [trendDataset('Daily Rain Trend', dailyRainData, timestamps, 'rgb(74, 240, 134)', 'y1')] : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 20,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Rate (in/hr)',
          },
          min: 0,
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Accumulation (in)',
          },
          min: 0,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  };

  const relPressData = weatherStore.sampledReadings.map(r => r.relative_pressure_inhg);
  const absPressData = weatherStore.sampledReadings.map(r => r.absolute_pressure_inhg);

  // Pressure Chart
  const pressureConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Relative Pressure',
          data: relPressData,
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: 'Absolute Pressure',
          data: absPressData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
        },
        ...(trends ? [
          trendDataset('Relative Trend', relPressData, timestamps, 'rgb(210, 140, 255)'),
          trendDataset('Absolute Trend', absPressData, timestamps, 'rgb(99, 179, 255)'),
        ] : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 20,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Pressure (inHg)',
          },
        },
      },
    },
  };

  const solarData = weatherStore.sampledReadings.map(r => r.solar_radiation_wm2);
  const uvData = weatherStore.sampledReadings.map(r => r.uv_index);

  // Solar & UV Chart (combined with dual Y-axes)
  const solarConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Solar Radiation',
          data: solarData,
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'UV Index',
          data: uvData,
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        ...(trends ? [
          trendDataset('Solar Trend', solarData, timestamps, 'rgb(255, 185, 100)', 'y'),
          trendDataset('UV Trend', uvData, timestamps, 'rgb(255, 120, 200)', 'y1'),
        ] : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 20,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Solar Radiation (W/m²)',
          },
          min: 0,
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'UV Index',
          },
          min: 0,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  };

  const indoorTempData = weatherStore.sampledReadings.map(r => r.indoor_temp_f);
  const indoorHumData = weatherStore.sampledReadings.map(r => r.indoor_humidity_pct);

  // Indoor Conditions Chart (Temp + Feels Like + Dew Point + Humidity)
  const indoorConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Temperature',
          data: indoorTempData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Feels Like',
          data: weatherStore.sampledReadings.map(r => r.indoor_feels_like_f),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Dew Point',
          data: weatherStore.sampledReadings.map(r => r.indoor_dew_point_f),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Humidity',
          data: indoorHumData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        ...(trends ? [
          trendDataset('Temp Trend', indoorTempData, timestamps, 'rgb(255, 120, 120)', 'y'),
          trendDataset('Humidity Trend', indoorHumData, timestamps, 'rgb(99, 179, 255)', 'y1'),
        ] : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 20,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Temp (°F)',
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Humidity (%)',
          },
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  };

  const s1TempData = weatherStore.sampledReadings.map(r => r.sensor1_temp_f);
  const s1HumData = weatherStore.sampledReadings.map(r => r.sensor1_humidity_pct);

  // Sensor 1 Chart (Temp + Feels Like + Dew Point + Humidity)
  const sensor1Config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Temperature',
          data: s1TempData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Feels Like',
          data: weatherStore.sampledReadings.map(r => r.sensor1_feels_like_f),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Dew Point',
          data: weatherStore.sampledReadings.map(r => r.sensor1_dew_point_f),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Humidity',
          data: s1HumData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        ...(trends ? [
          trendDataset('Temp Trend', s1TempData, timestamps, 'rgb(255, 120, 120)', 'y'),
          trendDataset('Humidity Trend', s1HumData, timestamps, 'rgb(99, 179, 255)', 'y1'),
        ] : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 20,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Temp (°F)',
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Humidity (%)',
          },
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  };

  // Battery Status Chart (Outdoor + Sensor1 combined)
  const batteryConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Outdoor Battery',
          data: weatherStore.sampledReadings.map(r => r.outdoor_battery),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: 'Sensor 1 Battery',
          data: weatherStore.sampledReadings.map(r => r.sensor1_battery),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 20,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Battery Level',
          },
        },
      },
    },
  };

  // Wind Direction Chart (no trendline — circular data)
  const windDirectionConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Wind Direction',
          data: weatherStore.sampledReadings.map(r => r.wind_direction_deg),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 20,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Direction',
          },
          min: 0,
          max: 360,
          ticks: {
            stepSize: 45,
            callback: (value: number | string) => {
              const compass: Record<number, string> = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW', 360: 'N' };
              return compass[value as number] ?? '';
            },
          },
          grid: {
            color: (ctx: { tick: { value: number } }) => {
              const cardinals = [0, 90, 180, 270, 360];
              return cardinals.includes(ctx.tick.value) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)';
            },
          },
        },
      },
    },
  };

  // Initialize all charts
  outdoorChart.initChart(outdoorConfig);
  windSpeedChart.initChart(windConfig);
  windDirectionChart.initChart(windDirectionConfig);
  rainfallChart.initChart(rainfallConfig);
  pressureChart.initChart(pressureConfig);
  solarChart.initChart(solarConfig);
  indoorChart.initChart(indoorConfig);
  sensor1Chart.initChart(sensor1Config);
  batteryChart.initChart(batteryConfig);
};

// Date filter handlers
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

const handlePresetClick = async (preset: string) => {
  applyPreset(preset);
  updateUrl();
  isDropdownOpen.value = false;
  await loadChartData();
};

const handleCustomApply = async () => {
  if (!customStartDate.value || !customEndDate.value) {
    alert('Please select both start and end dates');
    return;
  }

  try {
    const start = new Date(customStartDate.value);
    const end = new Date(customEndDate.value);
    applyCustomRange(start, end);
    updateUrl();
    isDropdownOpen.value = false;
    await loadChartData();
  } catch (err) {
    alert((err as Error).message);
  }
};

const loadChartData = async () => {
  await weatherStore.fetchSampledReadings(
    dateRange.value.start,
    dateRange.value.end
  );
  initializeCharts();
};

const handleResetZoom = () => {
  allCharts.forEach(chart => chart.resetZoom());
  isZoomed.value = false;
};

// Lifecycle
onMounted(async () => {
  initializeFromUrl();
  await loadChartData();

  // Set up custom date inputs (datetime-local requires local time, not UTC)
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const now = new Date();
  customEndDate.value = toLocalInput(now);
  customStartDate.value = toLocalInput(new Date(now.getTime() - 24 * 60 * 60 * 1000));
});

// Watch for zoom changes
watch(
  () => allCharts.map(c => c.zoomState.value),
  () => {
    const anyZoomed = allCharts.some(c => c.zoomState.value.min || c.zoomState.value.max);
    isZoomed.value = anyZoomed;
  },
  { deep: true }
);
</script>
