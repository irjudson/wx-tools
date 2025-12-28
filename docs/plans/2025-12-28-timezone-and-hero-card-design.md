# Timezone Support and Hero Card Implementation Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add timezone configuration, populate the hero card with live weather data, display "last updated" timestamp, and fix weather condition determination logic.

**Architecture:** Server-side timezone configuration stored in database, client-side timezone conversion using JavaScript Intl API, hero card populated via new updateHeroCard() function called during dashboard load.

**Tech Stack:** PostgreSQL (user_settings table), Flask API endpoints, vanilla JavaScript with Intl API

---

## Current State Analysis

**Hero Card Issues:**
- Hero card HTML structure exists in `templates/index.html:48-82` with elements: `#hero-temp`, `#hero-condition-text`, `#hero-feels-like`, `#hero-humidity`, `#hero-wind`, `#hero-pressure`
- No JavaScript code exists to populate these elements - they show default values ("--", "Loading...")
- Hero card has never been implemented, only the static template exists

**Timezone Handling:**
- Current `formatDateTime()` in `static/js/app.js:1008` uses `toLocaleString()` with no explicit timezone
- No timezone configuration exists in the application
- All API timestamps are UTC

**Requirements:**
1. Add server-side timezone configuration
2. Implement hero card population with live data
3. Implement weather condition determination logic (sunny/cloudy/rainy/night)
4. Add "last updated" timestamp to hero card with smart formatting
5. Apply timezone conversion to all timestamp displays

---

## Architecture Overview

### Data Flow

1. **App Initialization:**
   - Frontend loads and fetches user settings from `GET /api/settings`
   - Timezone preference stored in global `userTimezone` variable
   - Dashboard loads as normal

2. **Dashboard Refresh Cycle:**
   - Fetch latest reading from `/api/weather/latest` (returns UTC timestamps)
   - Determine weather condition based on solar_radiation_wm2
   - Format all timestamps using configured timezone
   - Update hero card DOM elements with all values
   - Auto-refresh repeats every 60 seconds (existing behavior)

3. **Settings Update:**
   - User changes timezone in Settings page
   - Frontend sends `PUT /api/settings/timezone` request
   - Backend validates and stores timezone
   - Frontend reloads dashboard with new timezone

### Backend Changes

**New Database Table: `user_settings`**
```sql
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial timezone setting
INSERT INTO user_settings (setting_key, setting_value)
VALUES ('timezone', 'UTC');
```

**New API Endpoints:**

1. `GET /api/settings`
   - Returns all user settings as JSON
   - Response: `{"timezone": "America/Chicago"}`
   - Uses SQLAlchemy session to query user_settings table

2. `PUT /api/settings/timezone`
   - Updates timezone setting
   - Request: `{"timezone": "America/Los_Angeles"}`
   - Validates timezone against `pytz.all_timezones`
   - Returns 400 error for invalid timezone
   - Response: `{"success": true, "timezone": "America/Los_Angeles"}`

**Timestamp Strategy:**
- Keep all API responses in UTC (no backend conversion)
- Frontend fetches timezone separately and does conversion
- This keeps backend simple and timestamps unambiguous

### Frontend Changes

**New Global State:**
```javascript
let userTimezone = 'UTC'; // Loaded from backend on init
```

**New Functions:**

1. **`loadUserSettings()`**
   - Fetches `GET /api/settings`
   - Stores `timezone` in global `userTimezone` variable
   - Called during `DOMContentLoaded` before dashboard load
   - Error handling: fallback to 'UTC' on failure

2. **`updateHeroCard(data)`**
   - Takes weather data object from `/api/weather/latest`
   - Calls `determineWeatherCondition(data)` to get condition info
   - Updates DOM elements:
     - `#hero-temp` = `data.outdoor_temp_f`
     - `#hero-condition-text` = condition text + icon
     - `#hero-feels-like` = `Feels like ${data.feels_like_f}°F`
     - `#hero-humidity` = `data.humidity_pct%`
     - `#hero-wind` = `data.wind_speed_mph mph`
     - `#hero-pressure` = `data.relative_pressure_inhg inHg`
   - Updates new "last updated" element with `formatRelativeTime(data.timestamp)`
   - Called from `loadDashboard()` after fetching latest reading

3. **`determineWeatherCondition(data)`**
   - Priority-based logic using solar_radiation_wm2 and rain_rate_in_hr
   - Returns `{condition: string, icon: string, description: string}`

   **Logic:**
   ```javascript
   if (data.rain_rate_in_hr > 0) {
       return {condition: "Rainy", icon: "🌧️", description: "Rain"};
   }
   if (data.solar_radiation_wm2 < 10) {
       return {condition: "Night", icon: "🌙", description: "Clear night"};
   }
   if (data.solar_radiation_wm2 >= 400) {
       return {condition: "Sunny", icon: "☀️", description: "Clear skies"};
   }
   return {condition: "Cloudy", icon: "☁️", description: "Overcast"};
   ```

   **Thresholds:**
   - Rainy: `rain_rate_in_hr > 0`
   - Night: `solar_radiation_wm2 < 10` (essentially zero)
   - Sunny: `solar_radiation_wm2 >= 400` (direct sunlight)
   - Cloudy: `solar_radiation_wm2 < 400` (overcast)

4. **`formatRelativeTime(timestamp)`**
   - Smart formatting based on recency
   - Uses `userTimezone` for all conversions

   **Format Rules:**
   - < 1 hour ago: "Updated 5 minutes ago"
   - < 24 hours (today): "Updated at 3:45 PM"
   - Older: "Updated Dec 27, 3:45 PM"

   **Implementation:**
   ```javascript
   function formatRelativeTime(timestamp) {
       const date = new Date(timestamp);
       const now = new Date();
       const diffMs = now - date;
       const diffMinutes = Math.floor(diffMs / 60000);

       if (diffMinutes < 60) {
           const minutes = diffMinutes === 1 ? '1 minute' : `${diffMinutes} minutes`;
           return `Updated ${minutes} ago`;
       }

       const formatter = new Intl.DateTimeFormat('en-US', {
           timeZone: userTimezone,
           hour: 'numeric',
           minute: '2-digit'
       });

       const isToday = date.toDateString() === now.toDateString();
       if (isToday) {
           return `Updated at ${formatter.format(date)}`;
       }

       const fullFormatter = new Intl.DateTimeFormat('en-US', {
           timeZone: userTimezone,
           month: 'short',
           day: 'numeric',
           hour: 'numeric',
           minute: '2-digit'
       });
       return `Updated ${fullFormatter.format(date)}`;
   }
   ```

5. **Update `formatDateTime(dateString, timezone)`**
   - Add optional timezone parameter (defaults to `userTimezone`)
   - Replace `toLocaleString()` with explicit `Intl.DateTimeFormat`:

   ```javascript
   function formatDateTime(dateString, timezone = userTimezone) {
       const date = new Date(dateString);
       return new Intl.DateTimeFormat('en-US', {
           timeZone: timezone,
           year: 'numeric',
           month: 'short',
           day: 'numeric',
           hour: 'numeric',
           minute: '2-digit',
           second: '2-digit'
       }).format(date);
   }
   ```

**HTML Changes:**

Add "last updated" element to hero card in `templates/index.html:48-82`:

```html
<div class="hero-conditions">
    <div class="hero-primary">
        <div class="current-temp-container">
            <span id="hero-temp" class="hero-temp">--</span>
            <span class="temp-unit">°F</span>
        </div>
        <div class="hero-condition">
            <span id="hero-condition-text">Loading...</span>
            <span id="hero-feels-like" class="feels-like">Feels like --°F</span>
            <!-- NEW: Last updated timestamp -->
            <span id="hero-last-updated" class="last-updated">--</span>
        </div>
    </div>
    <!-- rest of hero card... -->
</div>
```

**Settings Page UI:**

Add timezone selector to Settings page:

```html
<div class="settings-section">
    <h3>Display Settings</h3>
    <div class="setting-item">
        <label for="timezone-select">Timezone</label>
        <select id="timezone-select">
            <!-- Populated dynamically with Intl.supportedValuesOf('timeZone') -->
        </select>
    </div>
</div>
```

JavaScript to populate and handle timezone selection:

```javascript
function loadSettings() {
    // Populate timezone dropdown
    const timezones = Intl.supportedValuesOf('timeZone');
    const select = document.getElementById('timezone-select');

    timezones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz;
        option.textContent = tz;
        select.appendChild(option);
    });

    // Set current timezone
    select.value = userTimezone;

    // Handle changes
    select.addEventListener('change', async (e) => {
        await saveTimezone(e.target.value);
    });
}

async function saveTimezone(timezone) {
    try {
        const response = await fetch('/api/settings/timezone', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({timezone})
        });

        if (!response.ok) throw new Error('Failed to save timezone');

        const data = await response.json();
        userTimezone = data.timezone;

        // Reload dashboard to apply new timezone
        loadDashboard();
    } catch (error) {
        console.error('Failed to save timezone:', error);
        alert('Failed to save timezone setting');
    }
}
```

**Integration Points:**

1. Modify `DOMContentLoaded` handler in `app.js`:
   ```javascript
   document.addEventListener('DOMContentLoaded', async () => {
       initializeNavigation();
       await loadUserSettings(); // NEW: Load timezone before dashboard
       loadDashboard();
       startDashboardAutoRefresh();
       initializeImportForm();
       initializeAnalysisForms();
       initializeDataExplorer();
       loadSettings();
   });
   ```

2. Modify `loadDashboard()` in `app.js`:
   ```javascript
   async function loadDashboard() {
       const latest = await loadLatestReading(); // Return data instead of just updating DOM
       updateHeroCard(latest); // NEW: Populate hero card
       await Promise.all([
           loadDatabaseStats(),
           loadAllCharts()
       ]);
   }
   ```

3. Update all existing `formatDateTime()` calls to use new timezone parameter (optional - defaults to userTimezone)

---

## Testing Strategy

**Backend Tests:**
- Test `GET /api/settings` returns current timezone
- Test `PUT /api/settings/timezone` with valid timezone succeeds
- Test `PUT /api/settings/timezone` with invalid timezone returns 400
- Test timezone validation against pytz.all_timezones

**Frontend Tests (Manual):**
- Hero card populates with correct temperature, condition, feels-like, humidity, wind, pressure
- Weather condition determination shows correct icon/text for different solar radiation values
- "Last updated" shows relative time for recent readings (< 1 hour)
- "Last updated" shows absolute time for older readings
- Changing timezone in Settings updates all timestamps correctly
- Timezone persists across page reloads
- Auto-refresh updates hero card every 60 seconds

**Edge Cases:**
- No weather data available (handle null/undefined values)
- API errors (show error state on hero card)
- Invalid timezone from database (fallback to UTC)
- Very old "last updated" time (> 24 hours)

---

## File Changes Summary

**New Files:**
- Database migration to create `user_settings` table

**Modified Files:**
- `src/app.py` (or equivalent Flask app file) - Add settings endpoints
- `static/js/app.js` - Add functions, update initialization and dashboard loading
- `templates/index.html` - Add last-updated element to hero card, add timezone selector to Settings page
- `static/css/style.css` - Add styling for last-updated element and timezone selector (optional)

---

## Implementation Notes

**Timezone Validation:**
Use `pytz.all_timezones` for server-side validation. This provides comprehensive IANA timezone database coverage.

**Weather Condition Thresholds:**
The solar radiation thresholds (400 W/m² for sunny, 10 W/m² for night) are starting points. Monitor actual sensor readings and adjust if needed. Consider adding logging to track solar_radiation_wm2 values during different conditions.

**Performance:**
- Timezone conversion is client-side, no backend processing overhead
- Settings are fetched once on app load, cached in global variable
- No additional API calls during auto-refresh cycle

**Future Enhancements:**
- Multi-user support (add user_id to user_settings table)
- More granular weather conditions (partly cloudy, etc.)
- Weather condition history/trends
- Customizable thresholds for weather conditions
- Automatic timezone detection with option to override

---

## Dependencies

**Python:**
- `pytz` - Timezone validation (likely already installed)

**JavaScript:**
- `Intl` API - Built-in, no additional dependencies
- Browser compatibility: All modern browsers (Chrome 24+, Firefox 29+, Safari 10+)

---

## Rollout Plan

1. Create database migration for user_settings table
2. Implement backend settings endpoints with tests
3. Implement frontend timezone support and formatDateTime updates
4. Implement hero card population logic
5. Implement weather condition determination
6. Add Settings page UI for timezone selection
7. Test all components together
8. Deploy with default timezone of 'UTC'
9. Users can configure their preferred timezone in Settings

---

## Success Criteria

- [ ] Hero card displays live temperature, condition, feels-like, humidity, wind, pressure
- [ ] Weather condition accurately reflects current conditions (sunny/cloudy/rainy/night)
- [ ] "Last updated" timestamp shows relative time for recent readings
- [ ] "Last updated" timestamp shows absolute time for older readings
- [ ] Timezone can be configured in Settings page
- [ ] All timestamps throughout app use configured timezone
- [ ] Timezone setting persists across browser sessions
- [ ] Auto-refresh continues to work correctly with new hero card
