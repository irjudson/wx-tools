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