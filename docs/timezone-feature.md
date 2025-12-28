# Timezone Support and Hero Card Features

## Overview

This document describes the timezone configuration and hero card features added to the weather station dashboard. These features provide user-configurable timezone support for timestamp displays and a comprehensive at-a-glance weather summary card.

## Features

### 1. Timezone Configuration

The application supports configurable timezone display for all timestamps throughout the interface. Timezones use the IANA timezone database format (e.g., `America/Chicago`, `Europe/London`, `Asia/Tokyo`).

**Key Capabilities:**
- Store user's preferred timezone in the database
- Validate timezone values using the `pytz` library
- Apply timezone conversion to all displayed timestamps
- Persist timezone preference across sessions
- Default to UTC if no timezone is configured

**Supported Timezones:**
All IANA timezone database timezones are supported, including:
- Regional timezones: `America/New_York`, `Europe/Paris`, `Asia/Tokyo`
- UTC variants: `UTC`, `GMT`, `Etc/UTC`
- Special zones: `US/Eastern`, `US/Pacific`, etc.

### 2. Hero Card

The hero card displays the most important weather information at a glance on the dashboard. It appears at the top of the page and includes:

**Primary Display:**
- Large temperature reading (current outdoor temperature)
- Temperature unit indicator (°F)
- Weather condition icon and text
- Feels-like temperature
- Last updated timestamp (timezone-aware)

**Secondary Metrics:**
- Humidity percentage
- Wind speed (mph)
- Barometric pressure (inHg)

**Visual Features:**
- Prominent, easy-to-read typography
- Weather condition icon changes based on current conditions
- Responsive layout for mobile and desktop
- Glassmorphic design consistent with dashboard theme

### 3. Weather Conditions

The hero card determines weather conditions using sensor data with the following priority logic:

**Priority 1: Rain** (Highest)
- Condition: `rain_rate_in_hr > 0`
- Icon: 🌧️
- Description: "Rain"

**Priority 2: Night**
- Condition: `solar_radiation_wm2 < 10`
- Icon: 🌙
- Description: "Clear night"
- Note: Very low solar radiation indicates nighttime

**Priority 3: Sunny**
- Condition: `solar_radiation_wm2 >= 400`
- Icon: ☀️
- Description: "Clear skies"
- Note: High solar radiation indicates sunny conditions

**Priority 4: Cloudy**
- Condition: `solar_radiation_wm2 < 400`
- Icon: ☁️
- Description: "Overcast"
- Note: Low to moderate solar radiation during daytime

**Fallback: Unknown**
- Condition: No solar radiation data available
- Icon: ❓
- Description: "Conditions unknown"

### 4. Smart Timestamps

The "Last Updated" timestamp uses three-tier formatting based on data age:

**Tier 1: Recent (< 60 minutes)**
- Format: "Updated X minutes ago"
- Examples:
  - "Updated just now" (< 1 minute)
  - "Updated 5 minutes ago"
  - "Updated 45 minutes ago"

**Tier 2: Same Day**
- Format: "Updated at HH:MM AM/PM"
- Examples:
  - "Updated at 3:45 PM"
  - "Updated at 9:23 AM"
- Note: "Same day" is determined in the user's configured timezone

**Tier 3: Older**
- Format: "Updated MMM DD, HH:MM AM/PM"
- Examples:
  - "Updated Dec 27, 3:45 PM"
  - "Updated Jan 1, 10:30 AM"

All timestamps use the JavaScript `Intl.DateTimeFormat` API with the user's configured timezone for accurate localization.

## Configuration

### Setting Default Timezone

To initialize the default timezone (UTC) when setting up the application:

```bash
python scripts/init_timezone.py
```

**Script Behavior:**
- Checks if timezone is already configured
- If not configured, sets default to UTC
- If already configured, displays current value
- Validates database connectivity and schema

**Example Output:**
```
Initializing default timezone setting...
Initialized default timezone: UTC
```

Or if already configured:
```
Initializing default timezone setting...
Timezone already configured: America/Chicago
```

### Changing Timezone via UI

**Location:** Settings page (click Settings in sidebar navigation)

**Steps:**
1. Navigate to Settings page
2. Locate "Display Settings" section
3. Click the "Timezone" dropdown
4. Select desired timezone from the list
5. Selection is saved automatically
6. Return to Dashboard to see updated timestamps

**Available Timezones:**
The dropdown includes all IANA timezones, grouped by region for easy selection.

### Changing Timezone via API

Timezone can be changed programmatically using the REST API.

**Endpoint:** `PUT /api/settings/timezone`

**Request Body:**
```json
{
  "timezone": "America/Chicago"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "timezone": "America/Chicago"
}
```

**Error Response (400 Bad Request):**
```json
{
  "detail": "Invalid timezone: Not/A/Timezone"
}
```

**Example using curl:**
```bash
curl -X PUT http://localhost:8000/api/settings/timezone \
  -H "Content-Type: application/json" \
  -d '{"timezone": "America/New_York"}'
```

**Example using Python:**
```python
import requests

response = requests.put(
    "http://localhost:8000/api/settings/timezone",
    json={"timezone": "Europe/London"}
)

if response.status_code == 200:
    print(f"Timezone updated: {response.json()['timezone']}")
else:
    print(f"Error: {response.json()['detail']}")
```

## API Reference

### GET /api/settings

Retrieve current user settings including timezone preference.

**Request:**
```
GET /api/settings
```

**Response (200 OK):**
```json
{
  "timezone": "America/Chicago"
}
```

**Response (Default):**
```json
{
  "timezone": "UTC"
}
```

**Example:**
```bash
curl http://localhost:8000/api/settings
```

### PUT /api/settings/timezone

Update the timezone setting with validation.

**Request:**
```
PUT /api/settings/timezone
Content-Type: application/json

{
  "timezone": "America/Los_Angeles"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "timezone": "America/Los_Angeles"
}
```

**Error Response (400 Bad Request):**
```json
{
  "detail": "Invalid timezone: Invalid/Timezone"
}
```

**Valid Timezone Examples:**
- `America/New_York`
- `Europe/London`
- `Asia/Tokyo`
- `Australia/Sydney`
- `UTC`
- `GMT`

**Invalid Timezone Examples:**
- `PST` (use `America/Los_Angeles`)
- `EST` (use `America/New_York`)
- `CST` (use `America/Chicago`)
- `Not/A/Timezone` (non-existent)

### GET /api/config

Retrieve all configuration settings including timezone.

**Request:**
```
GET /api/config
```

**Response (200 OK):**
```json
{
  "mqtt": {
    "broker_url": "mqtt://localhost:1883",
    "username": null,
    "password": null,
    "enabled": false
  },
  "station": {
    "passkey_configured": true
  },
  "timezone": "America/Chicago"
}
```

**Example:**
```bash
curl http://localhost:8000/api/config
```

## Technical Details

### Architecture

**Backend Components:**

1. **Database Layer (`src/models.py`)**
   - `Configuration` table stores key-value pairs
   - Schema: `key VARCHAR(255) PRIMARY KEY, value VARCHAR(1024)`
   - Timezone stored with key `display.timezone`

2. **Service Layer (`src/services/config.py`)**
   - `get_timezone(db)`: Retrieve timezone, defaults to UTC
   - `set_timezone(db, timezone)`: Validate and store timezone
   - Uses `pytz.all_timezones` for validation
   - Raises `ValueError` for invalid timezones

3. **API Layer (`src/main.py`)**
   - `GET /api/settings`: Returns current settings
   - `PUT /api/settings/timezone`: Updates timezone
   - `GET /api/config`: Returns full configuration
   - HTTP 400 error for invalid timezones

**Frontend Components:**

1. **Hero Card (`templates/index.html` lines 58-93)**
   - Large temperature display
   - Weather condition icon and text
   - Secondary metrics (humidity, wind, pressure)
   - Last updated timestamp

2. **Timezone JavaScript (`static/js/app.js`)**
   - Global `userTimezone` variable
   - `formatRelativeTime()`: Smart timestamp formatting
   - `Intl.DateTimeFormat` API for timezone conversion
   - Automatic timezone application on page load

3. **Settings UI (`templates/index.html` lines 627-636)**
   - Timezone dropdown populated from IANA database
   - Auto-save on selection change
   - Current timezone highlighted

### Weather Condition Logic

**Implementation** (`static/js/app.js` lines 1114-1158)

The weather condition determination follows a priority hierarchy:

```javascript
// Priority 1: Rain (overrides all)
if (data.rain_rate_in_hr > 0) {
    return { condition: "Rain", icon: "🌧️", description: "Rain" };
}

// Priority 2: Night (solar radiation < 10 W/m²)
if (data.solar_radiation_wm2 < 10) {
    return { condition: "Night", icon: "🌙", description: "Clear night" };
}

// Priority 3: Sunny (solar radiation >= 400 W/m²)
if (data.solar_radiation_wm2 >= 400) {
    return { condition: "Sunny", icon: "☀️", description: "Clear skies" };
}

// Priority 4: Cloudy (solar radiation < 400 W/m²)
if (data.solar_radiation_wm2 < 400) {
    return { condition: "Cloudy", icon: "☁️", description: "Overcast" };
}

// Fallback: No data
return { condition: "Unknown", icon: "❓", description: "Conditions unknown" };
```

**Thresholds:**
- **Rain Detection:** `rain_rate_in_hr > 0` (any measurable rain)
- **Night Detection:** `solar_radiation_wm2 < 10` W/m²
- **Sunny Threshold:** `solar_radiation_wm2 >= 400` W/m²
- **Cloudy Range:** `10 <= solar_radiation_wm2 < 400` W/m²

### Timestamp Formatting

**Implementation** (`static/js/app.js` lines 1160-1204)

Three-tier formatting based on age:

```javascript
function formatRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);

    // Tier 1: Recent (< 60 minutes)
    if (diffMinutes < 60) {
        if (diffMinutes < 1) {
            return "Updated just now";
        }
        const minutes = diffMinutes === 1 ? '1 minute' : `${diffMinutes} minutes`;
        return `Updated ${minutes} ago`;
    }

    // Tier 2: Same day (timezone-aware comparison)
    const userDateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const isToday = userDateFormatter.format(date) === userDateFormatter.format(now);

    if (isToday) {
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            hour: 'numeric',
            minute: '2-digit'
        });
        return `Updated at ${dateFormatter.format(date)}`;
    }

    // Tier 3: Older (full date and time)
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

**Key Features:**
- Uses `Intl.DateTimeFormat` for native timezone support
- "Same day" determined in user's timezone, not browser timezone
- Consistent formatting across all timestamps
- Responsive to timezone changes without page reload

## Development

### Database Schema

**Configuration Table:**
```sql
CREATE TABLE configuration (
    key VARCHAR(255) PRIMARY KEY,
    value VARCHAR(1024) NOT NULL
);
```

**Timezone Entry:**
```sql
INSERT INTO configuration (key, value)
VALUES ('display.timezone', 'America/Chicago');
```

**Query Current Timezone:**
```sql
SELECT value FROM configuration WHERE key = 'display.timezone';
```

### Testing

**Test Coverage:** 15 timezone-specific tests (all passing)

**Test Categories:**

1. **API Tests** (`tests/test_timezone_api.py`)
   - GET /api/settings returns timezone
   - PUT /api/settings/timezone accepts valid timezones
   - PUT /api/settings/timezone rejects invalid timezones

2. **Service Tests** (`tests/test_config_service.py`)
   - Get timezone defaults to UTC
   - Get timezone returns configured value
   - Set timezone validates input
   - Set timezone rejects invalid values

3. **Integration Tests** (`tests/test_timezone_integration.py`)
   - Full workflow: get settings, update timezone, verify persistence
   - Config endpoint includes timezone
   - Multiple updates to same timezone
   - Special timezone handling (UTC, GMT, etc.)
   - Invalid timezone error handling

**Running Tests:**
```bash
# Run all tests
pytest

# Run timezone tests only
pytest tests/test_timezone_api.py tests/test_timezone_integration.py tests/test_config_service.py

# Run with coverage
pytest --cov=src --cov-report=html
```

**Test Database Setup:**
```bash
# Initialize test database
python scripts/init_db.py

# Initialize timezone
python scripts/init_timezone.py
```

## Troubleshooting

### Common Issues

**Issue: Timezone not persisting after page reload**
- **Cause:** Browser cache may be outdated
- **Solution:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- **Verify:** Check Network tab in DevTools, confirm `/api/settings` returns correct timezone

**Issue: Timestamps still showing wrong timezone**
- **Cause:** Timezone may not be set in database
- **Solution:** Run `python scripts/init_timezone.py` to set default
- **Verify:** `curl http://localhost:8000/api/settings` should return timezone

**Issue: "Invalid timezone" error when setting timezone**
- **Cause:** Using abbreviated timezone (e.g., PST, EST, CST)
- **Solution:** Use full IANA timezone names:
  - PST → `America/Los_Angeles`
  - EST → `America/New_York`
  - CST → `America/Chicago`
  - MST → `America/Denver`
- **Verify:** Check [IANA timezone database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

**Issue: Hero card showing "Unknown" weather condition**
- **Cause:** No solar radiation data available
- **Solution:** Ensure weather station is reporting `solar_radiation_wm2`
- **Verify:** Check `/api/latest` endpoint for solar_radiation_wm2 value

**Issue: Weather icon not updating after condition change**
- **Cause:** Auto-refresh may be disabled or delayed
- **Solution:** Manually refresh page or wait for 60-second auto-refresh
- **Verify:** Check console for auto-refresh messages

**Issue: Timezone dropdown not populating**
- **Cause:** JavaScript error or network issue
- **Solution:** Check browser console for errors
- **Verify:** Confirm `/api/settings` endpoint is accessible

### Database Issues

**Issue: Error "relation 'configuration' does not exist"**
- **Cause:** Database not initialized
- **Solution:**
  ```bash
  # Run database migrations
  alembic upgrade head

  # Or initialize from scratch
  python scripts/init_db.py
  ```

**Issue: Timezone resets to UTC after database restart**
- **Cause:** Timezone was only set in memory, not persisted
- **Solution:** Verify configuration table exists and has timezone entry:
  ```sql
  SELECT * FROM configuration WHERE key = 'display.timezone';
  ```
- **Fix:** Run `python scripts/init_timezone.py` again

### Frontend Issues

**Issue: Last updated timestamp shows "NaN minutes ago"**
- **Cause:** Invalid timestamp format from API
- **Solution:** Check API response format, ensure ISO 8601 timestamps
- **Verify:** `/api/latest` should return timestamp like `2025-12-28T12:34:56Z`

**Issue: Weather icon shows as empty square**
- **Cause:** Browser doesn't support emoji rendering
- **Solution:** Update browser to latest version or use emoji-compatible font
- **Alternative:** Replace emoji with SVG icons in `static/js/app.js`

### Performance Issues

**Issue: Page loads slowly after adding timezone feature**
- **Cause:** Timezone conversion on large datasets
- **Solution:** Timezone conversion happens in browser, not affecting server performance
- **Optimization:** Consider caching formatted timestamps

**Issue: Database query slow for configuration lookup**
- **Cause:** Missing index on configuration.key
- **Solution:** Add index (already included in schema):
  ```sql
  CREATE INDEX IF NOT EXISTS idx_configuration_key ON configuration(key);
  ```

### Getting Help

If you encounter issues not covered here:

1. Check application logs for error messages
2. Verify database connectivity: `psql -h localhost -U weatherstation -d weatherstation`
3. Test API endpoints: `curl http://localhost:8000/api/settings`
4. Check browser console for JavaScript errors
5. Review test suite for expected behavior: `pytest -v tests/test_timezone_*`

For bug reports or feature requests, include:
- Timezone being set
- Browser and version
- Error messages from console/logs
- Steps to reproduce
- Expected vs actual behavior
