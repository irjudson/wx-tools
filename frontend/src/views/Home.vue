<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">

    <!-- Offline banner -->
    <div v-if="isOffline"
      class="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm">
      <NavIcons name="wifi-off" :size="16" />
      <span>Offline — showing last reading from {{ formattedLastUpdated }}</span>
    </div>

    <!-- ── Condition Banner (full width) ── -->
    <div v-if="weatherStore.latestReading"
      :class="['bg-gradient-to-br w-full px-6 py-8 md:py-10', conditionTheme.gradient]">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center md:gap-10">

          <!-- Left: main condition -->
          <div :class="['flex items-center gap-5 mb-6 md:mb-0', conditionTheme.textColor]">
            <span class="text-6xl md:text-7xl select-none">{{ weatherCondition.icon }}</span>
            <div>
              <div class="text-4xl md:text-6xl font-extrabold leading-none tracking-tight">
                {{ Math.round(weatherStore.latestReading.outdoor_temp_f) }}<span class="text-2xl md:text-3xl font-semibold align-top mt-1 inline-block">°F</span>
              </div>
              <div class="text-lg font-semibold mt-1 opacity-90">{{ weatherCondition.condition }}</div>
              <div class="text-sm opacity-70 mt-0.5">
                Feels like {{ Math.round(weatherStore.latestReading.feels_like_f) }}°F · {{ formattedLastUpdated }}
              </div>
            </div>
          </div>

          <!-- Right: quick stats row (desktop only) -->
          <div :class="['hidden md:grid grid-cols-3 gap-6 flex-1 md:border-l md:pl-10 md:border-white/20', conditionTheme.textColor]">
            <div class="flex flex-col">
              <span class="text-xs uppercase tracking-widest opacity-70 font-semibold">Humidity</span>
              <span class="text-2xl font-bold">{{ weatherStore.latestReading.humidity_pct }}%</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs uppercase tracking-widest opacity-70 font-semibold">Wind</span>
              <span class="text-2xl font-bold">
                {{ weatherStore.latestReading?.wind_speed_mph != null ? weatherStore.latestReading.wind_speed_mph.toFixed(1) : '--' }} mph
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs uppercase tracking-widest opacity-70 font-semibold">Pressure</span>
              <span class="text-2xl font-bold">
                {{ weatherStore.latestReading?.relative_pressure_inhg != null ? weatherStore.latestReading.relative_pressure_inhg.toFixed(2) : '--' }} inHg
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading / error states -->
    <div v-else-if="weatherStore.isLoading" class="p-10 text-center text-gray-500 dark:text-gray-400">
      Loading current conditions…
    </div>
    <div v-else-if="weatherStore.error" class="p-10 text-center text-red-500">
      Error: {{ weatherStore.error.message }}
    </div>
    <div v-else class="p-10 text-center text-gray-500 dark:text-gray-400">
      No weather data available.
    </div>

    <div class="max-w-7xl mx-auto px-4 py-6">

      <!-- ── Mobile: Scrollable Stats List ── -->
      <div class="md:hidden space-y-2 mb-6">
        <h2 class="text-sm uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-3">All Readings</h2>

        <!-- Outdoor Temp -->
        <div class="metric-card temp flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-amber-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Outdoor Temp</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.outdoor_temp_f) : '--' }}</span>
              <span class="metric-unit">°F</span>
            </div>
          </div>
          <div class="text-right pr-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">Feels like</div>
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.feels_like_f) : '--' }}°F
            </div>
          </div>
          <span :class="['text-lg font-bold', tempTrendColor]">{{ tempTrendArrow }}</span>
        </div>

        <!-- Indoor Temp -->
        <div class="metric-card indoor flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-violet-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Indoor</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.indoor_temp_f) : '--' }}</span>
              <span class="metric-unit">°F</span>
            </div>
          </div>
          <div class="text-right pr-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">Humidity</div>
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {{ weatherStore.latestReading ? weatherStore.latestReading.indoor_humidity_pct : '--' }}%
            </div>
          </div>
        </div>

        <!-- Wind -->
        <div class="metric-card wind flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-sky-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Wind</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.wind_speed_mph != null ? weatherStore.latestReading.wind_speed_mph.toFixed(1) : '--' }}</span>
              <span class="metric-unit">mph</span>
            </div>
          </div>
          <div class="text-right pr-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">{{ windDirectionFormatted }}</div>
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Gust: {{ weatherStore.latestReading?.wind_gust_mph != null ? weatherStore.latestReading.wind_gust_mph.toFixed(1) : '--' }} mph
            </div>
          </div>
          <span :class="['severity-badge', windSeverity]">{{ windLabel }}</span>
        </div>

        <!-- Rain -->
        <div class="metric-card rain flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-indigo-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
            <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
            <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
            <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Rainfall</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.daily_rain_in != null ? weatherStore.latestReading.daily_rain_in.toFixed(2) : '--' }}</span>
              <span class="metric-unit">in today</span>
            </div>
          </div>
          <div class="text-right pr-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">Rate</div>
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {{ weatherStore.latestReading?.rain_rate_in_hr != null ? weatherStore.latestReading.rain_rate_in_hr.toFixed(2) : '--' }} in/hr
            </div>
          </div>
        </div>

        <!-- Humidity -->
        <div class="metric-card humidity flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-blue-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Humidity</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading ? weatherStore.latestReading.humidity_pct : '--' }}</span>
              <span class="metric-unit">%</span>
            </div>
          </div>
        </div>

        <!-- Pressure -->
        <div class="metric-card pressure flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-teal-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Pressure</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.relative_pressure_inhg != null ? weatherStore.latestReading.relative_pressure_inhg.toFixed(2) : '--' }}</span>
              <span class="metric-unit">inHg</span>
            </div>
          </div>
          <span :class="['font-semibold text-sm', pressureTrend.color]">{{ pressureTrend.icon }} {{ pressureTrend.text }}</span>
        </div>

        <!-- UV Index -->
        <div class="metric-card uv flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-orange-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">UV Index</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.uv_index != null ? weatherStore.latestReading.uv_index.toFixed(1) : '--' }}</span>
            </div>
          </div>
          <span :class="['severity-badge', uvSeverityClass]">{{ uvLabel }}</span>
        </div>

        <!-- Solar Radiation -->
        <div class="metric-card solar flex-row items-center gap-4 pl-5">
          <svg class="metric-icon text-yellow-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <div class="flex-1">
            <div class="metric-label">Solar Radiation</div>
            <div class="flex items-baseline gap-1">
              <span class="metric-value">{{ weatherStore.latestReading?.solar_radiation_wm2 != null ? weatherStore.latestReading.solar_radiation_wm2.toFixed(0) : '--' }}</span>
              <span class="metric-unit">W/m²</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Desktop: Card Grid ── -->
      <div class="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

        <!-- Outdoor Temp Card -->
        <div class="metric-card temp">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
            </svg>
            <span class="metric-label">Outdoor Temp</span>
            <span :class="['ml-auto font-bold', tempTrendColor]">{{ tempTrendArrow }}</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.outdoor_temp_f) : '--' }}</span>
            <span class="metric-unit">°F</span>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div>
              <div class="metric-label">Humidity</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading ? weatherStore.latestReading.humidity_pct : '--' }}%</div>
            </div>
            <div>
              <div class="metric-label">Feels Like</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.feels_like_f) : '--' }}°F</div>
            </div>
          </div>
          <router-link to="/graphs" class="mt-auto pt-2 text-amber-500 hover:text-amber-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Indoor Card -->
        <div class="metric-card indoor">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-violet-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span class="metric-label">Indoor</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading ? Math.round(weatherStore.latestReading.indoor_temp_f) : '--' }}</span>
            <span class="metric-unit">°F</span>
          </div>
          <div class="mt-2">
            <div class="metric-label">Humidity</div>
            <div class="metric-secondary font-semibold text-xl">{{ weatherStore.latestReading ? weatherStore.latestReading.indoor_humidity_pct : '--' }}%</div>
          </div>
          <router-link to="/graphs" class="mt-auto pt-2 text-violet-500 hover:text-violet-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Wind Card -->
        <div class="metric-card wind">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-sky-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
            </svg>
            <span class="metric-label">Wind</span>
            <span :class="['ml-auto severity-badge', windSeverity]">{{ windLabel }}</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading?.wind_speed_mph != null ? weatherStore.latestReading.wind_speed_mph.toFixed(1) : '--' }}</span>
            <span class="metric-unit">mph</span>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div>
              <div class="metric-label">From</div>
              <div class="metric-secondary font-semibold">{{ windDirectionFormatted }}</div>
            </div>
            <div>
              <div class="metric-label">Gusts</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading?.wind_gust_mph != null ? weatherStore.latestReading.wind_gust_mph.toFixed(1) : '--' }} mph</div>
            </div>
          </div>
          <div class="relative h-24 mt-2">
            <canvas id="wind-rose" ref="windRoseRef"></canvas>
          </div>
          <router-link to="/graphs" class="mt-auto pt-1 text-sky-500 hover:text-sky-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Rainfall Card -->
        <div class="metric-card rain">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
              <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
              <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
              <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
            </svg>
            <span class="metric-label">Rainfall</span>
          </div>
          <div class="flex justify-around items-end h-14 mb-2">
            <div class="flex flex-col items-center gap-1">
              <div class="w-7 rounded-t-full overflow-hidden flex-1 flex flex-col justify-end" style="min-height: 8px;">
                <div :class="['rounded-t-full', (weatherStore.latestReading?.daily_rain_in ?? 0) > 0 ? 'bg-indigo-500' : 'bg-indigo-200 dark:bg-indigo-900']" style="height: 100%"></div>
              </div>
              <span class="text-xs font-semibold">{{ weatherStore.latestReading?.daily_rain_in != null ? weatherStore.latestReading.daily_rain_in.toFixed(2) : '--' }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Today</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-7 rounded-t-full overflow-hidden flex-1 flex flex-col justify-end" style="min-height: 8px;">
                <div :class="['rounded-t-full', (weatherStore.latestReading?.weekly_rain_in ?? 0) > 0 ? 'bg-indigo-400' : 'bg-indigo-200 dark:bg-indigo-900']" style="height: 100%"></div>
              </div>
              <span class="text-xs font-semibold">{{ weatherStore.latestReading?.weekly_rain_in != null ? weatherStore.latestReading.weekly_rain_in.toFixed(2) : '--' }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Week</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-7 rounded-t-full overflow-hidden flex-1 flex flex-col justify-end" style="min-height: 8px;">
                <div :class="['rounded-t-full', (weatherStore.latestReading?.monthly_rain_in ?? 0) > 0 ? 'bg-indigo-300' : 'bg-indigo-200 dark:bg-indigo-900']" style="height: 100%"></div>
              </div>
              <span class="text-xs font-semibold">{{ weatherStore.latestReading?.monthly_rain_in != null ? weatherStore.latestReading.monthly_rain_in.toFixed(2) : '--' }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Month</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-1">
            <div>
              <div class="metric-label">Rate</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading?.rain_rate_in_hr != null ? weatherStore.latestReading.rain_rate_in_hr.toFixed(2) : '--' }} in/hr</div>
            </div>
            <div>
              <div class="metric-label">Event</div>
              <div class="metric-secondary font-semibold">{{ weatherStore.latestReading?.event_rain_in ? weatherStore.latestReading.event_rain_in.toFixed(2) : '--' }} in</div>
            </div>
          </div>
          <router-link to="/graphs" class="mt-auto pt-2 text-indigo-500 hover:text-indigo-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Pressure Card -->
        <div class="metric-card pressure">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-teal-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span class="metric-label">Pressure</span>
            <span :class="['ml-auto text-sm font-semibold', pressureTrend.color]">{{ pressureTrend.icon }} {{ pressureTrend.text }}</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading?.relative_pressure_inhg != null ? weatherStore.latestReading.relative_pressure_inhg.toFixed(2) : '--' }}</span>
            <span class="metric-unit">inHg</span>
          </div>
          <div class="mt-2">
            <div class="metric-label">Absolute</div>
            <div class="metric-secondary font-semibold">{{ weatherStore.latestReading?.absolute_pressure_inhg != null ? weatherStore.latestReading.absolute_pressure_inhg.toFixed(2) : '--' }} inHg</div>
          </div>
          <router-link to="/graphs" class="mt-auto pt-2 text-teal-500 hover:text-teal-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

        <!-- Solar & UV Card -->
        <div class="metric-card solar">
          <div class="flex items-center gap-2 mb-1">
            <svg class="metric-icon text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <span class="metric-label">Solar & UV</span>
            <span :class="['ml-auto severity-badge', uvSeverityClass]">{{ uvLabel }}</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="metric-value">{{ weatherStore.latestReading?.solar_radiation_wm2 != null ? weatherStore.latestReading.solar_radiation_wm2.toFixed(0) : '--' }}</span>
            <span class="metric-unit">W/m²</span>
          </div>
          <div class="mt-2">
            <div class="metric-label">UV Index</div>
            <div class="metric-secondary font-semibold">{{ uvIndexFormatted }}</div>
          </div>
          <div class="h-8 mt-2">
            <canvas id="solar-uv-sparkline" ref="solarSparklineRef" class="w-full h-full"></canvas>
          </div>
          <router-link to="/graphs" class="mt-auto pt-1 text-yellow-500 hover:text-yellow-600 self-end">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </router-link>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWeatherStore } from '../stores/weather';
import { computed, onMounted, onUnmounted, ref, watch, markRaw } from 'vue';
import type { WeatherReading } from '../types/weather';
import { Chart, registerables } from 'chart.js';
import NavIcons from '../components/NavIcons.vue';
import { useConditionTheme } from '../composables/useConditionTheme';

Chart.register(...registerables);

const weatherStore = useWeatherStore();
const { getConditionTheme } = useConditionTheme();

// Historical data for charts and statistics (last 24 hours)
const historicalReadings = ref<WeatherReading[]>([]);

const fetchHistoricalData = async () => {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    await weatherStore.fetchSampledReadings(start, end, 100);
    historicalReadings.value = weatherStore.sampledReadings;

    if (windRoseRef.value && historicalReadings.value.length > 0) {
      if (!windRoseChart) {
        initWindRose();
      } else {
        updateWindRose();
      }
    }

    if (solarSparklineRef.value && historicalReadings.value.length > 0) {
      if (!solarSparklineChart) {
        initSolarSparkline();
      } else {
        updateSolarSparkline();
      }
    }
  } catch (err) {
    console.error('Failed to fetch historical data:', err);
  }
};

const dailyStats = computed(() => {
  if (historicalReadings.value.length === 0) {
    return {
      outdoor: { min: null, max: null, avg: null },
      indoor: { min: null, max: null, avg: null },
    };
  }

  const outdoorTemps = historicalReadings.value
    .map(r => r.outdoor_temp_f)
    .filter(t => t !== null && t !== undefined);

  const indoorTemps = historicalReadings.value
    .map(r => r.indoor_temp_f)
    .filter(t => t !== null && t !== undefined);

  return {
    outdoor: {
      min: outdoorTemps.length > 0 ? Math.min(...outdoorTemps) : null,
      max: outdoorTemps.length > 0 ? Math.max(...outdoorTemps) : null,
      avg: outdoorTemps.length > 0 ? outdoorTemps.reduce((a, b) => a + b, 0) / outdoorTemps.length : null,
    },
    indoor: {
      min: indoorTemps.length > 0 ? Math.min(...indoorTemps) : null,
      max: indoorTemps.length > 0 ? Math.max(...indoorTemps) : null,
      avg: indoorTemps.length > 0 ? indoorTemps.reduce((a, b) => a + b, 0) / indoorTemps.length : null,
    },
  };
});

const tempFromYesterday = computed(() => {
  if (!weatherStore.latestReading || historicalReadings.value.length === 0) {
    return null;
  }

  const currentTemp = weatherStore.latestReading.outdoor_temp_f;
  const yesterday = historicalReadings.value[0];

  if (!yesterday || yesterday.outdoor_temp_f === null || yesterday.outdoor_temp_f === undefined) {
    return null;
  }

  return currentTemp - yesterday.outdoor_temp_f;
});

onMounted(async () => {
  await weatherStore.loadUserSettings();
  await weatherStore.fetchLatestReading();
  await fetchHistoricalData();

  const historyRefreshInterval = setInterval(fetchHistoricalData, 5 * 60 * 1000);

  onUnmounted(() => {
    clearInterval(historyRefreshInterval);
    if (windRoseChart) windRoseChart.destroy();
    if (solarSparklineChart) solarSparklineChart.destroy();
  });
});

// --- Hero Card Logic ---
const weatherCondition = computed(() => {
  const data = weatherStore.latestReading;
  if (!data) {
    return { condition: 'Unknown', icon: '❓', description: 'Conditions unknown' };
  }

  if (data.rain_rate_in_hr !== null && data.rain_rate_in_hr > 0) {
    return { condition: 'Rainy', icon: '🌧️', description: 'Rain' };
  }

  if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 < 10) {
    return { condition: 'Night', icon: '🌙', description: 'Clear night' };
  }

  if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 >= 400) {
    return { condition: 'Sunny', icon: '☀️', description: 'Clear skies' };
  }

  if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 < 400) {
    return { condition: 'Cloudy', icon: '☁️', description: 'Overcast' };
  }

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

  if (diffMinutes < 60) {
    if (diffMinutes < 1) {
      return 'Updated just now';
    }
    const minutes = diffMinutes === 1 ? '1 minute' : `${diffMinutes} minutes`;
    return `Updated ${minutes} ago`;
  }

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

const pressureTrend = computed(() => {
  if (!weatherStore.latestReading || historicalReadings.value.length < 2) {
    return { text: 'Steady', icon: '→', color: 'text-gray-600 dark:text-gray-400' };
  }

  const currentPressure = weatherStore.latestReading.relative_pressure_inhg;

  const threeHoursAgo = historicalReadings.value.length >= 36
    ? historicalReadings.value[historicalReadings.value.length - 36]
    : historicalReadings.value[0];

  if (!threeHoursAgo || threeHoursAgo.relative_pressure_inhg === null) {
    return { text: 'Steady', icon: '→', color: 'text-gray-600 dark:text-gray-400' };
  }

  const pressureChange = currentPressure - threeHoursAgo.relative_pressure_inhg;

  if (pressureChange > 0.06) {
    return { text: 'Rising', icon: '↗', color: 'text-green-600 dark:text-green-400' };
  } else if (pressureChange < -0.06) {
    return { text: 'Falling', icon: '↘', color: 'text-red-600 dark:text-red-400' };
  } else {
    return { text: 'Steady', icon: '→', color: 'text-gray-600 dark:text-gray-400' };
  }
});

// --- Card Visualizations ---
const windRoseRef = ref<HTMLCanvasElement | null>(null);
const solarSparklineRef = ref<HTMLCanvasElement | null>(null);

let windRoseChart: Chart | null = null;
let solarSparklineChart: Chart | null = null;

const initWindRose = () => {
  if (!windRoseRef.value || historicalReadings.value.length === 0) return;

  const directions = new Array(16).fill(0);
  historicalReadings.value.forEach(r => {
    if (r.wind_direction_deg !== null) {
      const index = Math.round(r.wind_direction_deg / 22.5) % 16;
      directions[index]++;
    }
  });

  windRoseChart = markRaw(new Chart(windRoseRef.value, {
    type: 'polarArea',
    data: {
      labels: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
      datasets: [{
        data: directions,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3b82f6',
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { r: { beginAtZero: true, ticks: { display: false } } }
    }
  }));
};

const initSolarSparkline = () => {
  if (!solarSparklineRef.value || historicalReadings.value.length === 0) return;

  const recentReadings = historicalReadings.value.slice(-24);
  const data = recentReadings.map(r => r.solar_radiation_wm2 || 0);

  solarSparklineChart = markRaw(new Chart(solarSparklineRef.value, {
    type: 'line',
    data: {
      labels: recentReadings.map(() => ''),
      datasets: [{
        data: data,
        borderColor: '#eab308',
        backgroundColor: '#eab308',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false, beginAtZero: true } }
    }
  }));
};

const updateWindRose = () => {
  if (!windRoseChart?.data?.datasets?.[0] || historicalReadings.value.length === 0) return;
  const directions = new Array(16).fill(0);
  historicalReadings.value.forEach(r => {
    if (r.wind_direction_deg !== null) {
      const index = Math.round(r.wind_direction_deg / 22.5) % 16;
      directions[index]++;
    }
  });
  windRoseChart.data.datasets[0].data = directions;
  windRoseChart.update('none');
};

const updateSolarSparkline = () => {
  if (!solarSparklineChart?.data?.datasets?.[0] || historicalReadings.value.length === 0) return;
  const recentReadings = historicalReadings.value.slice(-24);
  const data = recentReadings.map(r => r.solar_radiation_wm2 || 0);
  solarSparklineChart.data.datasets[0].data = data;
  solarSparklineChart.update('none');
};

watch(historicalReadings, () => {
  updateWindRose();
  updateSolarSparkline();
});

// Online/offline detection
const isOffline = ref(!navigator.onLine);
window.addEventListener('online',  () => { isOffline.value = false; });
window.addEventListener('offline', () => { isOffline.value = true; });

// Condition theme for the banner gradient
const conditionTheme = computed(() => {
  const data = weatherStore.latestReading;
  if (!data) return getConditionTheme({ rain_rate_in_hr: null, solar_radiation_wm2: null });
  return getConditionTheme({
    rain_rate_in_hr: data.rain_rate_in_hr,
    solar_radiation_wm2: data.solar_radiation_wm2,
  });
});

// Temperature trend
const tempTrendArrow = computed(() => {
  if (tempFromYesterday.value === null) return '→';
  if (tempFromYesterday.value > 1) return '↑';
  if (tempFromYesterday.value < -1) return '↓';
  return '→';
});

const tempTrendColor = computed(() => {
  if (tempFromYesterday.value === null) return 'text-gray-400';
  if (tempFromYesterday.value > 1) return 'text-red-500';
  if (tempFromYesterday.value < -1) return 'text-sky-500';
  return 'text-gray-400';
});

// Wind severity badge
const windSeverity = computed(() => {
  const mph = weatherStore.latestReading?.wind_speed_mph ?? 0;
  if (mph >= 25) return 'high';
  if (mph >= 15) return 'medium';
  return 'low';
});

const windLabel = computed(() => {
  const mph = weatherStore.latestReading?.wind_speed_mph ?? 0;
  if (mph >= 25) return 'Strong';
  if (mph >= 15) return 'Breezy';
  return 'Calm';
});

// UV severity badge
const uvSeverityClass = computed(() => {
  const uv = weatherStore.latestReading?.uv_index ?? 0;
  if (uv >= 11) return 'extreme';
  if (uv >= 8)  return 'high';
  if (uv >= 3)  return 'medium';
  return 'low';
});

const uvLabel = computed(() => {
  const uv = weatherStore.latestReading?.uv_index ?? 0;
  if (uv >= 11) return 'Extreme';
  if (uv >= 8)  return 'Very High';
  if (uv >= 6)  return 'High';
  if (uv >= 3)  return 'Moderate';
  return 'Low';
});
</script>
