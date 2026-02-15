# Complete UX Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Vue 3 weather station UX by implementing charts, dashboard polish, and utility views

**Architecture:** Three-phase sequential implementation - Graphs page with Chart.js + zoom/pan, enhanced Home dashboard with live data, and four utility views (Settings, Import, Explorer, Analysis)

**Tech Stack:** Vue 3 + TypeScript + Vite, Chart.js 4.5.1, chartjs-plugin-zoom, Pinia, Tailwind CSS

---

## Phase 1: Graphs Page Implementation

### Task 1: Create Date Range Composable

**Files:**
- Create: `frontend/src/composables/useDateRange.ts`
- Test: Manual verification in Graphs.vue

**Step 1: Create useDateRange composable with preset calculations**

Create `frontend/src/composables/useDateRange.ts`:

```typescript
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export function useDateRange() {
  const route = useRoute();
  const router = useRouter();

  const startDate = ref<Date>(new Date());
  const endDate = ref<Date>(new Date());
  const currentLabel = ref<string>('Last 24 Hours');

  // Initialize from URL params or default to last 24 hours
  const initializeFromUrl = () => {
    const startParam = route.query.start as string;
    const endParam = route.query.end as string;

    if (startParam && endParam) {
      startDate.value = new Date(startParam);
      endDate.value = new Date(endParam);
      currentLabel.value = 'Custom';
    } else {
      applyPreset('24h');
    }
  };

  const applyPreset = (preset: string) => {
    const now = new Date();
    const end = new Date(now);

    switch (preset) {
      case '24h':
        startDate.value = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        currentLabel.value = 'Last 24 Hours';
        break;
      case '7d':
        startDate.value = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        currentLabel.value = 'Past 7 Days';
        break;
      case '30d':
        startDate.value = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        currentLabel.value = 'Past 30 Days';
        break;
      case '90d':
        startDate.value = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        currentLabel.value = 'Past 90 Days';
        break;
      case '1y':
        startDate.value = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        currentLabel.value = 'Past Year';
        break;
      case 'ytd':
        startDate.value = new Date(now.getFullYear(), 0, 1);
        currentLabel.value = 'Year to Date';
        break;
      default:
        startDate.value = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        currentLabel.value = 'Last 24 Hours';
    }
    endDate.value = end;
  };

  const applyCustomRange = (start: Date, end: Date) => {
    if (start > end) {
      throw new Error('Start date must be before end date');
    }
    startDate.value = start;
    endDate.value = end;
    currentLabel.value = 'Custom';
  };

  const updateUrl = () => {
    router.push({
      query: {
        start: startDate.value.toISOString(),
        end: endDate.value.toISOString(),
      },
    });
  };

  const dateRange = computed<DateRange>(() => ({
    start: startDate.value,
    end: endDate.value,
    label: currentLabel.value,
  }));

  return {
    dateRange,
    currentLabel,
    startDate,
    endDate,
    initializeFromUrl,
    applyPreset,
    applyCustomRange,
    updateUrl,
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add frontend/src/composables/useDateRange.ts
git commit -m "feat: add date range composable with presets and URL sync"
```

---

### Task 2: Enhance Weather Store with Sampled Readings

**Files:**
- Modify: `frontend/src/stores/weather.ts`
- Test: Manual API call verification

**Step 1: Add sampled readings state and fetch function**

Add to `frontend/src/stores/weather.ts` (after line 133):

```typescript
  // Sampled readings for charts
  const sampledReadings = ref<WeatherReading[]>([]);
  const isLoadingCharts = ref(false);
  const chartsError = ref<Error | null>(null);
  const chartMetadata = ref<any>(null);

  // Cache for sampled readings (5 minutes)
  const sampledCache = ref<{
    key: string;
    data: WeatherReading[];
    metadata: any;
    timestamp: number;
  } | null>(null);

  async function fetchSampledReadings(start: Date, end: Date, maxPoints: number = 1500) {
    // Generate cache key
    const cacheKey = `${start.toISOString()}-${end.toISOString()}-${maxPoints}`;
    const now = Date.now();

    // Check cache (5 min = 300000 ms)
    if (sampledCache.value &&
        sampledCache.value.key === cacheKey &&
        now - sampledCache.value.timestamp < 300000) {
      sampledReadings.value = sampledCache.value.data;
      chartMetadata.value = sampledCache.value.metadata;
      return;
    }

    isLoadingCharts.value = true;
    chartsError.value = null;

    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
        max_points: maxPoints.toString(),
      });

      const response = await fetch(`/api/weather/readings/sampled?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sampled readings: ${response.statusText}`);
      }

      const data = await response.json();
      sampledReadings.value = data.readings || [];
      chartMetadata.value = data.metadata || null;

      // Update cache
      sampledCache.value = {
        key: cacheKey,
        data: sampledReadings.value,
        metadata: chartMetadata.value,
        timestamp: now,
      };
    } catch (err) {
      chartsError.value = err as Error;
      console.error('Error fetching sampled readings:', err);
    } finally {
      isLoadingCharts.value = false;
    }
  }
```

**Step 2: Export new functions and state**

Update return statement in `frontend/src/stores/weather.ts` (line 121-132):

```typescript
  return {
    latestReading,
    userTimezone,
    isLoading,
    error,
    loadUserSettings,
    saveUserSettings,
    fetchLatestReading,
    startDashboardAutoRefresh,
    stopDashboardAutoRefresh,
    checkForNewData,
    // New exports for charts
    sampledReadings,
    isLoadingCharts,
    chartsError,
    chartMetadata,
    fetchSampledReadings,
  };
```

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add frontend/src/stores/weather.ts
git commit -m "feat: add sampled readings fetch with caching to weather store"
```

---

### Task 3: Enhance Chart Composable with Zoom Support

**Files:**
- Modify: `frontend/src/composables/useChart.ts`
- Test: Manual verification in Graphs.vue

**Step 1: Add Chart.js imports and zoom configuration**

Replace contents of `frontend/src/composables/useChart.ts`:

```typescript
import { ref, onUnmounted, Ref } from 'vue';
import {
  Chart,
  ChartConfiguration,
  registerables,
  ChartOptions,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
Chart.register(...registerables, zoomPlugin);

export interface ChartZoomState {
  min?: number;
  max?: number;
}

export function useChart() {
  const chartInstance = ref<Chart | null>(null);
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const zoomState = ref<ChartZoomState>({});

  const initChart = (config: ChartConfiguration) => {
    if (canvasRef.value) {
      if (chartInstance.value) {
        chartInstance.value.destroy();
      }

      // Add zoom plugin configuration if not present
      if (config.options && !config.options.plugins?.zoom) {
        config.options.plugins = {
          ...config.options.plugins,
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
                modifierKey: 'ctrl',
              },
              pinch: {
                enabled: true,
              },
              mode: 'x',
            },
            pan: {
              enabled: true,
              mode: 'x',
            },
          },
        };
      }

      chartInstance.value = new Chart(canvasRef.value, config);
    }
  };

  const updateChart = (newData: any) => {
    if (chartInstance.value) {
      chartInstance.value.data = newData;
      chartInstance.value.update();
    }
  };

  const resetZoom = () => {
    if (chartInstance.value) {
      chartInstance.value.resetZoom();
      zoomState.value = {};
    }
  };

  const syncZoom = (min: number, max: number) => {
    if (chartInstance.value && chartInstance.value.options.scales?.x) {
      zoomState.value = { min, max };
      chartInstance.value.options.scales.x.min = min;
      chartInstance.value.options.scales.x.max = max;
      chartInstance.value.update('none');
    }
  };

  const getZoomState = (): ChartZoomState => {
    if (chartInstance.value && chartInstance.value.scales?.x) {
      return {
        min: chartInstance.value.scales.x.min,
        max: chartInstance.value.scales.x.max,
      };
    }
    return {};
  };

  onUnmounted(() => {
    if (chartInstance.value) {
      chartInstance.value.destroy();
      chartInstance.value = null;
    }
  });

  return {
    canvasRef,
    chartInstance,
    zoomState,
    initChart,
    updateChart,
    resetZoom,
    syncZoom,
    getZoomState,
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/composables/useChart.ts
git commit -m "feat: enhance chart composable with zoom/pan and synchronization"
```

---

### Task 4: Implement Graphs.vue Chart Logic

**Files:**
- Modify: `frontend/src/views/Graphs.vue`
- Test: Manual browser verification

**Step 1: Add script setup with imports and state**

Replace the `<script setup lang="ts">` section in `frontend/src/views/Graphs.vue` (starting at line 99):

```typescript
<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useWeatherStore } from '../stores/weather';
import { useDateRange } from '../composables/useDateRange';
import { useChart } from '../composables/useChart';
import type { ChartConfiguration } from 'chart.js';

const weatherStore = useWeatherStore();
const { dateRange, currentLabel, applyPreset, applyCustomRange, updateUrl, initializeFromUrl } = useDateRange();

// Chart instances
const outdoorTempChart = useChart();
const outdoorHumidityChart = useChart();
const windSpeedChart = useChart();
const rainfallChart = useChart();
const pressureChart = useChart();
const solarChart = useChart();
const uvChart = useChart();

// UI state
const isDropdownOpen = ref(false);
const isZoomed = ref(false);
const customStartDate = ref('');
const customEndDate = ref('');

// Chart references
const allCharts = [
  outdoorTempChart,
  outdoorHumidityChart,
  windSpeedChart,
  rainfallChart,
  pressureChart,
  solarChart,
  uvChart,
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

  // Outdoor Temperature Chart
  const tempConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Temperature',
          data: weatherStore.sampledReadings.map(r => r.outdoor_temp_f),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
            text: 'Temperature (°F)',
          },
        },
      },
    },
  };

  // Humidity Chart
  const humidityConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Humidity',
          data: weatherStore.sampledReadings.map(r => r.humidity_pct),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
            text: 'Humidity (%)',
          },
          min: 0,
          max: 100,
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
        },
        {
          label: 'Wind Gust',
          data: weatherStore.sampledReadings.map(r => r.wind_gust_mph),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
        },
        {
          label: 'Daily Rain',
          data: weatherStore.sampledReadings.map(r => r.daily_rain_in),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
            text: 'Rainfall (in)',
          },
          min: 0,
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
          label: 'Pressure',
          data: weatherStore.sampledReadings.map(r => r.relative_pressure_inhg),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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

  // Solar Radiation Chart
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
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
            text: 'Solar Radiation (W/m²)',
          },
          min: 0,
        },
      },
    },
  };

  // UV Index Chart
  const uvConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'UV Index',
          data: weatherStore.sampledReadings.map(r => r.uv_index),
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
            text: 'UV Index',
          },
          min: 0,
        },
      },
    },
  };

  // Initialize all charts
  outdoorTempChart.initChart(tempConfig);
  outdoorHumidityChart.initChart(humidityConfig);
  windSpeedChart.initChart(windConfig);
  rainfallChart.initChart(rainfallConfig);
  pressureChart.initChart(pressureConfig);
  solarChart.initChart(solarConfig);
  uvChart.initChart(uvConfig);
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
```

**Step 2: Update template to bind chart refs and add stats**

Update the template section in `frontend/src/views/Graphs.vue` to add stats and bind canvas refs. Replace line 67-70:

```vue
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Outdoor Temperature (°F)</h3>
          <div v-if="outdoorTempStats" class="flex gap-2 text-sm">
            <span class="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Current: {{ outdoorTempStats.current }}°F</span>
            <span class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">Min: {{ outdoorTempStats.min }}°F</span>
            <span class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">Max: {{ outdoorTempStats.max }}°F</span>
            <span class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">Avg: {{ outdoorTempStats.avg }}°F</span>
          </div>
        </div>
        <div class="h-64">
          <canvas ref="outdoorTempChart.canvasRef"></canvas>
        </div>
      </div>
```

Update line 71-74 for humidity:

```vue
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Outdoor Humidity (%)</h3>
          <div v-if="humidityStats" class="flex gap-2 text-sm">
            <span class="bg-green-100 dark:bg-green-900 px-2 py-1 rounded">Current: {{ humidityStats.current }}%</span>
            <span class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">Min: {{ humidityStats.min }}%</span>
            <span class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">Max: {{ humidityStats.max }}%</span>
            <span class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">Avg: {{ humidityStats.avg }}%</span>
          </div>
        </div>
        <div class="h-64">
          <canvas ref="outdoorHumidityChart.canvasRef"></canvas>
        </div>
      </div>
```

Update remaining canvases (lines 75-95):

```vue
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Wind Speed (mph)</h3>
        <div class="h-64">
          <canvas ref="windSpeedChart.canvasRef"></canvas>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Rainfall (in)</h3>
        <div class="h-64">
          <canvas ref="rainfallChart.canvasRef"></canvas>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Barometric Pressure (inHg)</h3>
        <div class="h-64">
          <canvas ref="pressureChart.canvasRef"></canvas>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Solar Radiation (W/m²)</h3>
        <div class="h-64">
          <canvas ref="solarChart.canvasRef"></canvas>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">UV Index</h3>
        <div class="h-64">
          <canvas ref="uvChart.canvasRef"></canvas>
        </div>
      </div>
```

**Step 3: Wire up date filter UI event handlers**

Update template to add click handlers. Replace line 8-11:

```vue
          <button @click="toggleDropdown" id="date-filter-toggle" class="flex items-center gap-2 min-w-[180px] bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline" :aria-expanded="isDropdownOpen" aria-controls="date-filter-dropdown">
            <span id="current-range-label">{{ currentLabel }}</span>
            <span class="ml-2">▼</span>
          </button>
```

Update line 14 to add v-show:

```vue
          <div v-show="isDropdownOpen" id="date-filter-dropdown" class="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-700 rounded-lg shadow-xl z-10" role="dialog" aria-labelledby="date-filter-toggle">
```

Update line 19-20 for custom date inputs:

```vue
                  <label for="start-date" class="block text-gray-700 dark:text-gray-200 text-sm font-bold">From:</label>
                  <input v-model="customStartDate" type="datetime-local" id="start-date" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-gray-500">
```

Update line 23-24:

```vue
                  <label for="end-date" class="block text-gray-700 dark:text-gray-200 text-sm font-bold">To:</label>
                  <input v-model="customEndDate" type="datetime-local" id="end-date" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-gray-500">
```

Update line 27:

```vue
                  <button @click="handleCustomApply" id="apply-custom-range" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline">Apply</button>
```

Update preset buttons (lines 33-39) to add click handlers:

```vue
                <button @click="handlePresetClick('24h')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Last 24 Hours</button>
                <button @click="handlePresetClick('7d')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Past 7 Days</button>
                <button @click="handlePresetClick('30d')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Past 30 Days</button>
                <button @click="handlePresetClick('90d')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Past 90 Days</button>
                <button @click="handlePresetClick('1y')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Past Year</button>
                <button @click="handlePresetClick('ytd')" class="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold rounded-lg">Year to Date</button>
```

Update reset zoom button (line 46) to show conditionally:

```vue
        <button v-show="isZoomed" @click="handleResetZoom" id="reset-zoom-btn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline">
```

Update loading/error states (lines 53-62) to bind to store:

```vue
    <div v-show="weatherStore.isLoadingCharts" id="loading-state" class="flex flex-col items-center justify-center py-10" role="status" aria-live="polite">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      <p class="mt-4 text-lg text-gray-700 dark:text-gray-200">Loading weather data...</p>
    </div>

    <div v-show="weatherStore.chartsError" id="error-state" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert" aria-live="assertive">
      <p id="error-message" class="block sm:inline">{{ weatherStore.chartsError?.message || 'Failed to load weather data' }}</p>
      <button @click="loadChartData" id="error-retry" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg focus:outline-none focus:shadow-outline ml-4">Retry</button>
    </div>

    <div v-show="!weatherStore.isLoadingCharts && !weatherStore.chartsError" id="charts-container" class="grid grid-cols-1 gap-6">
```

**Step 4: Build and verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 5: Test in browser**

Run: Open browser to http://localhost:8000/graphs
Expected: Charts render with data, date filter works, can zoom/pan

**Step 6: Commit**

```bash
git add frontend/src/views/Graphs.vue
git commit -m "feat: implement full Graphs.vue with Chart.js rendering and date filtering"
```

---

### Task 5: Build and Deploy Frontend

**Files:**
- Build: `frontend/dist/`

**Step 1: Build production bundle**

Run: `cd frontend && npm run build`
Expected: Build succeeds, files in `frontend/dist/`

**Step 2: Verify bundle size**

Run: `du -sh frontend/dist/`
Expected: < 2MB

**Step 3: Commit built files**

```bash
git add frontend/dist/
git commit -m "build: update frontend dist with Graphs page implementation"
```

**Step 4: Test production build**

Run backend: `python -m uvicorn src.main:app --reload`
Open: http://localhost:8000/graphs
Expected: Graphs page works in production

---

## Phase 2: Home Dashboard Implementation

### Task 6: Create Shared Components

**Files:**
- Create: `frontend/src/components/LoadingSpinner.vue`
- Create: `frontend/src/components/ErrorBanner.vue`
- Create: `frontend/src/components/SuccessBanner.vue`

**Step 1: Create LoadingSpinner component**

Create `frontend/src/components/LoadingSpinner.vue`:

```vue
<template>
  <div class="flex flex-col items-center justify-center py-6">
    <div
      :class="spinnerSizeClass"
      class="animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
    ></div>
    <p v-if="message" class="mt-4 text-gray-700 dark:text-gray-300">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  message: '',
});

const spinnerSizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-6 w-6';
    case 'lg':
      return 'h-16 w-16';
    default:
      return 'h-12 w-12';
  }
});
</script>
```

**Step 2: Create ErrorBanner component**

Create `frontend/src/components/ErrorBanner.vue`:

```vue
<template>
  <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p class="font-bold">Error</p>
        <p class="text-sm">{{ message }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="onRetry"
          @click="onRetry"
          class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm"
        >
          Retry
        </button>
        <button
          v-if="dismissible"
          @click="emit('dismiss')"
          class="text-red-700 hover:text-red-900"
          aria-label="Dismiss"
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string;
  onRetry?: () => void;
  dismissible?: boolean;
}

withDefaults(defineProps<Props>(), {
  dismissible: true,
});

const emit = defineEmits<{
  dismiss: [];
}>();
</script>
```

**Step 3: Create SuccessBanner component**

Create `frontend/src/components/SuccessBanner.vue`:

```vue
<template>
  <Transition name="slide-fade">
    <div v-if="isVisible" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <p class="font-medium">{{ message }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Props {
  message: string;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 3000,
});

const isVisible = ref(true);

onMounted(() => {
  setTimeout(() => {
    isVisible.value = false;
  }, props.duration);
});
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
```

**Step 4: Build and verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add shared components (LoadingSpinner, ErrorBanner, SuccessBanner)"
```

---

### Task 7: Enhance Home.vue with Live Data

**Files:**
- Modify: `frontend/src/views/Home.vue`

**Step 1: Add computed properties for weather condition**

Update the `<script setup>` section in Home.vue (after imports):

```typescript
<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useWeatherStore } from '../stores/weather';

const weatherStore = useWeatherStore();

// Weather condition logic
const weatherCondition = computed(() => {
  if (!weatherStore.latestReading) {
    return { condition: 'Unknown', icon: '❓' };
  }

  const { rain_rate_in_hr, solar_radiation_wm2, humidity_pct } = weatherStore.latestReading;

  if (rain_rate_in_hr && rain_rate_in_hr > 0) {
    return { condition: 'Rainy', icon: '☔' };
  } else if (solar_radiation_wm2 && solar_radiation_wm2 < 100 && humidity_pct > 85) {
    return { condition: 'Cloudy', icon: '☁️' };
  } else if (solar_radiation_wm2 && solar_radiation_wm2 > 600) {
    return { condition: 'Sunny', icon: '☀️' };
  } else {
    return { condition: 'Partly Cloudy', icon: '⛅' };
  }
});

// Formatted timestamp
const formattedLastUpdated = computed(() => {
  if (!weatherStore.latestReading?.timestamp) return 'Unknown';

  const date = new Date(weatherStore.latestReading.timestamp);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: weatherStore.userTimezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return new Intl.DateTimeFormat('en-US', options).format(date);
});

// Lifecycle
onMounted(async () => {
  await weatherStore.loadUserSettings();
  await weatherStore.fetchLatestReading();
  weatherStore.startDashboardAutoRefresh();
});

onUnmounted(() => {
  weatherStore.stopDashboardAutoRefresh();
});
</script>
```

**Step 2: Verify the hero card already uses these computed**

Check that lines 6-16 in Home.vue already reference `weatherCondition` and `formattedLastUpdated`.

**Step 3: Build and test**

Run: `cd frontend && npm run build`
Expected: Build succeeds

Run backend and test: http://localhost:8000/
Expected: Hero card shows weather condition and formatted time

**Step 4: Commit**

```bash
git add frontend/src/views/Home.vue
git commit -m "feat: add weather condition logic and formatted timestamps to Home"
```

---

### Task 8: Wire Up Sidebar Statistics

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/stores/weather.ts`

**Step 1: Add 24h stats to weather store**

Add to `frontend/src/stores/weather.ts` (after sampledReadings section):

```typescript
  // 24-hour statistics
  const stats24h = ref<{
    minTemp: number | null;
    maxTemp: number | null;
    avgTemp: number | null;
    outdoorBattery: number | null;
  }>({
    minTemp: null,
    maxTemp: null,
    avgTemp: null,
    outdoorBattery: null,
  });

  async function fetch24hStats() {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
        limit: '10000',
      });

      const response = await fetch(`/api/weather/readings?${params}`);
      if (!response.ok) return;

      const data = await response.json();
      if (!data || data.length === 0) return;

      const temps = data
        .map((r: any) => r.outdoor_temp_f)
        .filter((t: number) => t !== null && t !== undefined);

      if (temps.length > 0) {
        stats24h.value.minTemp = Math.min(...temps);
        stats24h.value.maxTemp = Math.max(...temps);
        stats24h.value.avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
      }

      // Get latest battery status
      if (data.length > 0 && data[data.length - 1].outdoor_battery !== null) {
        stats24h.value.outdoorBattery = data[data.length - 1].outdoor_battery;
      }
    } catch (err) {
      console.error('Failed to fetch 24h stats:', err);
    }
  }
```

**Step 2: Export stats and function**

Update return in `frontend/src/stores/weather.ts`:

```typescript
  return {
    latestReading,
    userTimezone,
    isLoading,
    error,
    loadUserSettings,
    saveUserSettings,
    fetchLatestReading,
    startDashboardAutoRefresh,
    stopDashboardAutoRefresh,
    checkForNewData,
    sampledReadings,
    isLoadingCharts,
    chartsError,
    chartMetadata,
    fetchSampledReadings,
    // New stats exports
    stats24h,
    fetch24hStats,
  };
```

**Step 3: Update App.vue to show real stats**

Update `frontend/src/App.vue` sidebar stats section (lines 10-33):

```vue
      <div class="station-stats">
        <div class="stats-header">
          <span class="stats-icon">📊</span>
          <h3>Station Statistics</h3>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">
              {{ weatherStore.stats24h.minTemp !== null ? Math.round(weatherStore.stats24h.minTemp) + '°F' : 'N/A' }}
            </div>
            <div class="stat-label">Min Temp</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">
              {{ weatherStore.stats24h.maxTemp !== null ? Math.round(weatherStore.stats24h.maxTemp) + '°F' : 'N/A' }}
            </div>
            <div class="stat-label">Max Temp</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">
              {{ weatherStore.stats24h.avgTemp !== null ? Math.round(weatherStore.stats24h.avgTemp) + '°F' : 'N/A' }}
            </div>
            <div class="stat-label">Avg Temp</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" :class="{ error: weatherStore.stats24h.outdoorBattery !== null && weatherStore.stats24h.outdoorBattery === 0 }">
              {{ weatherStore.stats24h.outdoorBattery !== null ? (weatherStore.stats24h.outdoorBattery === 1 ? 'OK' : 'Low') : 'N/A' }}
            </div>
            <div class="stat-label">Outdoor Battery</div>
          </div>
        </div>
      </div>
```

**Step 4: Add script to App.vue to fetch stats**

Update `frontend/src/App.vue` script section:

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useWeatherStore } from './stores/weather';

const weatherStore = useWeatherStore();

onMounted(async () => {
  await weatherStore.fetch24hStats();

  // Refresh stats every 5 minutes
  setInterval(() => {
    weatherStore.fetch24hStats();
  }, 5 * 60 * 1000);
});
</script>
```

**Step 5: Build and test**

Run: `cd frontend && npm run build`
Expected: Build succeeds

Test: http://localhost:8000/
Expected: Sidebar shows real statistics

**Step 6: Commit**

```bash
git add frontend/src/App.vue frontend/src/stores/weather.ts
git commit -m "feat: wire up sidebar statistics with 24h data"
```

---

### Task 9: Build and Deploy Phase 2

**Files:**
- Build: `frontend/dist/`

**Step 1: Build production**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 2: Commit**

```bash
git add frontend/dist/
git commit -m "build: update frontend dist with enhanced Home dashboard"
```

**Step 3: Manual testing checklist**

Test:
- [ ] Hero card shows weather condition correctly
- [ ] Timestamp formatted in user timezone
- [ ] Sidebar statistics show real data
- [ ] Auto-refresh works (wait 15s, check for updates)
- [ ] All cards display values
- [ ] Graph icons link to /graphs

---

## Phase 3: Utility Views Implementation

### Task 10: Implement Settings.vue

**Files:**
- Modify: `frontend/src/views/Settings.vue`

**Step 1: Implement Settings page with timezone selection**

Replace `frontend/src/views/Settings.vue`:

```vue
<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Settings</h1>

    <SuccessBanner v-if="showSuccess" :message="successMessage" />
    <ErrorBanner v-if="error" :message="error" :on-retry="loadSettings" dismissible @dismiss="error = null" />

    <!-- Timezone Settings -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Timezone</h2>

      <div class="mb-4">
        <label for="timezone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Display Timezone
        </label>
        <select
          v-model="selectedTimezone"
          id="timezone"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option v-for="tz in commonTimezones" :key="tz" :value="tz">
            {{ tz }}
          </option>
        </select>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Current time: {{ exampleTimestamp }}
        </p>
      </div>

      <button
        @click="saveTimezone"
        :disabled="isSaving"
        class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg"
      >
        {{ isSaving ? 'Saving...' : 'Save Timezone' }}
      </button>
    </div>

    <!-- Display Preferences (Future) -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Display Preferences</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Coming soon: Temperature units, wind speed units, date format
      </p>
    </div>

    <!-- Data Refresh Settings -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Data Refresh</h2>

      <div class="mb-4">
        <label class="flex items-center">
          <input
            v-model="autoRefreshEnabled"
            type="checkbox"
            class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          >
          <span class="text-sm text-gray-700 dark:text-gray-300">Enable auto-refresh</span>
        </label>
      </div>

      <div v-if="autoRefreshEnabled" class="mb-4">
        <label for="refresh-interval" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Refresh Interval
        </label>
        <select
          v-model="refreshInterval"
          id="refresh-interval"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="15000">15 seconds</option>
          <option value="30000">30 seconds</option>
          <option value="60000">60 seconds</option>
        </select>
      </div>

      <button
        @click="saveRefreshSettings"
        class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg"
      >
        Save Refresh Settings
      </button>
    </div>

    <!-- About Section -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">About</h2>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">App Version:</span>
          <span class="text-gray-800 dark:text-white font-medium">1.0.0</span>
        </div>
        <div v-if="dbStats" class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Total Readings:</span>
          <span class="text-gray-800 dark:text-white font-medium">{{ dbStats.total_readings?.toLocaleString() || 'N/A' }}</span>
        </div>
        <div v-if="dbStats" class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Date Range:</span>
          <span class="text-gray-800 dark:text-white font-medium">
            {{ dbStats.oldest_reading ? formatDate(dbStats.oldest_reading) : 'N/A' }} -
            {{ dbStats.newest_reading ? formatDate(dbStats.newest_reading) : 'N/A' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWeatherStore } from '../stores/weather';
import ErrorBanner from '../components/ErrorBanner.vue';
import SuccessBanner from '../components/SuccessBanner.vue';

const weatherStore = useWeatherStore();

const selectedTimezone = ref('UTC');
const isSaving = ref(false);
const error = ref<string | null>(null);
const showSuccess = ref(false);
const successMessage = ref('');

const autoRefreshEnabled = ref(true);
const refreshInterval = ref('15000');

const dbStats = ref<any>(null);

const commonTimezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const exampleTimestamp = computed(() => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: selectedTimezone.value,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  return new Intl.DateTimeFormat('en-US', options).format(now);
});

const loadSettings = async () => {
  try {
    await weatherStore.loadUserSettings();
    selectedTimezone.value = weatherStore.userTimezone;

    // Load refresh settings from localStorage
    const savedAutoRefresh = localStorage.getItem('autoRefreshEnabled');
    const savedInterval = localStorage.getItem('refreshInterval');

    if (savedAutoRefresh !== null) {
      autoRefreshEnabled.value = savedAutoRefresh === 'true';
    }
    if (savedInterval) {
      refreshInterval.value = savedInterval;
    }

    // Load database stats
    const response = await fetch('/api/weather/stats');
    if (response.ok) {
      dbStats.value = await response.json();
    }
  } catch (err) {
    error.value = 'Failed to load settings';
  }
};

const saveTimezone = async () => {
  isSaving.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/settings/timezone', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: selectedTimezone.value }),
    });

    if (!response.ok) {
      throw new Error('Failed to save timezone');
    }

    weatherStore.userTimezone = selectedTimezone.value;
    showSuccess.value = true;
    successMessage.value = 'Timezone saved successfully';

    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isSaving.value = false;
  }
};

const saveRefreshSettings = () => {
  localStorage.setItem('autoRefreshEnabled', autoRefreshEnabled.value.toString());
  localStorage.setItem('refreshInterval', refreshInterval.value);

  showSuccess.value = true;
  successMessage.value = 'Refresh settings saved';

  setTimeout(() => {
    showSuccess.value = false;
  }, 3000);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString();
};

onMounted(() => {
  loadSettings();
});
</script>
```

**Step 2: Build and test**

Run: `cd frontend && npm run build`
Expected: Build succeeds

Test: http://localhost:8000/settings
Expected: Timezone dropdown works, saves successfully

**Step 3: Commit**

```bash
git add frontend/src/views/Settings.vue
git commit -m "feat: implement Settings page with timezone and preferences"
```

---

### Task 11: Implement ImportData.vue

**Files:**
- Modify: `frontend/src/views/ImportData.vue`

**Step 1: Implement CSV import with drag-and-drop**

Replace `frontend/src/views/ImportData.vue`:

```vue
<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Import Data</h1>

    <SuccessBanner v-if="showSuccess" :message="successMessage" />
    <ErrorBanner v-if="error" :message="error" dismissible @dismiss="error = null" />

    <!-- Upload Zone -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">CSV File Upload</h2>

      <div
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        :class="{ 'border-blue-500 bg-blue-50 dark:bg-blue-900': isDragging }"
        class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center transition-colors"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          @change="handleFileSelect"
          class="hidden"
        >

        <div v-if="!isUploading">
          <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Drag and drop your CSV file here, or
            <button
              @click="$refs.fileInput.click()"
              class="text-blue-500 hover:text-blue-600 font-medium"
            >
              browse
            </button>
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
            Maximum file size: 100MB
          </p>
        </div>

        <div v-else class="space-y-4">
          <LoadingSpinner size="lg" message="Uploading and processing..." />
          <div v-if="uploadProgress" class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-blue-500 h-2 rounded-full transition-all"
              :style="{ width: uploadProgress + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Upload Results -->
      <div v-if="uploadResult" class="mt-4 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
        <h3 class="font-semibold text-green-800 dark:text-green-200 mb-2">Import Successful</h3>
        <div class="text-sm text-green-700 dark:text-green-300 space-y-1">
          <p>Records imported: {{ uploadResult.records_imported }}</p>
          <p>Duplicates skipped: {{ uploadResult.duplicates_skipped }}</p>
          <p v-if="uploadResult.errors">Errors: {{ uploadResult.errors }}</p>
        </div>
      </div>
    </div>

    <!-- Recent Imports -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Recent Imports</h2>

      <div v-if="recentImports.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
        No recent imports
      </div>

      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
            <th class="text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Filename</th>
            <th class="text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Records</th>
            <th class="text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="imp in recentImports"
            :key="imp.id"
            class="border-b border-gray-100 dark:border-gray-700"
          >
            <td class="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{{ formatDate(imp.date) }}</td>
            <td class="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{{ imp.filename }}</td>
            <td class="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{{ imp.records }}</td>
            <td class="py-2 px-4 text-sm">
              <span
                :class="{
                  'text-green-600 dark:text-green-400': imp.status === 'success',
                  'text-red-600 dark:text-red-400': imp.status === 'error'
                }"
              >
                {{ imp.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ErrorBanner from '../components/ErrorBanner.vue';
import SuccessBanner from '../components/SuccessBanner.vue';

const isDragging = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const uploadResult = ref<any>(null);
const error = ref<string | null>(null);
const showSuccess = ref(false);
const successMessage = ref('');

interface RecentImport {
  id: string;
  date: string;
  filename: string;
  records: number;
  status: 'success' | 'error';
}

const recentImports = ref<RecentImport[]>([]);

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    uploadFile(files[0]);
  }
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uploadFile(target.files[0]);
  }
};

const uploadFile = async (file: File) => {
  // Validate file
  if (!file.name.endsWith('.csv')) {
    error.value = 'Please upload a CSV file';
    return;
  }

  if (file.size > 100 * 1024 * 1024) {
    error.value = 'File size exceeds 100MB limit';
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;
  uploadResult.value = null;
  error.value = null;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/weather/import', {
      method: 'POST',
      body: formData,
    });

    uploadProgress.value = 100;

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Upload failed');
    }

    const result = await response.json();
    uploadResult.value = result;

    // Save to recent imports
    const importRecord: RecentImport = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      filename: file.name,
      records: result.records_imported || 0,
      status: 'success',
    };

    recentImports.value.unshift(importRecord);
    saveRecentImports();

    showSuccess.value = true;
    successMessage.value = `Successfully imported ${result.records_imported} records`;

    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
  } catch (err) {
    error.value = (err as Error).message;

    const importRecord: RecentImport = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      filename: file.name,
      records: 0,
      status: 'error',
    };

    recentImports.value.unshift(importRecord);
    saveRecentImports();
  } finally {
    isUploading.value = false;
  }
};

const loadRecentImports = () => {
  const saved = localStorage.getItem('recentImports');
  if (saved) {
    recentImports.value = JSON.parse(saved).slice(0, 10);
  }
};

const saveRecentImports = () => {
  localStorage.setItem('recentImports', JSON.stringify(recentImports.value.slice(0, 10)));
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};

onMounted(() => {
  loadRecentImports();
});
</script>
```

**Step 2: Build and test**

Run: `cd frontend && npm run build`
Expected: Build succeeds

Test: http://localhost:8000/import
Expected: Can upload CSV, see progress, view results

**Step 3: Commit**

```bash
git add frontend/src/views/ImportData.vue
git commit -m "feat: implement ImportData page with drag-and-drop CSV upload"
```

---

### Task 12: Implement DataExplorer.vue (Simple Version)

**Files:**
- Modify: `frontend/src/views/DataExplorer.vue`

**Step 1: Create basic data explorer**

Replace `frontend/src/views/DataExplorer.vue`:

```vue
<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Data Explorer</h1>

    <ErrorBanner v-if="error" :message="error" :on-retry="loadData" dismissible @dismiss="error = null" />

    <!-- Query Builder -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Query</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
          <input
            v-model="startDate"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
          <input
            v-model="endDate"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Limit</label>
          <input
            v-model.number="limit"
            type="number"
            min="1"
            max="10000"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
        </div>
      </div>

      <div class="flex gap-4">
        <button
          @click="loadData"
          :disabled="isLoading"
          class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg"
        >
          {{ isLoading ? 'Loading...' : 'Apply Query' }}
        </button>
        <button
          @click="exportData"
          :disabled="!readings.length"
          class="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg"
        >
          Export CSV
        </button>
      </div>
    </div>

    <!-- Results Summary -->
    <div v-if="readings.length > 0" class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-blue-800 dark:text-blue-200">{{ readings.length }}</div>
          <div class="text-sm text-blue-600 dark:text-blue-300">Total Records</div>
        </div>
        <div>
          <div class="text-lg text-blue-800 dark:text-blue-200">{{ formatDate(readings[0]?.timestamp) }}</div>
          <div class="text-sm text-blue-600 dark:text-blue-300">First Record</div>
        </div>
        <div>
          <div class="text-lg text-blue-800 dark:text-blue-200">{{ formatDate(readings[readings.length - 1]?.timestamp) }}</div>
          <div class="text-sm text-blue-600 dark:text-blue-300">Last Record</div>
        </div>
      </div>
    </div>

    <!-- Results Table -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <LoadingSpinner v-if="isLoading" message="Loading data..." />

      <div v-else-if="readings.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
        No data found. Adjust your query and try again.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Timestamp</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Temp (°F)</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Humidity (%)</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Wind (mph)</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Pressure (inHg)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="reading in readings.slice(0, 100)"
              :key="reading.timestamp"
              class="hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{{ formatDateTime(reading.timestamp) }}</td>
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{{ reading.outdoor_temp_f?.toFixed(1) || 'N/A' }}</td>
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{{ reading.humidity_pct || 'N/A' }}</td>
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{{ reading.wind_speed_mph?.toFixed(1) || 'N/A' }}</td>
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{{ reading.relative_pressure_inhg?.toFixed(2) || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="readings.length > 100" class="p-4 bg-gray-50 dark:bg-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
          Showing first 100 of {{ readings.length }} records. Use Export CSV to download all.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ErrorBanner from '../components/ErrorBanner.vue';

const startDate = ref('');
const endDate = ref('');
const limit = ref(1000);
const isLoading = ref(false);
const error = ref<string | null>(null);
const readings = ref<any[]>([]);

const loadData = async () => {
  if (!startDate.value || !endDate.value) {
    error.value = 'Please select both start and end dates';
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams({
      start: new Date(startDate.value).toISOString(),
      end: new Date(endDate.value).toISOString(),
      limit: limit.value.toString(),
    });

    const response = await fetch(`/api/weather/readings?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch readings');
    }

    readings.value = await response.json();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isLoading.value = false;
  }
};

const exportData = () => {
  const params = new URLSearchParams({
    start: new Date(startDate.value).toISOString(),
    end: new Date(endDate.value).toISOString(),
    limit: limit.value.toString(),
  });

  window.location.href = `/api/weather/export?${params}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString();
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString();
};

onMounted(() => {
  const now = new Date();
  endDate.value = now.toISOString().slice(0, 16);
  startDate.value = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
});
</script>
```

**Step 2: Build and test**

Run: `cd frontend && npm run build`
Expected: Build succeeds

Test: http://localhost:8000/explorer
Expected: Can query data, see table, export CSV

**Step 3: Commit**

```bash
git add frontend/src/views/DataExplorer.vue
git commit -m "feat: implement DataExplorer with query and export"
```

---

### Task 13: Implement EnergyAnalysis.vue (Placeholder)

**Files:**
- Modify: `frontend/src/views/EnergyAnalysis.vue`

**Step 1: Create placeholder energy analysis page**

Replace `frontend/src/views/EnergyAnalysis.vue`:

```vue
<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Energy Analysis</h1>

    <div class="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">Coming Soon</h2>
      <p class="text-blue-700 dark:text-blue-300">
        Energy analysis features for solar and wind potential calculations will be available in a future release.
      </p>
      <p class="text-sm text-blue-600 dark:text-blue-400 mt-4">
        This feature will analyze your weather data to estimate solar panel and wind turbine energy production potential.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Solar Analysis</h3>
        <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>✓ Calculate potential solar energy production</li>
          <li>✓ Analyze solar radiation patterns</li>
          <li>✓ Estimate ROI for solar panels</li>
          <li>✓ Daily and monthly production forecasts</li>
        </ul>
      </div>

      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Wind Analysis</h3>
        <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>✓ Calculate wind energy potential</li>
          <li>✓ Analyze wind patterns and consistency</li>
          <li>✓ Estimate turbine efficiency</li>
          <li>✓ Optimal turbine height recommendations</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Energy analysis functionality to be implemented
</script>
```

**Step 2: Build and test**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/views/EnergyAnalysis.vue
git commit -m "feat: add placeholder EnergyAnalysis page"
```

---

### Task 14: Final Build and Testing

**Files:**
- Build: `frontend/dist/`

**Step 1: Final production build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 2: Check bundle size**

Run: `du -sh frontend/dist/`
Expected: < 2MB

**Step 3: Commit final build**

```bash
git add frontend/dist/
git commit -m "build: final production build with all views complete"
```

**Step 4: Comprehensive manual testing**

Test all pages:
- [ ] Home: Hero card, weather cards, sidebar stats, auto-refresh
- [ ] Graphs: All 7 charts render, date filtering works, zoom/pan functional
- [ ] Settings: Timezone saves, preferences display
- [ ] Import: CSV upload works, progress shown, results displayed
- [ ] Explorer: Query works, table displays, export downloads
- [ ] Analysis: Placeholder page displays

Test navigation:
- [ ] All sidebar links work
- [ ] Graph icons on Home link to Graphs sections
- [ ] Browser back/forward works
- [ ] URL parameters persist

Test responsive:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete UX modernization - all views implemented"
```

---

## Success Criteria

### Phase 1 Complete:
✅ All 8 chart types render with real data
✅ Date range filtering works with presets
✅ Custom date picker functional
✅ Synchronized zoom/pan across charts
✅ Stats badges calculate correctly
✅ URL parameters sync
✅ Loading and error states work

### Phase 2 Complete:
✅ Hero card shows live weather data
✅ All 8 weather cards display correct values
✅ Sidebar statistics show real data
✅ Graph icons link to correct sections
✅ Auto-refresh works without flashing
✅ Weather condition logic works

### Phase 3 Complete:
✅ Settings page saves preferences
✅ Timezone selection works
✅ Import page handles CSV uploads
✅ Data Explorer queries and exports
✅ Energy Analysis placeholder ready
✅ All shared components reusable

### Overall Success:
✅ All pages functional and polished
✅ No console errors in production
✅ Responsive on all screen sizes
✅ Build size < 2MB
✅ Performance targets met
✅ All manual tests passing
