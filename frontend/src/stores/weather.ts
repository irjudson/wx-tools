import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { WeatherReading } from '../types/weather';

export const useWeatherStore = defineStore('weather', () => {
  const latestReading = ref<WeatherReading | null>(null);
  const userTimezone = ref('UTC');
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  let dashboardRefreshInterval: number | null = null;
  const lastKnownTimestamp = ref<string | null>(null);

  // Load user settings, particularly timezone
  async function loadUserSettings() {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        console.warn('Failed to load user settings, using UTC');
        userTimezone.value = 'UTC';
        return;
      }
      const data = await response.json();
      userTimezone.value = data.timezone || 'UTC';
      console.log(`Loaded timezone: ${userTimezone.value}`);
    } catch (err) {
      console.error('Failed to load user settings:', err as Error);
      userTimezone.value = 'UTC';
    }
  }

  // Fetch the latest weather reading
  async function fetchLatestReading() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetch('/api/weather/latest');
      if (!response.ok) {
        throw new Error('Failed to fetch latest reading');
      }
      const data = await response.json();
      latestReading.value = data;
      lastKnownTimestamp.value = data.timestamp; // Update last known timestamp
    } catch (err) {
      error.value = err as Error;
      console.error('Error fetching latest reading:', err as Error);
    } finally {
      isLoading.value = false;
    }
  }

  // Auto-refresh logic
  async function checkForNewData() {
    try {
      const response = await fetch('/api/weather/latest');
      if (!response.ok) return;

      const data = await response.json();
      const currentTimestamp = data.timestamp;

      if (lastKnownTimestamp.value === null) {
        lastKnownTimestamp.value = currentTimestamp;
        return;
      }

      if (currentTimestamp !== lastKnownTimestamp.value) {
        latestReading.value = data; // Update store with new data
        lastKnownTimestamp.value = currentTimestamp;
      }
    } catch (err) {
      console.error('Failed to check for new data:', err as Error);
    }
  }

  function startDashboardAutoRefresh() {
    if (dashboardRefreshInterval) {
      clearInterval(dashboardRefreshInterval);
    }
    console.log('Starting dashboard auto-refresh...');
    checkForNewData(); // Call immediately
    dashboardRefreshInterval = setInterval(async () => {
      await checkForNewData();
    }, 15000); // Check every 15 seconds
  }

  function stopDashboardAutoRefresh() {
    if (dashboardRefreshInterval) {
      clearInterval(dashboardRefreshInterval);
      dashboardRefreshInterval = null;
    }
    lastKnownTimestamp.value = null;
    console.log('Stopping dashboard auto-refresh.');
  }


  // Save user settings, particularly timezone
  async function saveUserSettings() {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone: userTimezone.value }),
      });
      if (!response.ok) {
        throw new Error('Failed to save user settings');
      }
      console.log(`Saved timezone: ${userTimezone.value}`);
    } catch (err) {
      console.error('Failed to save user settings:', err as Error);
    }
  }

  // Initial load when store is created (will be handled by components using onMounted)
  // loadUserSettings();
  // fetchLatestReading();

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

  return {
    latestReading,
    userTimezone,
    isLoading,
    error,
    loadUserSettings,
    saveUserSettings, // Make sure to expose it
    fetchLatestReading,
    startDashboardAutoRefresh,
    stopDashboardAutoRefresh,
    checkForNewData, // Expose checkForNewData for testing
    // New exports for charts
    sampledReadings,
    isLoadingCharts,
    chartsError,
    chartMetadata,
    fetchSampledReadings,
  };
});
