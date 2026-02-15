import { setActivePinia, createPinia } from 'pinia';
import { useWeatherStore } from './weather';
import type { WeatherReading } from '../types/weather';
import { beforeEach, describe, it, expect, vi } from 'vitest';

describe('weather store', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let weatherStore: ReturnType<typeof useWeatherStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockFetch = vi.fn();
    window.fetch = mockFetch; // Set window.fetch for all tests (JSDOM environment)
    mockFetch.mockReset(); // Reset mocks before each test
    weatherStore = useWeatherStore(); // Instantiate store once per test
  });

  // Helper to create mock weather data
  const createMockWeatherData = (timestamp: string, outdoorTemp: number): WeatherReading => ({
    timestamp,
    outdoor_temp_f: outdoorTemp,
    humidity_pct: 60,
    feels_like_f: 72.1,
    dew_point_f: 55.2,
    wind_speed_mph: 10.3,
    wind_gust_mph: 15.7,
    max_daily_gust_mph: 20.1,
    wind_direction_deg: 270,
    relative_pressure_inhg: 29.92,
    absolute_pressure_inhg: 29.80,
    solar_radiation_wm2: 500,
    uv_index: 5,
    rain_rate_in_hr: 0,
    daily_rain_in: 0.1,
    weekly_rain_in: 0.5,
    monthly_rain_in: 1.2,
    yearly_rain_in: 12.5,
    event_rain_in: 0,
    indoor_temp_f: 72.0,
    indoor_humidity_pct: 45,
    indoor_feels_like_f: 72.0,
    indoor_dew_point_f: 50.0,
    temp_f_1: 68.0,
    humidity_1: 50,
    feels_like_1: 68.0,
    dew_point_1f: 48.0,
    battery_voltage: 3.5,
    battery_1: 3.0,
  });

  it('initializes with default state', () => {
    expect(weatherStore.latestReading).toBeNull();
    expect(weatherStore.isLoading).toBe(false);
    expect(weatherStore.error).toBeNull();
    expect(weatherStore.userTimezone).toBe('UTC'); // Default timezone
  });

  it('fetches latest reading successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:00Z', 70.5)),
    });
    await weatherStore.fetchLatestReading();

    expect(weatherStore.isLoading).toBe(false);
    expect(weatherStore.error).toBeNull();
    expect(weatherStore.latestReading).not.toBeNull();
    expect(weatherStore.latestReading?.outdoor_temp_f).toBe(70.5);
    expect(mockFetch).toHaveBeenCalledWith('/api/weather/latest');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('handles fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Error fetching data' }),
    });

    await weatherStore.fetchLatestReading();

    expect(weatherStore.isLoading).toBe(false);
    expect(weatherStore.error).not.toBeNull();
    expect(weatherStore.error?.message).toBe('Failed to fetch latest reading');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('loads and saves user settings', async () => {
    // Mock for initial loadUserSettings (before any save)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ timezone: 'America/New_York' }),
    });
    // Mock for saveUserSettings (POST)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Settings saved' }),
    });
    // Mock for loadUserSettings after save (GET)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ timezone: 'Europe/Berlin' }), // New timezone after saving
    });

    // 1. Load initial user settings
    await weatherStore.loadUserSettings();
    expect(weatherStore.userTimezone).toBe('America/New_York');
    expect(mockFetch).toHaveBeenCalledWith('/api/settings');
    expect(mockFetch).toHaveBeenCalledTimes(1);


    // 2. Save new user settings
    weatherStore.userTimezone = 'Europe/Berlin';
    await weatherStore.saveUserSettings();
    expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: 'Europe/Berlin' }),
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);


    // 3. Load user settings again to verify the saved setting
    await weatherStore.loadUserSettings();
    expect(weatherStore.userTimezone).toBe('Europe/Berlin'); // Should be the new timezone
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('starts and stops auto-refresh', async () => {
    vi.useFakeTimers();

    // Mock all expected fetch calls in sequence
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:00Z', 70.0)),
      }) // 1st call: Initial fetchLatestReading
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:15Z', 71.0)),
      }) // 2nd call: Immediate checkForNewData
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:30Z', 72.0)),
      }) // 3rd call: First interval checkForNewData
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:45Z', 73.0)),
      }) // 4th call: Second interval checkForNewData
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:01:00Z', 74.0)), // 5th call: Unaccounted extra call
      });


    await weatherStore.fetchLatestReading();
    expect(weatherStore.latestReading?.outdoor_temp_f).toBe(70.0);
    expect(mockFetch).toHaveBeenCalledTimes(1);


    weatherStore.startDashboardAutoRefresh();
    await vi.runOnlyPendingTimers(); // Resolve promise from immediate checkForNewData and first setInterval
    await Promise.resolve(); // Flush microtasks

    // After start, checkForNewData is called once immediately AND once by the first interval
    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + immediate checkForNewData + first setInterval call
    expect(weatherStore.latestReading?.outdoor_temp_f).toBe(72.0); // Should be data from the 3rd mockResolvedValueOnce

    await vi.advanceTimersToNextTimer(); // Trigger second interval
    await Promise.resolve(); // Flush microtasks

    expect(mockFetch).toHaveBeenCalledTimes(4); // + 1 interval call
    expect(weatherStore.latestReading?.outdoor_temp_f).toBe(73.0);

    weatherStore.stopDashboardAutoRefresh();
    await vi.advanceTimersToNextTimer(); // Advance timers to ensure no more calls
    await Promise.resolve(); // Flush microtasks
    expect(mockFetch).toHaveBeenCalledTimes(4); // No more calls after stopping

    vi.useRealTimers();
  });

  it('does not auto-refresh if no new data is available', async () => {
    vi.useFakeTimers();

    // Mock all expected fetch calls in sequence
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:00Z', 70.0)),
      }) // 1st call: Initial fetchLatestReading
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:00Z', 70.0)),
      }) // 2nd call: Immediate checkForNewData (no new data)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:00Z', 70.0)),
      }) // 3rd call: First interval checkForNewData (no new data)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:00Z', 70.0)),
      }); // 4th call: Second interval checkForNewData (no new data)


    await weatherStore.fetchLatestReading();
    expect(weatherStore.latestReading?.outdoor_temp_f).toBe(70.0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    weatherStore.startDashboardAutoRefresh();
    await vi.runOnlyPendingTimers(); // Resolve immediate call and first setInterval
    await Promise.resolve(); // Flush microtasks

    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + immediate + first interval
    expect(weatherStore.latestReading?.outdoor_temp_f).toBe(70.0); // Should not update

    await vi.advanceTimersToNextTimer(); // Trigger second interval
    await Promise.resolve(); // Flush microtasks

    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(weatherStore.latestReading?.outdoor_temp_f).toBe(70.0); // Should not update

    vi.useRealTimers();
  });

  it('updates data if new data is available during auto-refresh', async () => {
    vi.useFakeTimers();

    // Mock all expected fetch calls in sequence
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:00Z', 70.0)),
      }) // 1st call: Initial fetchLatestReading
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:15Z', 75.0)),
      }) // 2nd call: Immediate checkForNewData (new data)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockWeatherData('2026-02-13T10:00:30Z', 78.0)),
      }); // 3rd call: First interval checkForNewData (new data)


    await weatherStore.fetchLatestReading();
    expect(weatherStore.latestReading?.outdoor_temp_f).toBe(70.0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    weatherStore.startDashboardAutoRefresh();
    await vi.runOnlyPendingTimers(); // Resolve immediate call and first setInterval
    await Promise.resolve(); // Flush microtasks

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(weatherStore.latestReading?.outdoor_temp_f).toBe(78.0); // Should update from 3rd mock

    vi.useRealTimers();
  });
});
