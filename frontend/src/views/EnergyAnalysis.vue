<template>
  <div class="p-4 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Energy Analysis</h1>

    <!-- Tab Navigation -->
    <div class="flex border-b border-gray-300 dark:border-gray-700 mb-6">
      <button
        @click="activeTab = 'solar'"
        :class="[
          'px-6 py-3 font-semibold transition-colors',
          activeTab === 'solar'
            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        ]"
      >
        Solar Analysis
      </button>
      <button
        @click="activeTab = 'wind'"
        :class="[
          'px-6 py-3 font-semibold transition-colors',
          activeTab === 'wind'
            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        ]"
      >
        Wind Analysis
      </button>
    </div>

    <!-- Solar Analysis Form -->
    <div v-if="activeTab === 'solar'" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Solar Energy Potential</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-6">
        Analyze solar energy potential based on recorded solar radiation data.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date & Time
          </label>
          <input
            v-model="solarForm.start"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date & Time
          </label>
          <input
            v-model="solarForm.end"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Panel Area (m²)
          </label>
          <input
            v-model.number="solarForm.panelArea"
            type="number"
            step="0.1"
            min="0"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Efficiency (%)
          </label>
          <input
            v-model.number="solarForm.efficiency"
            type="number"
            step="0.1"
            min="0"
            max="100"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <button
        @click="runSolarAnalysis"
        :disabled="solarLoading"
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-md transition-colors"
      >
        {{ solarLoading ? 'Analyzing...' : 'Run Solar Analysis' }}
      </button>

      <!-- Solar Results -->
      <div v-if="solarResults" class="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Solar Analysis Results</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-sm text-gray-600 dark:text-gray-400">Total Energy</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ solarResults.total_kwh.toFixed(2) }} kWh
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-sm text-gray-600 dark:text-gray-400">Daily Average</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ solarResults.daily_avg_kwh.toFixed(2) }} kWh/day
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-sm text-gray-600 dark:text-gray-400">Effective Efficiency</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ solarResults.data.effective_efficiency_pct?.toFixed(1) ?? '-' }}%
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-sm text-gray-600 dark:text-gray-400">Annual Projection</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ solarResults.roi?.annual_kwh?.toFixed(0) ?? '-' }} kWh/yr
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md col-span-full">
            <p class="text-sm text-gray-600 dark:text-gray-400">Analysis Period</p>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ formatDateTime(solarResults.start_date) }} to {{ formatDateTime(solarResults.end_date) }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {{ solarResults.data.num_readings }} readings analyzed over {{ solarResults.data.num_days }} days
            </p>
          </div>
          <div v-if="solarResults.roi" class="bg-white dark:bg-gray-800 p-4 rounded-md col-span-full">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Return on Investment</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span class="text-gray-600 dark:text-gray-400">Annual Savings:</span>
                <span class="ml-2 font-semibold text-gray-900 dark:text-white">${{ solarResults.roi.annual_cost_savings.toFixed(2) }}</span>
              </div>
              <div>
                <span class="text-gray-600 dark:text-gray-400">System Cost:</span>
                <span class="ml-2 font-semibold text-gray-900 dark:text-white">${{ solarResults.roi.estimated_system_cost.toFixed(0) }}</span>
              </div>
              <div>
                <span class="text-gray-600 dark:text-gray-400">Payback Period:</span>
                <span class="ml-2 font-semibold text-gray-900 dark:text-white">{{ solarResults.roi.payback_years.toFixed(1) }} years</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="solarError" class="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p class="text-red-800 dark:text-red-200">{{ solarError }}</p>
      </div>
    </div>

    <!-- Wind Analysis Form -->
    <div v-if="activeTab === 'wind'" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Wind Energy Potential</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-6">
        Analyze wind energy potential based on recorded wind speed data.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date & Time
          </label>
          <input
            v-model="windForm.start"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date & Time
          </label>
          <input
            v-model="windForm.end"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rotor Diameter (m)
          </label>
          <input
            v-model.number="windForm.rotorDiameter"
            type="number"
            step="0.1"
            min="0"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Efficiency (%)
          </label>
          <input
            v-model.number="windForm.efficiency"
            type="number"
            step="0.1"
            min="0"
            max="100"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <button
        @click="runWindAnalysis"
        :disabled="windLoading"
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-md transition-colors"
      >
        {{ windLoading ? 'Analyzing...' : 'Run Wind Analysis' }}
      </button>

      <!-- Wind Results -->
      <div v-if="windResults" class="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Wind Analysis Results</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-sm text-gray-600 dark:text-gray-400">Total Energy</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ windResults.total_kwh.toFixed(2) }} kWh
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-sm text-gray-600 dark:text-gray-400">Daily Average</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ windResults.daily_avg_kwh.toFixed(2) }} kWh/day
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-sm text-gray-600 dark:text-gray-400">Average Wind Speed</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ windResults.data.avg_wind_speed?.toFixed(1) ?? '-' }} mph
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-sm text-gray-600 dark:text-gray-400">Annual Projection</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ windResults.roi?.annual_kwh?.toFixed(0) ?? '-' }} kWh/yr
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md col-span-full">
            <p class="text-sm text-gray-600 dark:text-gray-400">Analysis Period</p>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ formatDateTime(windResults.start_date) }} to {{ formatDateTime(windResults.end_date) }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {{ windResults.data.num_readings }} readings analyzed over {{ windResults.data.num_days }} days
            </p>
          </div>
          <div v-if="windResults.roi" class="bg-white dark:bg-gray-800 p-4 rounded-md col-span-full">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Return on Investment</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span class="text-gray-600 dark:text-gray-400">Annual Savings:</span>
                <span class="ml-2 font-semibold text-gray-900 dark:text-white">${{ windResults.roi.annual_cost_savings.toFixed(2) }}</span>
              </div>
              <div>
                <span class="text-gray-600 dark:text-gray-400">System Cost:</span>
                <span class="ml-2 font-semibold text-gray-900 dark:text-white">${{ windResults.roi.estimated_system_cost.toFixed(0) }}</span>
              </div>
              <div>
                <span class="text-gray-600 dark:text-gray-400">Payback Period:</span>
                <span class="ml-2 font-semibold text-gray-900 dark:text-white">{{ windResults.roi.payback_years.toFixed(1) }} years</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="windError" class="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p class="text-red-800 dark:text-red-200">{{ windError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const activeTab = ref<'solar' | 'wind'>('solar');

// Solar form state
const solarForm = ref({
  start: '',
  end: '',
  panelArea: 10.0,
  efficiency: 20.0,
});

const solarLoading = ref(false);
const solarResults = ref<any>(null);
const solarError = ref<string | null>(null);

// Wind form state
const windForm = ref({
  start: '',
  end: '',
  rotorDiameter: 3.0,
  efficiency: 35.0,
});

const windLoading = ref(false);
const windResults = ref<any>(null);
const windError = ref<string | null>(null);

// Initialize date inputs with last 30 days
onMounted(() => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  solarForm.value.start = formatDateTimeLocal(thirtyDaysAgo);
  solarForm.value.end = formatDateTimeLocal(now);
  windForm.value.start = formatDateTimeLocal(thirtyDaysAgo);
  windForm.value.end = formatDateTimeLocal(now);
});

async function runSolarAnalysis() {
  if (!solarForm.value.start || !solarForm.value.end) {
    solarError.value = 'Please select start and end dates';
    return;
  }

  solarLoading.value = true;
  solarError.value = null;
  solarResults.value = null;

  try {
    const response = await fetch('/api/analysis/solar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start: new Date(solarForm.value.start).toISOString(),
        end: new Date(solarForm.value.end).toISOString(),
        config: {
          panel_area_m2: solarForm.value.panelArea,
          efficiency_percent: solarForm.value.efficiency,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Analysis failed');
    }

    solarResults.value = await response.json();
  } catch (error: any) {
    solarError.value = `Solar analysis failed: ${error.message}`;
    console.error('Solar analysis error:', error);
  } finally {
    solarLoading.value = false;
  }
}

async function runWindAnalysis() {
  if (!windForm.value.start || !windForm.value.end) {
    windError.value = 'Please select start and end dates';
    return;
  }

  windLoading.value = true;
  windError.value = null;
  windResults.value = null;

  try {
    const response = await fetch('/api/analysis/wind', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start: new Date(windForm.value.start).toISOString(),
        end: new Date(windForm.value.end).toISOString(),
        config: {
          rotor_diameter_m: windForm.value.rotorDiameter,
          efficiency_percent: windForm.value.efficiency,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Analysis failed');
    }

    windResults.value = await response.json();
  } catch (error: any) {
    windError.value = `Wind analysis failed: ${error.message}`;
    console.error('Wind analysis error:', error);
  } finally {
    windLoading.value = false;
  }
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString();
}
</script>
