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

    <!-- Solar Analysis -->
    <div v-if="activeTab === 'solar'" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Solar Energy Potential</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Estimate production and ROI from recorded solar radiation data.
      </p>

      <!-- Date Range -->
      <fieldset class="mb-5">
        <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Analysis Period</legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start</label>
            <input v-model="solarForm.start" type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">End</label>
            <input v-model="solarForm.end" type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        </div>
      </fieldset>

      <!-- Panel Configuration -->
      <fieldset class="mb-5">
        <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Panel Configuration</legend>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Panel Area (m²)</label>
            <input v-model.number="solarForm.panelArea" type="number" step="0.5" min="0"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Panel Efficiency (%)</label>
            <input v-model.number="solarForm.efficiencyPct" type="number" step="0.1" min="0" max="100"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Tilt/Orientation Loss (%)</label>
            <input v-model.number="solarForm.tiltLossPct" type="number" step="0.5" min="0" max="50"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        </div>
      </fieldset>

      <!-- Financial Parameters -->
      <fieldset class="mb-6">
        <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Financial Parameters</legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Electricity Cost ($/kWh)</label>
            <input v-model.number="solarForm.electricityCost" type="number" step="0.01" min="0"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">System Cost ($/m² of panel)</label>
            <input v-model.number="solarForm.systemCostPerM2" type="number" step="10" min="0"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        </div>
      </fieldset>

      <button @click="runSolarAnalysis" :disabled="solarLoading"
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-md transition-colors">
        {{ solarLoading ? 'Analyzing...' : 'Run Solar Analysis' }}
      </button>

      <!-- Solar Results -->
      <div v-if="solarResults" class="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Results</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-xs text-gray-500 dark:text-gray-400">Total Energy</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ solarResults.total_kwh.toFixed(2) }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">kWh</p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-xs text-gray-500 dark:text-gray-400">Daily Average</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ solarResults.daily_avg_kwh.toFixed(2) }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">kWh/day</p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-xs text-gray-500 dark:text-gray-400">Effective Efficiency</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ solarResults.data.effective_efficiency_pct?.toFixed(1) ?? '-' }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">%</p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-xs text-gray-500 dark:text-gray-400">Annual Projection</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ solarResults.roi?.annual_kwh?.toFixed(0) ?? '-' }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">kWh/yr</p>
          </div>
        </div>

        <!-- ROI -->
        <div v-if="solarResults.roi" class="bg-white dark:bg-gray-800 p-4 rounded-md mb-4">
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Return on Investment</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Annual Savings</p>
              <p class="font-bold text-green-600 dark:text-green-400">${{ solarResults.roi.annual_cost_savings.toFixed(2) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">System Cost</p>
              <p class="font-bold text-gray-900 dark:text-white">${{ solarResults.roi.estimated_system_cost.toFixed(0) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Payback Period</p>
              <p class="font-bold text-gray-900 dark:text-white">{{ solarResults.roi.payback_years.toFixed(1) }} yr</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Readings / Days</p>
              <p class="font-bold text-gray-900 dark:text-white">{{ solarResults.data.num_readings }} / {{ solarResults.data.num_days }}</p>
            </div>
          </div>
        </div>

        <!-- Monthly breakdown -->
        <details v-if="solarResults.monthly_breakdown?.length" class="bg-white dark:bg-gray-800 p-4 rounded-md">
          <summary class="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">Monthly Breakdown</summary>
          <table class="mt-3 w-full text-sm">
            <thead>
              <tr class="text-xs text-gray-500 dark:text-gray-400 text-left">
                <th class="pb-1">Month</th>
                <th class="pb-1 text-right">kWh</th>
                <th class="pb-1 text-right">Savings</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in solarResults.monthly_breakdown" :key="row.month" class="border-t border-gray-100 dark:border-gray-700">
                <td class="py-1 text-gray-700 dark:text-gray-300">{{ row.month }}</td>
                <td class="py-1 text-right text-gray-900 dark:text-white">{{ row.kwh.toFixed(2) }}</td>
                <td class="py-1 text-right text-green-600 dark:text-green-400">${{ row.cost_savings.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </details>
      </div>

      <div v-if="solarError" class="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p class="text-red-800 dark:text-red-200">{{ solarError }}</p>
      </div>
    </div>

    <!-- Wind Analysis -->
    <div v-if="activeTab === 'wind'" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Wind Energy Potential</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Estimate turbine output and ROI from recorded wind speed data.
      </p>

      <!-- Date Range -->
      <fieldset class="mb-5">
        <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Analysis Period</legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start</label>
            <input v-model="windForm.start" type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">End</label>
            <input v-model="windForm.end" type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        </div>
      </fieldset>

      <!-- Turbine Configuration -->
      <fieldset class="mb-5">
        <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Turbine Configuration</legend>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Turbine Model</label>
            <select v-model="windForm.turbineModel"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="generic_5kw">Generic 5 kW</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Hub Height (m)</label>
            <input v-model.number="windForm.hubHeightM" type="number" step="1" min="1"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Station Anemometer Height (m)</label>
            <input v-model.number="windForm.measurementHeightM" type="number" step="0.5" min="0.1"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Cut-in Speed (mph) <span class="text-gray-400">(blank = model default)</span></label>
            <input v-model.number="windForm.cutInMph" type="number" step="0.1" min="0" placeholder="model default"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400" />
          </div>
        </div>
      </fieldset>

      <!-- Financial Parameters -->
      <fieldset class="mb-6">
        <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Financial Parameters</legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Electricity Cost ($/kWh)</label>
            <input v-model.number="windForm.electricityCost" type="number" step="0.01" min="0"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">System Cost ($/rated kW)</label>
            <input v-model.number="windForm.systemCostPerKw" type="number" step="100" min="0"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        </div>
      </fieldset>

      <button @click="runWindAnalysis" :disabled="windLoading"
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-md transition-colors">
        {{ windLoading ? 'Analyzing...' : 'Run Wind Analysis' }}
      </button>

      <!-- Wind Results -->
      <div v-if="windResults" class="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Results</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-xs text-gray-500 dark:text-gray-400">Total Energy</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ windResults.total_kwh.toFixed(2) }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">kWh</p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-xs text-gray-500 dark:text-gray-400">Daily Average</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ windResults.daily_avg_kwh.toFixed(2) }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">kWh/day</p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-xs text-gray-500 dark:text-gray-400">Avg Wind Speed</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ windResults.data.avg_wind_speed?.toFixed(1) ?? '-' }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">mph</p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-md">
            <p class="text-xs text-gray-500 dark:text-gray-400">Capacity Factor</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ windResults.data.capacity_factor_pct?.toFixed(1) ?? '-' }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">%</p>
          </div>
        </div>

        <!-- Secondary stats -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-md mb-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Annual Projection</p>
              <p class="font-bold text-gray-900 dark:text-white">{{ windResults.roi?.annual_kwh?.toFixed(0) ?? '-' }} kWh/yr</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Operational Hours</p>
              <p class="font-bold text-gray-900 dark:text-white">{{ windResults.data.operational_hours?.toFixed(1) ?? '-' }} hr</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Cut-in Speed</p>
              <p class="font-bold text-gray-900 dark:text-white">{{ windResults.data.cut_in_mph?.toFixed(1) ?? '-' }} mph</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Readings / Days</p>
              <p class="font-bold text-gray-900 dark:text-white">{{ windResults.data.num_readings }} / {{ windResults.data.num_days }}</p>
            </div>
          </div>
        </div>

        <!-- ROI -->
        <div v-if="windResults.roi" class="bg-white dark:bg-gray-800 p-4 rounded-md mb-4">
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Return on Investment</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Annual Savings</p>
              <p class="font-bold text-green-600 dark:text-green-400">${{ windResults.roi.annual_cost_savings.toFixed(2) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">System Cost</p>
              <p class="font-bold text-gray-900 dark:text-white">${{ windResults.roi.estimated_system_cost.toFixed(0) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Payback Period</p>
              <p class="font-bold text-gray-900 dark:text-white">{{ windResults.roi.payback_years.toFixed(1) }} yr</p>
            </div>
          </div>
        </div>

        <!-- Monthly breakdown -->
        <details v-if="windResults.monthly_breakdown?.length" class="bg-white dark:bg-gray-800 p-4 rounded-md">
          <summary class="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">Monthly Breakdown</summary>
          <table class="mt-3 w-full text-sm">
            <thead>
              <tr class="text-xs text-gray-500 dark:text-gray-400 text-left">
                <th class="pb-1">Month</th>
                <th class="pb-1 text-right">kWh</th>
                <th class="pb-1 text-right">Savings</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in windResults.monthly_breakdown" :key="row.month" class="border-t border-gray-100 dark:border-gray-700">
                <td class="py-1 text-gray-700 dark:text-gray-300">{{ row.month }}</td>
                <td class="py-1 text-right text-gray-900 dark:text-white">{{ row.kwh.toFixed(2) }}</td>
                <td class="py-1 text-right text-green-600 dark:text-green-400">${{ row.cost_savings.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </details>
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

const solarForm = ref({
  start: '',
  end: '',
  panelArea: 20.0,
  efficiencyPct: 20.0,
  tiltLossPct: 10.0,
  electricityCost: 0.12,
  systemCostPerM2: 200,
});

const solarLoading = ref(false);
const solarResults = ref<any>(null);
const solarError = ref<string | null>(null);

const windForm = ref({
  start: '',
  end: '',
  turbineModel: 'generic_5kw',
  hubHeightM: 10,
  measurementHeightM: 2,
  cutInMph: null as number | null,
  electricityCost: 0.12,
  systemCostPerKw: 5000,
});

const windLoading = ref(false);
const windResults = ref<any>(null);
const windError = ref<string | null>(null);

onMounted(() => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  solarForm.value.start = fmt(thirtyDaysAgo);
  solarForm.value.end = fmt(now);
  windForm.value.start = fmt(thirtyDaysAgo);
  windForm.value.end = fmt(now);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: new Date(solarForm.value.start).toISOString(),
        end: new Date(solarForm.value.end).toISOString(),
        config: {
          panel_area_m2: solarForm.value.panelArea,
          efficiency_pct: solarForm.value.efficiencyPct,
          tilt_loss_pct: solarForm.value.tiltLossPct,
          electricity_cost_per_kwh: solarForm.value.electricityCost,
          system_cost_per_m2: solarForm.value.systemCostPerM2,
        },
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Analysis failed');
    }
    solarResults.value = await response.json();
  } catch (error: any) {
    solarError.value = `Solar analysis failed: ${error.message}`;
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
    const config: Record<string, any> = {
      turbine_model: windForm.value.turbineModel,
      hub_height_m: windForm.value.hubHeightM,
      measurement_height_m: windForm.value.measurementHeightM,
      electricity_cost_per_kwh: windForm.value.electricityCost,
      system_cost_per_kw: windForm.value.systemCostPerKw,
    };
    if (windForm.value.cutInMph !== null && windForm.value.cutInMph !== undefined) {
      config.cut_in_mph = windForm.value.cutInMph;
    }
    const response = await fetch('/api/analysis/wind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: new Date(windForm.value.start).toISOString(),
        end: new Date(windForm.value.end).toISOString(),
        config,
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Analysis failed');
    }
    windResults.value = await response.json();
  } catch (error: any) {
    windError.value = `Wind analysis failed: ${error.message}`;
  } finally {
    windLoading.value = false;
  }
}
</script>
