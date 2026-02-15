<template>
  <section class="p-6 bg-white dark:bg-gray-800 shadow rounded-lg">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Current Conditions</h2>

    <!-- Hero Current Conditions -->
    <div v-if="weatherStore.latestReading" class="flex flex-col md:flex-row bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-lg shadow-lg mb-6">
      <div class="flex-1 flex items-center mb-4 md:mb-0">
        <div class="flex items-start mr-4">
          <span class="text-6xl font-bold">{{ Math.round(weatherStore.latestReading.outdoor_temp_f) }}</span>
          <span class="text-3xl">°F</span>
        </div>
        <div class="flex flex-col">
          <span class="text-xl">{{ weatherCondition.icon }} {{ weatherCondition.condition }}</span>
          <span class="block text-lg">Feels like {{ Math.round(weatherStore.latestReading.feels_like_f) }}°F</span>
          <span class="block text-sm opacity-80 mt-1">{{ formattedLastUpdated }}</span>
        </div>
      </div>
      <div class="flex-1 grid grid-cols-3 gap-4 border-l border-indigo-400 pl-4">
        <div class="flex items-center space-x-2">
          <span class="text-2xl">💧</span>
          <div class="flex flex-col">
            <span class="block text-xl font-semibold">{{ weatherStore.latestReading.humidity_pct }}%</span>
            <span class="text-sm opacity-80">Humidity</span>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-2xl">🌬️</span>
          <div class="flex flex-col">
            <span class="block text-xl font-semibold">{{ weatherStore.latestReading?.wind_speed_mph != null ? weatherStore.latestReading.wind_speed_mph.toFixed(1) : '--' }} mph</span>
            <span class="text-sm opacity-80">Wind</span>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-2xl">🌡️</span>
          <div class="flex flex-col">
            <span class="block text-xl font-semibold">{{ weatherStore.latestReading?.relative_pressure_inhg != null ? weatherStore.latestReading.relative_pressure_inhg.toFixed(2) : '--' }} inHg</span>
            <span class="text-sm opacity-80">Pressure</span>
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
      <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-4">
          <span class="text-2xl mr-2">🌡️</span>
          <span class="text-xl font-semibold">Outdoor</span>
        </div>
        <div class="flex items-baseline mb-4">
          <span class="text-5xl font-bold">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.outdoor_temp_f) : '--' }}</span>
          <span class="text-2xl">°F</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Dew Point</span>
            <span class="font-medium">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.dew_point_f) : '--' }}°F</span>
          </div>
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Feels Like</span>
            <span class="font-medium">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.feels_like_f) : '--' }}°F</span>
          </div>
          <div class="col-span-2">
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">From Yesterday</span>
            <span class="font-medium text-green-500">--</span>
          </div>
        </div>
        <div class="mb-4">
          <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>today</span>
            <span>Min <span id="outdoor-min-range">--</span> Max <span id="outdoor-max-range">--</span></span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div class="bg-blue-500 h-2 rounded-full" style="width: 100%;"></div>
          </div>
        </div>
        <div class="flex justify-end">
          <router-link to="/graphs#section-outdoor" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Indoor Card -->
      <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-4">
          <span class="text-2xl mr-2">🏠</span>
          <span class="text-xl font-semibold">Indoor</span>
        </div>
        <div class="flex justify-between items-baseline mb-4">
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Temperature</span>
            <span class="text-3xl font-bold">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.indoor_temp_f) : '--' }}°F</span>
          </div>
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Humidity</span>
            <span class="text-3xl font-bold">{{ weatherStore.latestReading ? weatherStore.latestReading.indoor_humidity_pct : '--' }}%</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Dew Point</span>
            <span class="font-medium">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.indoor_dew_point_f) : '--' }}°F</span>
          </div>
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Feels Like</span>
            <span class="font-medium">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.indoor_feels_like_f) : '--' }}°F</span>
          </div>
        </div>
        <div class="mb-4">
          <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>today</span>
            <span>Min <span id="indoor-min-range">--</span> Max <span id="indoor-max-range">--</span></span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div class="bg-blue-500 h-2 rounded-full" style="width: 100%;"></div>
          </div>
        </div>
        <div class="flex justify-end">
          <router-link to="/graphs#section-indoor" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Wind Card -->
      <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-4">
          <span class="text-2xl mr-2">💨</span>
          <span class="text-xl font-semibold">Wind</span>
        </div>
        <div class="relative w-full p-4 flex justify-center items-center flex-1">
          <canvas id="wind-circular-gauge" class="w-full h-32"></canvas>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">From</span>
            <span class="font-medium">{{ windDirectionFormatted }}</span>
          </div>
          <div>
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Gusts</span>
            <span class="font-medium">{{ weatherStore.latestReading?.wind_gust_mph != null ? weatherStore.latestReading.wind_gust_mph.toFixed(1) : '--' }} mph</span>
          </div>
        </div>
        <div class="flex justify-end">
          <router-link to="/graphs#section-wind-speed" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Wind Rose -->
      <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-4">
          <span class="text-2xl mr-2">🧭</span>
          <span class="text-xl font-semibold">Wind Rose</span>
        </div>
        <canvas id="wind-rose" class="w-full h-48 mb-4"></canvas>
        <div class="flex justify-end">
          <router-link to="/graphs#section-wind-direction" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Rainfall Card with 3-Cylinder Graph -->
      <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-4">
          <span class="text-2xl mr-2">💧</span>
          <span class="text-xl font-semibold">Rainfall</span>
        </div>
        <div class="flex justify-around items-end mb-4 h-32">
          <div class="flex flex-col items-center">
            <div class="relative w-8 h-full bg-blue-200 dark:bg-blue-800 rounded-t-full overflow-hidden">
              <div id="rain-today-fill" class="w-full bg-blue-500 absolute bottom-0" :style="{ height: rainTodayFillHeight }"></div>
            </div>
            <span class="mt-2 text-sm font-medium">{{ weatherStore.latestReading?.daily_rain_in != null ? weatherStore.latestReading.daily_rain_in.toFixed(2) : '--' }}</span>
            <span class="text-xs text-gray-500">Today</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="relative w-8 h-full bg-blue-200 dark:bg-blue-800 rounded-t-full overflow-hidden">
              <div id="rain-weekly-fill" class="w-full bg-blue-500 absolute bottom-0" :style="{ height: rainWeeklyFillHeight }"></div>
            </div>
            <span class="mt-2 text-sm font-medium">{{ weatherStore.latestReading?.weekly_rain_in != null ? weatherStore.latestReading.weekly_rain_in.toFixed(2) : '--' }}</span>
            <span class="text-xs text-gray-500">Weekly</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="relative w-8 h-full bg-blue-200 dark:bg-blue-800 rounded-t-full overflow-hidden">
              <div id="rain-monthly-fill" class="w-full bg-blue-500 absolute bottom-0" :style="{ height: rainMonthlyFillHeight }"></div>
            </div>
            <span class="mt-2 text-sm font-medium">{{ weatherStore.latestReading?.monthly_rain_in != null ? weatherStore.latestReading.monthly_rain_in.toFixed(2) : '--' }}</span>
            <span class="text-xs text-gray-500">Monthly</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
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
          <router-link to="/graphs#section-rainfall" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Pressure Card with Circular Gauge -->
      <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-4">
          <span class="text-2xl mr-2">🌡️</span>
          <span class="text-xl font-semibold">Pressure</span>
        </div>
        <div class="text-center mb-4">
          <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Trend</span>
          <span class="text-lg font-medium">Steady</span>
        </div>
        <div class="relative w-full p-4 flex justify-center items-center flex-1">
          <canvas id="pressure-gauge" class="w-full h-32"></canvas>
        </div>
        <div class="flex justify-end">
          <router-link to="/graphs#section-pressure" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Solar/UV Card -->
      <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col justify-between">
        <div class="flex items-center mb-4">
          <span class="text-2xl mr-2">☀️</span>
          <span class="text-xl font-semibold">Solar Radiation</span>
        </div>
        <div class="flex flex-col items-center mb-4">
          <div class="text-center mb-2">
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">Solar Radiation</span>
            <span class="text-lg font-medium">{{ weatherStore.latestReading?.solar_radiation_wm2 != null ? weatherStore.latestReading.solar_radiation_wm2.toFixed(1) : '--' }} W/m²</span>
          </div>
          <div class="text-center">
            <span class="block text-xs uppercase text-gray-500 dark:text-gray-400">UV Index</span>
            <span class="text-lg font-medium">{{ uvIndexFormatted }}</span>
          </div>
        </div>
        <canvas id="solar-uv-sparkline" class="w-full h-20 mb-4"></canvas>
        <div class="flex justify-end">
          <router-link to="/graphs#section-solar" class="text-blue-500 hover:text-blue-600" title="View detailed graphs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Outdoor Conditions</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Temperature (°F)</h3>
        <canvas id="outdoor-temp-chart" ref="outdoorTempChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Humidity (%)</h3>
        <canvas id="outdoor-humidity-chart" ref="outdoorHumidityChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Feels Like (°F)</h3>
        <canvas id="feels-like-chart" ref="feelsLikeChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Dew Point (°F)</h3>
        <canvas id="dew-point-chart" ref="dewPointChartRef" class="w-full h-64"></canvas>
      </div>
    </div>

    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Wind Conditions</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Wind Speed (mph)</h3>
        <canvas id="wind-speed-chart" ref="windSpeedChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-gray-white">Wind Gust (mph)</h3>
        <canvas id="wind-gust-chart" ref="windGustChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Max Daily Gust (mph)</h3>
        <canvas id="max-gust-chart" ref="maxGustChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Wind Direction (°)</h3>
        <canvas id="wind-direction-chart" ref="windDirectionChartRef" class="w-full h-64"></canvas>
      </div>
    </div>

    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Atmospheric Pressure</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Relative Pressure (inHg)</h3>
        <canvas id="relative-pressure-chart" ref="relativePressureChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Absolute Pressure (inHg)</h3>
        <canvas id="absolute-pressure-chart" ref="absolutePressureChartRef" class="w-full h-64"></canvas>
      </div>
    </div>

    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Solar & UV</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Solar Radiation (W/m²)</h3>
        <canvas id="solar-radiation-chart" ref="solarRadiationChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">UV Index</h3>
        <canvas id="uv-index-chart" ref="uvIndexChartRef" class="w-full h-64"></canvas>
      </div>
    </div>

    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Precipitation</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Hourly Rain (in/hr)</h3>
        <canvas id="hourly-rain-chart" ref="hourlyRainChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Daily Rain (in)</h3>
        <canvas id="daily-rain-chart" ref="dailyRainChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Event Rain (in)</h3>
        <canvas id="event-rain-chart" ref="eventRainChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Weekly Rain (in)</h3>
        <canvas id="weekly-rain-chart" ref="weeklyRainChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Monthly Rain (in)</h3>
        <canvas id="monthly-rain-chart" ref="monthlyRainChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Yearly Rain (in)</h3>
        <canvas id="yearly-rain-chart" ref="yearlyRainChartRef" class="w-full h-64"></canvas>
      </div>
    </div>

    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Indoor Conditions</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Indoor Temperature (°F)</h3>
        <canvas id="indoor-temp-chart" ref="indoorTempChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Indoor Humidity (%)</h3>
        <canvas id="indoor-humidity-chart" ref="indoorHumidityChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Indoor Feels Like (°F)</h3>
        <canvas id="indoor-feels-like-chart" ref="indoorFeelsLikeChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Indoor Dew Point (°F)</h3>
        <canvas id="indoor-dew-point-chart" ref="indoorDewPointChartRef" class="w-full h-64"></canvas>
      </div>
    </div>

    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Sensor 1 (External Sensor)</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Sensor 1 Temperature (°F)</h3>
        <canvas id="sensor1-temp-chart" ref="sensor1TempChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Sensor 1 Humidity (%)</h3>
        <canvas id="sensor1-humidity-chart" ref="sensor1HumidityChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Sensor 1 Feels Like (°F)</h3>
        <canvas id="sensor1-feels-like-chart" ref="sensor1FeelsLikeChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Sensor 1 Dew Point (°F)</h3>
        <canvas id="sensor1-dew-point-chart" ref="sensor1DewPointChartRef" class="w-full h-64"></canvas>
      </div>
    </div>

    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">System Status</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Outdoor Battery</h3>
        <canvas id="outdoor-battery-chart" ref="outdoorBatteryChartRef" class="w-full h-64"></canvas>
      </div>
      <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-white">Sensor 1 Battery</h3>
        <canvas id="sensor1-battery-chart" ref="sensor1BatteryChartRef" class="w-full h-64"></canvas>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useWeatherStore } from '../stores/weather';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useChart } from '../composables/useChart';
import type { WeatherReading } from '../types/weather';
import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import type { ChartTypeRegistry } from 'chart.js';


Chart.register(...registerables); // Register all Chart.js components

const weatherStore = useWeatherStore();

// Initial data load and auto-refresh management
onMounted(async () => {
  await weatherStore.loadUserSettings();
  await weatherStore.fetchLatestReading();
  weatherStore.startDashboardAutoRefresh();
});

onUnmounted(() => {
  weatherStore.stopDashboardAutoRefresh();
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

const maxRainfall = computed(() => {
    if (!weatherStore.latestReading) return 0.1; // Default to small value to avoid division by zero
    const data = weatherStore.latestReading;
    return Math.max(
        data.daily_rain_in || 0,
        data.weekly_rain_in || 0,
        data.monthly_rain_in || 0,
        0.1 // Ensure it's never zero
    );
});

const rainTodayFillHeight = computed(() => {
    if (!weatherStore.latestReading || weatherStore.latestReading.daily_rain_in === null) return '0%';
    return `${(weatherStore.latestReading.daily_rain_in / maxRainfall.value) * 100}%`;
});

const rainWeeklyFillHeight = computed(() => {
    if (!weatherStore.latestReading || weatherStore.latestReading.weekly_rain_in === null) return '0%';
    return `${(weatherStore.latestReading.weekly_rain_in / maxRainfall.value) * 100}%`;
});

const rainMonthlyFillHeight = computed(() => {
    if (!weatherStore.latestReading || weatherStore.latestReading.monthly_rain_in === null) return '0%';
    return `${(weatherStore.latestReading.monthly_rain_in / maxRainfall.value) * 100}%`;
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

// --- Chart Logic ---
const { canvasRef: outdoorTempChartRef, initChart: initOutdoorTempChart, updateChart: updateOutdoorTempChart } = useChart();
const { canvasRef: outdoorHumidityChartRef, initChart: initOutdoorHumidityChart, updateChart: updateOutdoorHumidityChart } = useChart();
const { canvasRef: feelsLikeChartRef, initChart: initFeelsLikeChart, updateChart: updateFeelsLikeChart } = useChart();
const { canvasRef: dewPointChartRef, initChart: initDewPointChart, updateChart: updateDewPointChart } = useChart();
const { canvasRef: windSpeedChartRef, initChart: initWindSpeedChart, updateChart: updateWindSpeedChart } = useChart();
const { canvasRef: windGustChartRef, initChart: initWindGustChart, updateChart: updateWindGustChart } = useChart();
const { canvasRef: maxGustChartRef, initChart: initMaxGustChart, updateChart: updateMaxGustChart } = useChart();
const { canvasRef: windDirectionChartRef, initChart: initWindDirectionChart, updateChart: updateWindDirectionChart } = useChart();
const { canvasRef: relativePressureChartRef, initChart: initRelativePressureChart, updateChart: updateRelativePressureChart } = useChart();
const { canvasRef: absolutePressureChartRef, initChart: initAbsolutePressureChart, updateChart: updateAbsolutePressureChart } = useChart();
const { canvasRef: solarRadiationChartRef, initChart: initSolarRadiationChart, updateChart: updateSolarRadiationChart } = useChart();
const { canvasRef: uvIndexChartRef, initChart: initUvIndexChart, updateChart: updateUvIndexChart } = useChart();
const { canvasRef: hourlyRainChartRef, initChart: initHourlyRainChart, updateChart: updateHourlyRainChart } = useChart();
const { canvasRef: dailyRainChartRef, initChart: initDailyRainChart, updateChart: updateDailyRainChart } = useChart();
const { canvasRef: eventRainChartRef, initChart: initEventRainChart, updateChart: updateEventRainChart } = useChart();
const { canvasRef: weeklyRainChartRef, initChart: initWeeklyRainChart, updateChart: updateWeeklyRainChart } = useChart();
const { canvasRef: monthlyRainChartRef, initChart: initMonthlyRainChart, updateChart: updateMonthlyRainChart } = useChart();
const { canvasRef: yearlyRainChartRef, initChart: initYearlyRainChart, updateChart: updateYearlyRainChart } = useChart();
const { canvasRef: indoorTempChartRef, initChart: initIndoorTempChart, updateChart: updateIndoorTempChart } = useChart();
const { canvasRef: indoorHumidityChartRef, initChart: initIndoorHumidityChart, updateChart: updateIndoorHumidityChart } = useChart();
const { canvasRef: indoorFeelsLikeChartRef, initChart: initIndoorFeelsLikeChart, updateChart: updateIndoorFeelsLikeChart } = useChart();
const { canvasRef: indoorDewPointChartRef, initChart: initIndoorDewPointChart, updateChart: updateIndoorDewPointChart } = useChart();
const { canvasRef: sensor1TempChartRef, initChart: initSensor1TempChart, updateChart: updateSensor1TempChart } = useChart();
const { canvasRef: sensor1HumidityChartRef, initChart: initSensor1HumidityChart, updateChart: updateSensor1HumidityChart } = useChart();
const { canvasRef: sensor1FeelsLikeChartRef, initChart: initSensor1FeelsLikeChart, updateChart: updateSensor1FeelsLikeChart } = useChart();
const { canvasRef: sensor1DewPointChartRef, initChart: initSensor1DewPointChart, updateChart: updateSensor1DewPointChart } = useChart();
const { canvasRef: outdoorBatteryChartRef, initChart: initOutdoorBatteryChart, updateChart: updateOutdoorBatteryChart } = useChart();
const { canvasRef: sensor1BatteryChartRef, initChart: initSensor1BatteryChart, updateChart: updateSensor1BatteryChart } = useChart();

const outdoorTempChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.outdoor_temp_f] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Temperature (°F)',
        data: data,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const outdoorHumidityChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.humidity_pct] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Humidity (%)',
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
          max: 100,
        }
      }
    }
  };
});

const feelsLikeChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.feels_like_f] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Feels Like (°F)',
        data: data,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const dewPointChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.dew_point_f] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Dew Point (°F)',
        data: data,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const windSpeedChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.wind_speed_mph] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Wind Speed (mph)',
        data: data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const windGustChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.wind_gust_mph] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Wind Gust (mph)',
        data: data,
        borderColor: '#14b8a6',
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const maxGustChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.max_daily_gust_mph] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Max Daily Gust (mph)',
        data: data,
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const windDirectionChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.wind_direction_deg] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Wind Direction (°)',
        data: data,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
          min: 0,
          max: 360,
        }
      }
    }
  };
});

const relativePressureChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.relative_pressure_inhg] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Relative Pressure (inHg)',
        data: data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const absolutePressureChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.absolute_pressure_inhg] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Absolute Pressure (inHg)',
        data: data,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const solarRadiationChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.solar_radiation_wm2] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Solar Radiation (W/m²)',
        data: data,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const uvIndexChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.uv_index] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'UV Index',
        data: data,
        borderColor: '#eab308',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const hourlyRainChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.rain_rate_in_hr] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Hourly Rain (in/hr)',
        data: data,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const dailyRainChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.daily_rain_in] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Rain (in)',
        data: data,
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const eventRainChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.event_rain_in] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Event Rain (in)',
        data: data,
        borderColor: '#0369a1',
        backgroundColor: 'rgba(3, 105, 161, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const weeklyRainChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.weekly_rain_in] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Weekly Rain (in)',
        data: data,
        borderColor: '#075985',
        backgroundColor: 'rgba(7, 89, 133, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const monthlyRainChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.monthly_rain_in] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Monthly Rain (in)',
        data: data,
        borderColor: '#0c4a6e',
        backgroundColor: 'rgba(12, 74, 110, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const yearlyRainChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.yearly_rain_in] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Yearly Rain (in)',
        data: data,
        borderColor: '#0f172a',
        backgroundColor: 'rgba(15, 23, 42, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const indoorTempChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.indoor_temp_f] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Indoor Temperature (°F)',
        data: data,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const indoorHumidityChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.indoor_humidity_pct] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Indoor Humidity (%)',
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
          max: 100,
        }
      }
    }
  };
});

const indoorFeelsLikeChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.indoor_feels_like_f] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Indoor Feels Like (°F)',
        data: data,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const indoorDewPointChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.indoor_dew_point_f] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Indoor Dew Point (°F)',
        data: data,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const sensor1TempChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.temp_f_1] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sensor 1 Temperature (°F)',
        data: data,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const sensor1HumidityChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.humidity_1] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sensor 1 Humidity (%)',
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
          max: 100,
        }
      }
    }
  };
});

const sensor1FeelsLikeChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.feels_like_1] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sensor 1 Feels Like (°F)',
        data: data,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const sensor1DewPointChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.dew_point_1f] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sensor 1 Dew Point (°F)',
        data: data,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: false,
        }
      }
    }
  };
});

const outdoorBatteryChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.battery_voltage] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Outdoor Battery Voltage (V)',
        data: data,
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});

const sensor1BatteryChartConfig = computed<ChartConfiguration<'line'>>(() => {
  const data = weatherStore.latestReading ? [weatherStore.latestReading.battery_1] : [];
  const labels = weatherStore.latestReading ? [formattedLastUpdated.value] : [];

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sensor 1 Battery (V)',
        data: data,
        borderColor: '#fcd34d',
        backgroundColor: 'rgba(252, 211, 77, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          display: true,
          type: 'category',
          labels: labels,
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
        }
      }
    }
  };
});


watch(outdoorTempChartConfig, (newConfig) => {
  updateOutdoorTempChart(newConfig);
});

watch(outdoorHumidityChartConfig, (newConfig) => {
  updateOutdoorHumidityChart(newConfig);
});

watch(feelsLikeChartConfig, (newConfig) => {
  updateFeelsLikeChart(newConfig);
});

watch(dewPointChartConfig, (newConfig) => {
  updateDewPointChart(newConfig);
});

watch(windSpeedChartConfig, (newConfig) => {
  updateWindSpeedChart(newConfig);
});

watch(windGustChartConfig, (newConfig) => {
  updateWindGustChart(newConfig);
});

watch(maxGustChartConfig, (newConfig) => {
  updateMaxGustChart(newConfig);
});

watch(windDirectionChartConfig, (newConfig) => {
  updateWindDirectionChart(newConfig);
});

watch(relativePressureChartConfig, (newConfig) => {
  updateRelativePressureChart(newConfig);
});

watch(absolutePressureChartConfig, (newConfig) => {
  updateAbsolutePressureChart(newConfig);
});

watch(solarRadiationChartConfig, (newConfig) => {
  updateSolarRadiationChart(newConfig);
});

watch(uvIndexChartConfig, (newConfig) => {
  updateUvIndexChart(newConfig);
});

watch(hourlyRainChartConfig, (newConfig) => {
  updateHourlyRainChart(newConfig);
});

watch(dailyRainChartConfig, (newConfig) => {
  updateDailyRainChart(newConfig);
});

watch(eventRainChartConfig, (newConfig) => {
  updateEventRainChart(newConfig);
});

watch(weeklyRainChartConfig, (newConfig) => {
  updateWeeklyRainChart(newConfig);
});

watch(monthlyRainChartConfig, (newConfig) => {
  updateMonthlyRainChart(newConfig);
});

watch(yearlyRainChartConfig, (newConfig) => {
  updateYearlyRainChart(newConfig);
});

watch(indoorTempChartConfig, (newConfig) => {
  updateIndoorTempChart(newConfig);
});

watch(indoorHumidityChartConfig, (newConfig) => {
  updateIndoorHumidityChart(newConfig);
});

watch(indoorFeelsLikeChartConfig, (newConfig) => {
  updateIndoorFeelsLikeChart(newConfig);
});

watch(indoorDewPointChartConfig, (newConfig) => {
  updateIndoorDewPointChart(newConfig);
});

watch(sensor1TempChartConfig, (newConfig) => {
  updateSensor1TempChart(newConfig);
});

watch(sensor1HumidityChartConfig, (newConfig) => {
  updateSensor1HumidityChart(newConfig);
});

watch(sensor1FeelsLikeChartConfig, (newConfig) => {
  updateSensor1FeelsLikeChart(newConfig);
});

watch(sensor1DewPointChartConfig, (newConfig) => {
  updateSensor1DewPointChart(newConfig);
});

watch(outdoorBatteryChartConfig, (newConfig) => {
  updateOutdoorBatteryChart(newConfig);
});

watch(sensor1BatteryChartConfig, (newConfig) => {
  updateSensor1BatteryChart(newConfig);
});


onMounted(() => {
  if (weatherStore.latestReading) {
    initOutdoorTempChart(outdoorTempChartConfig.value);
    initOutdoorHumidityChart(outdoorHumidityChartConfig.value);
    initFeelsLikeChart(feelsLikeChartConfig.value);
    initDewPointChart(dewPointChartConfig.value);
    initWindSpeedChart(windSpeedChartConfig.value);
    initWindGustChart(windGustChartConfig.value);
    initMaxGustChart(maxGustChartConfig.value);
    initWindDirectionChart(windDirectionChartConfig.value);
    initRelativePressureChart(relativePressureChartConfig.value);
    initAbsolutePressureChart(absolutePressureChartConfig.value);
    initSolarRadiationChart(solarRadiationChartConfig.value);
    initUvIndexChart(uvIndexChartConfig.value);
    initHourlyRainChart(hourlyRainChartConfig.value);
    initDailyRainChart(dailyRainChartConfig.value);
    initEventRainChart(eventRainChartConfig.value);
    initWeeklyRainChart(weeklyRainChartConfig.value);
    initMonthlyRainChart(monthlyRainChartConfig.value);
    initYearlyRainChart(yearlyRainChartConfig.value);
    initIndoorTempChart(indoorTempChartConfig.value);
    initIndoorHumidityChart(indoorHumidityChartConfig.value);
    initIndoorFeelsLikeChart(indoorFeelsLikeChartConfig.value);
    initIndoorDewPointChart(indoorDewPointChartConfig.value);
    initSensor1TempChart(sensor1TempChartConfig.value);
    initSensor1HumidityChart(sensor1HumidityChartConfig.value);
    initSensor1FeelsLikeChart(sensor1FeelsLikeChartConfig.value);
    initSensor1DewPointChart(sensor1DewPointChartConfig.value);
    initOutdoorBatteryChart(outdoorBatteryChartConfig.value);
    initSensor1BatteryChart(sensor1BatteryChartConfig.value);
  }
});
</script>
