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
            <div class="p-4 flex gap-8">
              <!-- Left: Date Pickers -->
              <div class="flex-1 flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                  <label for="start-date" class="block text-gray-700 dark:text-gray-200 text-sm font-bold">From:</label>
                  <input v-model="customStartDate" type="datetime-local" id="start-date" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-gray-500">
                </div>
                <div>
                  <label for="end-date" class="block text-gray-700 dark:text-gray-200 text-sm font-bold">To:</label>
                  <input v-model="customEndDate" type="datetime-local" id="end-date" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-gray-500">
                </div>
                <div class="mt-4 flex gap-4">
                  <button @click="handleCustomApply" id="apply-custom-range" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline">Apply</button>
                </div>
              </div>

              <!-- Right: Preset Buttons -->
              <div class="flex flex-col gap-2 min-w-[180px]">
                <button @click="handlePresetClick('24h')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Last 24 Hours</button>
                <button @click="handlePresetClick('7d')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Past 7 Days</button>
                <button @click="handlePresetClick('30d')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Past 30 Days</button>
                <button @click="handlePresetClick('90d')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Past 90 Days</button>
                <button @click="handlePresetClick('1y')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Past Year</button>
                <button @click="handlePresetClick('ytd')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Year to Date</button>
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
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Outdoor Conditions</h3>
          <div v-if="outdoorTempStats" class="flex gap-2 text-sm">
            <span class="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Temp: {{ outdoorTempStats.current }}°F</span>
            <span class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">Min: {{ outdoorTempStats.min }}°F</span>
            <span class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">Max: {{ outdoorTempStats.max }}°F</span>
          </div>
        </div>
        <div class="h-64">
          <canvas :ref="outdoorChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Wind Speed Chart -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Wind Speed (mph)</h3>
        <div class="h-64">
          <canvas :ref="windSpeedChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Wind Direction Chart -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Wind Direction</h3>
        <div class="h-64">
          <canvas :ref="windDirectionChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Rainfall Chart -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Rainfall (in)</h3>
        <div class="h-64">
          <canvas :ref="rainfallChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Barometric Pressure Chart -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Barometric Pressure (inHg)</h3>
        <div class="h-64">
          <canvas :ref="pressureChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Solar & UV (combined) -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Solar & UV</h3>
        <div class="h-64">
          <canvas :ref="solarChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Indoor Conditions (Temp + Humidity combined) -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Indoor Conditions</h3>
        <div class="h-64">
          <canvas :ref="indoorChart.canvasRef"></canvas>
        </div>
      </div>

      <!-- Sensor 1 (Temp + Humidity combined) -->
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Sensor 1 (External Sensor)</h3>
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

// Stats calculations
const outdoorTempStats = computed(() => {
  if (!weatherStore.sampledReadings.length) return null;
  const temps = weatherStore.sampledReadings
    .map(r => r.outdoor_temp_f)
    .filter(t => t !== null && t !== undefined) as number[];

  if (!temps.length) return null;

  return {
    current: temps[temps.length - 1]?.toFixed(1) || 'N/A',
    min: Math.min(...temps).toFixed(1),
    max: Math.max(...temps).toFixed(1),
    avg: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
  };
});

const humidityStats = computed(() => {
  if (!weatherStore.sampledReadings.length) return null;
  const humidity = weatherStore.sampledReadings
    .map(r => r.humidity_pct)
    .filter(h => h !== null && h !== undefined) as number[];

  if (!humidity.length) return null;

  return {
    current: humidity[humidity.length - 1]?.toFixed(0) || 'N/A',
    min: Math.min(...humidity).toFixed(0),
    max: Math.max(...humidity).toFixed(0),
    avg: (humidity.reduce((a, b) => a + b, 0) / humidity.length).toFixed(0),
  };
});

// Initialize charts
const initializeCharts = () => {
  if (!weatherStore.sampledReadings.length) return;

  const timestamps = weatherStore.sampledReadings.map(r => new Date(r.timestamp));

  // Outdoor Conditions Chart (Temp + Feels Like + Dew Point + Humidity)
  const outdoorConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Temperature',
          data: weatherStore.sampledReadings.map(r => r.outdoor_temp_f),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Feels Like',
          data: weatherStore.sampledReadings.map(r => r.feels_like_f),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Dew Point',
          data: weatherStore.sampledReadings.map(r => r.dew_point_f),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Humidity',
          data: weatherStore.sampledReadings.map(r => r.humidity_pct),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
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

  // Wind Speed Chart
  const windConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Wind Speed',
          data: weatherStore.sampledReadings.map(r => r.wind_speed_mph),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: 'Wind Gust',
          data: weatherStore.sampledReadings.map(r => r.wind_gust_mph),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: 'Max Daily Gust',
          data: weatherStore.sampledReadings.map(r => r.max_daily_gust_mph),
          borderColor: 'rgb(220, 38, 38)',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          borderDash: [5, 5],
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
            text: 'Speed (mph)',
          },
          min: 0,
        },
      },
    },
  };

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
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Daily',
          data: weatherStore.sampledReadings.map(r => r.daily_rain_in),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        {
          label: 'Event',
          data: weatherStore.sampledReadings.map(r => r.event_rain_in),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        {
          label: 'Weekly',
          data: weatherStore.sampledReadings.map(r => r.weekly_rain_in),
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
        },
        {
          label: 'Monthly',
          data: weatherStore.sampledReadings.map(r => r.monthly_rain_in),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
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

  // Pressure Chart
  const pressureConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Relative Pressure',
          data: weatherStore.sampledReadings.map(r => r.relative_pressure_inhg),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: 'Absolute Pressure',
          data: weatherStore.sampledReadings.map(r => r.absolute_pressure_inhg),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
            text: 'Pressure (inHg)',
          },
        },
      },
    },
  };

  // Solar & UV Chart (combined with dual Y-axes)
  const solarConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Solar Radiation',
          data: weatherStore.sampledReadings.map(r => r.solar_radiation_wm2),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'UV Index',
          data: weatherStore.sampledReadings.map(r => r.uv_index),
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
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

  // Indoor Conditions Chart (Temp + Feels Like + Dew Point + Humidity)
  const indoorConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Temperature',
          data: weatherStore.sampledReadings.map(r => r.indoor_temp_f),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Feels Like',
          data: weatherStore.sampledReadings.map(r => r.indoor_feels_like_f),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Dew Point',
          data: weatherStore.sampledReadings.map(r => r.indoor_dew_point_f),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Humidity',
          data: weatherStore.sampledReadings.map(r => r.indoor_humidity_pct),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
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

  // Sensor 1 Chart (Temp + Feels Like + Dew Point + Humidity)
  const sensor1Config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Temperature',
          data: weatherStore.sampledReadings.map(r => r.sensor1_temp_f),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Feels Like',
          data: weatherStore.sampledReadings.map(r => r.sensor1_feels_like_f),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Dew Point',
          data: weatherStore.sampledReadings.map(r => r.sensor1_dew_point_f),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Humidity',
          data: weatherStore.sampledReadings.map(r => r.sensor1_humidity_pct),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y1',
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
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: 'Sensor 1 Battery',
          data: weatherStore.sampledReadings.map(r => r.sensor1_battery),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
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

  // Wind Direction Chart
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
            text: 'Direction (degrees)',
          },
          min: 0,
          max: 360,
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

  // Set up custom date inputs
  const now = new Date();
  customEndDate.value = now.toISOString().slice(0, 16);
  customStartDate.value = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
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
