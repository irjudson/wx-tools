# Timezone Support and Hero Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add server-side timezone configuration, populate hero card with live weather data, and implement smart timestamp formatting.

**Architecture:** Leverage existing Configuration table and config service, add new API endpoints for timezone settings, implement client-side timezone conversion and hero card population.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL, vanilla JavaScript with Intl API, pytz for validation

---

## Task 1: Add pytz Dependency

**Files:**
- Modify: `requirements.txt`

**Step 1: Add pytz to requirements.txt**

Add line at end of file:
```
pytz==2024.2
```

**Step 2: Install dependency**

Run: `pip install pytz==2024.2`
Expected: Successfully installed pytz-2024.2

**Step 3: Commit**

```bash
git add requirements.txt
git commit -m "deps: add pytz for timezone validation"
```

---

## Task 2: Add Timezone Helper Functions to Config Service

**Files:**
- Modify: `src/services/config.py`
- Test: `tests/test_config_service.py` (create new)

**Step 1: Write failing test for get_timezone**

Create `tests/test_config_service.py`:
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database import Base
from src.models import Configuration
from src.services.config import get_timezone, set_timezone


@pytest.fixture
def test_db():
    """Create in-memory test database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_get_timezone_default(test_db):
    """Test getting timezone when not set returns UTC"""
    result = get_timezone(test_db)
    assert result == "UTC"


def test_get_timezone_set_value(test_db):
    """Test getting timezone when set"""
    # Set timezone
    config = Configuration(key="display.timezone", value="America/Chicago")
    test_db.add(config)
    test_db.commit()

    result = get_timezone(test_db)
    assert result == "America/Chicago"
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_config_service.py::test_get_timezone_default -v`
Expected: FAIL with "cannot import name 'get_timezone'"

**Step 3: Implement get_timezone function**

Add to `src/services/config.py` (after line 81):
```python
def get_timezone(db: Session) -> str:
    """Get display timezone from database

    Args:
        db: Database session

    Returns:
        Timezone string (IANA format, e.g., 'America/Chicago')
    """
    return get_config_value(db, "display.timezone", "UTC")
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/test_config_service.py::test_get_timezone_default tests/test_config_service.py::test_get_timezone_set_value -v`
Expected: PASS (2 tests)

**Step 5: Write failing test for set_timezone with validation**

Add to `tests/test_config_service.py`:
```python
def test_set_timezone_valid(test_db):
    """Test setting valid timezone"""
    set_timezone(test_db, "America/Los_Angeles")

    result = get_timezone(test_db)
    assert result == "America/Los_Angeles"


def test_set_timezone_invalid(test_db):
    """Test setting invalid timezone raises ValueError"""
    with pytest.raises(ValueError, match="Invalid timezone"):
        set_timezone(test_db, "Invalid/Timezone")
```

**Step 6: Run test to verify it fails**

Run: `pytest tests/test_config_service.py::test_set_timezone_valid -v`
Expected: FAIL with "cannot import name 'set_timezone'"

**Step 7: Implement set_timezone function with validation**

Add to `src/services/config.py` (after get_timezone):
```python
import pytz  # Add at top of file


def set_timezone(db: Session, timezone: str) -> None:
    """Set display timezone in database with validation

    Args:
        db: Database session
        timezone: Timezone string (IANA format)

    Raises:
        ValueError: If timezone is not valid
    """
    if timezone not in pytz.all_timezones:
        raise ValueError(f"Invalid timezone: {timezone}")

    set_config_value(db, "display.timezone", timezone)
```

**Step 8: Run tests to verify they pass**

Run: `pytest tests/test_config_service.py -v`
Expected: PASS (4 tests)

**Step 9: Commit**

```bash
git add src/services/config.py tests/test_config_service.py
git commit -m "feat: add timezone config helpers with validation"
```

---

## Task 3: Add Timezone Settings Schema

**Files:**
- Modify: `src/schemas.py`

**Step 1: Add TimezoneUpdateRequest schema**

Add to `src/schemas.py` (after line 110):
```python
class TimezoneUpdateRequest(BaseModel):
    """Schema for timezone update requests"""
    timezone: str
```

**Step 2: Commit**

```bash
git add src/schemas.py
git commit -m "feat: add timezone update request schema"
```

---

## Task 4: Add Timezone API Endpoints

**Files:**
- Modify: `src/main.py`
- Test: `tests/test_timezone_api.py` (create new)

**Step 1: Write failing test for GET /api/settings**

Create `tests/test_timezone_api.py`:
```python
import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.models import Configuration


@pytest.fixture
def client():
    """Create test client with in-memory database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_get_settings_default(client):
    """Test GET /api/settings returns default timezone"""
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "timezone" in data
    assert data["timezone"] == "UTC"
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_timezone_api.py::test_get_settings_default -v`
Expected: FAIL with 404 (endpoint not found)

**Step 3: Implement GET /api/settings endpoint**

Add to `src/main.py` (after line 601, before @app.put("/api/config/mqtt")):
```python
@app.get("/api/settings")
async def get_settings_endpoint(db: Session = Depends(get_db)):
    """Get user settings including timezone"""
    from src.services.config import get_timezone

    return {
        "timezone": get_timezone(db)
    }
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/test_timezone_api.py::test_get_settings_default -v`
Expected: PASS

**Step 5: Write failing test for PUT /api/settings/timezone**

Add to `tests/test_timezone_api.py`:
```python
def test_update_timezone_valid(client):
    """Test PUT /api/settings/timezone with valid timezone"""
    response = client.put(
        "/api/settings/timezone",
        json={"timezone": "America/Chicago"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["timezone"] == "America/Chicago"

    # Verify it was saved
    get_response = client.get("/api/settings")
    assert get_response.json()["timezone"] == "America/Chicago"


def test_update_timezone_invalid(client):
    """Test PUT /api/settings/timezone with invalid timezone returns 400"""
    response = client.put(
        "/api/settings/timezone",
        json={"timezone": "Invalid/Timezone"}
    )
    assert response.status_code == 400
    assert "Invalid timezone" in response.json()["detail"]
```

**Step 6: Run test to verify it fails**

Run: `pytest tests/test_timezone_api.py::test_update_timezone_valid -v`
Expected: FAIL with 404 (endpoint not found)

**Step 7: Implement PUT /api/settings/timezone endpoint**

Add import at top of `src/main.py` (line 17, update schemas import):
```python
from src.schemas import StationUpload, ImportPathRequest, WeatherReadingResponse, AnalysisRequest, MQTTConfigRequest, StationConfigRequest, TimezoneUpdateRequest
```

Add endpoint to `src/main.py` (after @app.get("/api/settings")):
```python
@app.put("/api/settings/timezone")
async def update_timezone(
    request: TimezoneUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update timezone setting with validation"""
    from src.services.config import set_timezone

    try:
        set_timezone(db, request.timezone)
        return {"success": True, "timezone": request.timezone}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**Step 8: Run tests to verify they pass**

Run: `pytest tests/test_timezone_api.py -v`
Expected: PASS (3 tests)

**Step 9: Update GET /api/config to include timezone**

Modify `src/main.py` line 591-601:
```python
@app.get("/api/config")
async def get_configuration(db: Session = Depends(get_db)):
    """Get all configuration settings"""
    from src.services.config import get_timezone

    mqtt_config = get_mqtt_config(db)

    return {
        "mqtt": mqtt_config,
        "station": {
            "passkey_configured": bool(get_settings().station_passkey)
        },
        "timezone": get_timezone(db)
    }
```

**Step 10: Run all tests to ensure no regression**

Run: `pytest tests/test_timezone_api.py tests/test_config_service.py -v`
Expected: PASS (all tests)

**Step 11: Commit**

```bash
git add src/main.py tests/test_timezone_api.py
git commit -m "feat: add timezone settings API endpoints"
```

---

## Task 5: Add Hero Card Population Functions to Frontend

**Files:**
- Modify: `static/js/app.js`

**Step 1: Add global userTimezone variable**

Add after line 3 in `static/js/app.js`:
```javascript
// Global state
let temperatureChart = null;
let userTimezone = 'UTC'; // Loaded from backend on init
```

**Step 2: Add loadUserSettings function**

Add after `formatDateTime` function (around line 1020):
```javascript
async function loadUserSettings() {
    try {
        const response = await fetch('/api/settings');

        if (!response.ok) {
            console.warn('Failed to load user settings, using UTC');
            userTimezone = 'UTC';
            return;
        }

        const data = await response.json();
        userTimezone = data.timezone || 'UTC';
        console.log(`Loaded timezone: ${userTimezone}`);
    } catch (error) {
        console.error('Failed to load user settings:', error);
        userTimezone = 'UTC';
    }
}
```

**Step 3: Add determineWeatherCondition function**

Add after `loadUserSettings`:
```javascript
function determineWeatherCondition(data) {
    // Priority 1: Rain
    if (data.rain_rate_in_hr && data.rain_rate_in_hr > 0) {
        return {
            condition: "Rainy",
            icon: "🌧️",
            description: "Rain"
        };
    }

    // Priority 2: Night (very low solar radiation)
    if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 < 10) {
        return {
            condition: "Night",
            icon: "🌙",
            description: "Clear night"
        };
    }

    // Priority 3: Sunny (high solar radiation)
    if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 >= 400) {
        return {
            condition: "Sunny",
            icon: "☀️",
            description: "Clear skies"
        };
    }

    // Priority 4: Cloudy (low solar radiation)
    if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 < 400) {
        return {
            condition: "Cloudy",
            icon: "☁️",
            description: "Overcast"
        };
    }

    // Fallback if no solar radiation data
    return {
        condition: "Unknown",
        icon: "❓",
        description: "Conditions unknown"
    };
}
```

**Step 4: Add formatRelativeTime function**

Add after `determineWeatherCondition`:
```javascript
function formatRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);

    // Recent: show relative time
    if (diffMinutes < 60) {
        if (diffMinutes < 1) {
            return "Updated just now";
        }
        const minutes = diffMinutes === 1 ? '1 minute' : `${diffMinutes} minutes`;
        return `Updated ${minutes} ago`;
    }

    // Today: show time only
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: 'numeric',
        minute: '2-digit'
    });

    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
        return `Updated at ${dateFormatter.format(date)}`;
    }

    // Older: show date and time
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

**Step 5: Add updateHeroCard function**

Add after `formatRelativeTime`:
```javascript
function updateHeroCard(data) {
    // Determine weather condition
    const weather = determineWeatherCondition(data);

    // Update temperature
    const heroTemp = document.getElementById('hero-temp');
    if (heroTemp) {
        heroTemp.textContent = data.outdoor_temp_f !== null ?
            Math.round(data.outdoor_temp_f) : '--';
    }

    // Update condition with icon
    const heroCondition = document.getElementById('hero-condition-text');
    if (heroCondition) {
        heroCondition.textContent = data.outdoor_temp_f !== null ?
            `${weather.icon} ${weather.condition}` : 'Loading...';
    }

    // Update feels like
    const heroFeelsLike = document.getElementById('hero-feels-like');
    if (heroFeelsLike) {
        heroFeelsLike.textContent = data.feels_like_f !== null ?
            `Feels like ${Math.round(data.feels_like_f)}°F` : 'Feels like --°F';
    }

    // Update humidity
    const heroHumidity = document.getElementById('hero-humidity');
    if (heroHumidity) {
        heroHumidity.textContent = data.humidity_pct !== null ?
            `${data.humidity_pct}%` : '--%';
    }

    // Update wind
    const heroWind = document.getElementById('hero-wind');
    if (heroWind) {
        heroWind.textContent = data.wind_speed_mph !== null ?
            `${data.wind_speed_mph.toFixed(1)} mph` : '-- mph';
    }

    // Update pressure
    const heroPressure = document.getElementById('hero-pressure');
    if (heroPressure) {
        heroPressure.textContent = data.relative_pressure_inhg !== null ?
            `${data.relative_pressure_inhg.toFixed(2)} inHg` : '-- inHg';
    }

    // Update last updated timestamp
    const heroLastUpdated = document.getElementById('hero-last-updated');
    if (heroLastUpdated) {
        heroLastUpdated.textContent = data.timestamp ?
            formatRelativeTime(data.timestamp) : '--';
    }
}
```

**Step 6: Update formatDateTime to use timezone**

Replace `formatDateTime` function (around line 1008):
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

**Step 7: Update DOMContentLoaded to load settings first**

Modify the `DOMContentLoaded` handler (around line 6):
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    initializeNavigation();
    await loadUserSettings(); // Load timezone before dashboard
    loadDashboard();
    startDashboardAutoRefresh();
    initializeImportForm();
    initializeAnalysisForms();
    initializeDataExplorer();
    loadSettings();
});
```

**Step 8: Update loadLatestReading to return data**

Modify `loadLatestReading` function (around line 84) to return the data:
```javascript
async function loadLatestReading() {
    const container = document.getElementById('latest-reading');

    try {
        const response = await fetch('/api/weather/latest');

        if (!response.ok) {
            throw new Error('No data available');
        }

        const data = await response.json();

        container.innerHTML = `
            <p><strong>Time:</strong> ${formatDateTime(data.timestamp)}</p>
            <p><strong>Temperature:</strong> ${data.outdoor_temp_f !== null ? data.outdoor_temp_f.toFixed(1) + '°F' : 'N/A'}</p>
            <p><strong>Humidity:</strong> ${data.humidity_pct !== null ? data.humidity_pct + '%' : 'N/A'}</p>
            <p><strong>Wind Speed:</strong> ${data.wind_speed_mph !== null ? data.wind_speed_mph.toFixed(1) + ' mph' : 'N/A'}</p>
            <p><strong>Solar Radiation:</strong> ${data.solar_radiation_wm2 !== null ? data.solar_radiation_wm2.toFixed(1) + ' W/m²' : 'N/A'}</p>
        `;

        return data; // Return data for hero card
    } catch (error) {
        container.innerHTML = `<p class="error">No readings available</p>`;
        console.error('Failed to load latest reading:', error);
        return null;
    }
}
```

**Step 9: Update loadDashboard to call updateHeroCard**

Modify `loadDashboard` function (around line 50):
```javascript
async function loadDashboard() {
    const latest = await loadLatestReading();
    if (latest) {
        updateHeroCard(latest);
    }
    await Promise.all([
        loadDatabaseStats(),
        loadAllCharts()
    ]);
}
```

**Step 10: Test manually in browser**

Run: Start the application and open in browser
Expected: Hero card shows temperature, condition icon, feels-like, humidity, wind, pressure, and "Updated X minutes ago"

**Step 11: Commit**

```bash
git add static/js/app.js
git commit -m "feat: add hero card population and weather condition logic"
```

---

## Task 6: Add Last Updated Element to Hero Card HTML

**Files:**
- Modify: `templates/index.html`

**Step 1: Add last-updated element to hero card**

Modify `templates/index.html` around line 56 (inside `.hero-condition` div):
```html
<div class="hero-condition">
    <span id="hero-condition-text">Loading...</span>
    <span id="hero-feels-like" class="feels-like">Feels like --°F</span>
    <span id="hero-last-updated" class="last-updated">--</span>
</div>
```

**Step 2: Add CSS styling for last-updated**

Modify `static/css/style.css` (find `.feels-like` around line 577, add after it):
```css
.last-updated {
    display: block;
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
}
```

**Step 3: Test in browser**

Run: Refresh browser
Expected: "Last updated" timestamp appears below feels-like temperature

**Step 4: Commit**

```bash
git add templates/index.html static/css/style.css
git commit -m "feat: add last updated timestamp to hero card"
```

---

## Task 7: Add Timezone Selector to Settings Page

**Files:**
- Modify: `templates/index.html`
- Modify: `static/js/app.js`

**Step 1: Add timezone selector HTML to Settings section**

Find Settings section in `templates/index.html` (around line 850) and add:
```html
<section id="settings" class="content-section">
    <h2>Settings</h2>

    <!-- Display Settings -->
    <div class="settings-section">
        <h3>Display Settings</h3>
        <div class="setting-item">
            <label for="timezone-select">Timezone</label>
            <select id="timezone-select" class="timezone-dropdown">
                <option value="">Loading timezones...</option>
            </select>
            <p class="setting-description">Select your local timezone for timestamp display</p>
        </div>
    </div>

    <!-- Existing settings sections below... -->
</div>
```

**Step 2: Add CSS for settings section**

Add to `static/css/style.css`:
```css
.settings-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--card-bg);
    border-radius: 8px;
}

.settings-section h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--text-primary);
}

.setting-item {
    margin-bottom: 1.5rem;
}

.setting-item label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary);
}

.timezone-dropdown {
    width: 100%;
    max-width: 400px;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 1rem;
}

.setting-description {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
}
```

**Step 3: Update loadSettings function**

Modify `loadSettings` function in `static/js/app.js` (find existing function and replace):
```javascript
async function loadSettings() {
    // Populate timezone dropdown
    const timezoneSelect = document.getElementById('timezone-select');

    if (timezoneSelect) {
        try {
            // Get all supported timezones
            const timezones = Intl.supportedValuesOf('timeZone');

            // Clear loading option
            timezoneSelect.innerHTML = '';

            // Add options
            timezones.forEach(tz => {
                const option = document.createElement('option');
                option.value = tz;
                option.textContent = tz;
                timezoneSelect.appendChild(option);
            });

            // Set current timezone
            timezoneSelect.value = userTimezone;

            // Handle changes
            timezoneSelect.addEventListener('change', async (e) => {
                await saveTimezone(e.target.value);
            });
        } catch (error) {
            console.error('Failed to load timezones:', error);
            timezoneSelect.innerHTML = '<option>Error loading timezones</option>';
        }
    }
}
```

**Step 4: Add saveTimezone function**

Add to `static/js/app.js` (after `loadSettings`):
```javascript
async function saveTimezone(timezone) {
    try {
        const response = await fetch('/api/settings/timezone', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({timezone})
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save timezone');
        }

        const data = await response.json();
        userTimezone = data.timezone;

        console.log(`Timezone updated to: ${userTimezone}`);

        // Reload dashboard to apply new timezone
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection && dashboardSection.classList.contains('active')) {
            loadDashboard();
        }
    } catch (error) {
        console.error('Failed to save timezone:', error);
        alert(`Failed to save timezone: ${error.message}`);
    }
}
```

**Step 5: Test in browser**

Run: Navigate to Settings page
Expected: Timezone dropdown shows all timezones, current selection matches loaded timezone

**Step 6: Test changing timezone**

Run: Select different timezone in dropdown
Expected: Dashboard reloads, all timestamps update to new timezone

**Step 7: Commit**

```bash
git add templates/index.html static/css/style.css static/js/app.js
git commit -m "feat: add timezone selector to settings page"
```

---

## Task 8: Initialize Default Timezone in Database

**Files:**
- Create: `scripts/init_timezone.py`

**Step 1: Create initialization script**

Create `scripts/init_timezone.py`:
```python
"""Initialize default timezone in database if not set"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.database import SessionLocal
from src.services.config import get_config_value, set_config_value


def init_default_timezone():
    """Set default timezone to UTC if not already configured"""
    db = SessionLocal()
    try:
        existing = get_config_value(db, "display.timezone")
        if existing:
            print(f"Timezone already configured: {existing}")
        else:
            set_config_value(db, "display.timezone", "UTC")
            print("Initialized default timezone: UTC")
    finally:
        db.close()


if __name__ == "__main__":
    init_default_timezone()
```

**Step 2: Make executable**

Run: `chmod +x scripts/init_timezone.py`

**Step 3: Run initialization script**

Run: `python scripts/init_timezone.py`
Expected: "Initialized default timezone: UTC" or "Timezone already configured"

**Step 4: Commit**

```bash
git add scripts/init_timezone.py
git commit -m "feat: add timezone initialization script"
```

---

## Task 9: Add Integration Tests

**Files:**
- Create: `tests/test_timezone_integration.py`

**Step 1: Write integration test**

Create `tests/test_timezone_integration.py`:
```python
import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def client():
    """Create test client with in-memory database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_timezone_full_workflow(client):
    """Test complete timezone workflow: get, set, verify"""
    # 1. Get default settings
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert response.json()["timezone"] == "UTC"

    # 2. Update timezone
    response = client.put(
        "/api/settings/timezone",
        json={"timezone": "America/New_York"}
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    # 3. Verify timezone was saved
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert response.json()["timezone"] == "America/New_York"

    # 4. Verify it appears in /api/config
    response = client.get("/api/config")
    assert response.status_code == 200
    assert response.json()["timezone"] == "America/New_York"

    # 5. Test invalid timezone
    response = client.put(
        "/api/settings/timezone",
        json={"timezone": "Not/ATimezone"}
    )
    assert response.status_code == 400
    assert "Invalid timezone" in response.json()["detail"]

    # 6. Verify timezone unchanged after failed update
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert response.json()["timezone"] == "America/New_York"
```

**Step 2: Run integration test**

Run: `pytest tests/test_timezone_integration.py -v`
Expected: PASS (1 test with multiple steps)

**Step 3: Commit**

```bash
git add tests/test_timezone_integration.py
git commit -m "test: add timezone integration tests"
```

---

## Task 10: Run All Tests and Verify

**Files:**
- None (verification step)

**Step 1: Run all tests**

Run: `pytest tests/ -v`
Expected: All tests PASS

**Step 2: Check test coverage**

Run: `pytest tests/test_config_service.py tests/test_timezone_api.py tests/test_timezone_integration.py -v`
Expected: All timezone-related tests PASS

**Step 3: Manual browser testing checklist**

1. Start application: `uvicorn src.main:app --reload`
2. Open browser to `http://localhost:8000`
3. Verify hero card shows:
   - Current temperature
   - Weather condition with icon (sunny/cloudy/rainy/night)
   - Feels-like temperature
   - Humidity percentage
   - Wind speed
   - Pressure
   - "Updated X minutes ago" timestamp
4. Navigate to Settings page
5. Change timezone to different zone
6. Verify dashboard timestamps update
7. Refresh page, verify timezone persists
8. Check browser console for errors (should be none)

**Step 4: Document any issues found**

If issues found: Create GitHub issues or fix immediately

**Step 5: Commit if any fixes made**

```bash
git add <any-fixed-files>
git commit -m "fix: <description-of-fix>"
```

---

## Task 11: Update Documentation

**Files:**
- Create: `docs/timezone-feature.md`
- Modify: `README.md` (if needed)

**Step 1: Create feature documentation**

Create `docs/timezone-feature.md`:
```markdown
# Timezone Support Feature

## Overview

The weather dashboard now supports configurable timezone display. All timestamps throughout the application are converted to the user's selected timezone.

## Configuration

### Setting Timezone

1. Navigate to Settings page
2. Select your timezone from the "Timezone" dropdown
3. Timezone is saved automatically
4. Dashboard reloads with new timezone

### Default Timezone

The default timezone is UTC. This can be changed in Settings.

### API Usage

**Get current timezone:**
```bash
GET /api/settings
```

Response:
```json
{
  "timezone": "America/Chicago"
}
```

**Update timezone:**
```bash
PUT /api/settings/timezone
Content-Type: application/json

{
  "timezone": "America/Los_Angeles"
}
```

Response:
```json
{
  "success": true,
  "timezone": "America/Los_Angeles"
}
```

### Valid Timezones

All IANA timezone database timezones are supported. Examples:
- UTC
- America/New_York
- America/Chicago
- America/Los_Angeles
- Europe/London
- Asia/Tokyo

## Hero Card

The hero card displays current weather conditions at the top of the dashboard.

### Features

- **Large temperature display** - Current outdoor temperature
- **Weather condition** - Icon and text (Sunny ☀️, Cloudy ☁️, Rainy 🌧️, Night 🌙)
- **Feels-like temperature** - Apparent temperature
- **Humidity** - Current humidity percentage
- **Wind speed** - Current wind speed in mph
- **Pressure** - Barometric pressure in inHg
- **Last updated** - Smart timestamp showing when data was last received

### Weather Condition Logic

Conditions are determined in priority order:

1. **Rainy** (🌧️) - When rain_rate > 0
2. **Night** (🌙) - When solar_radiation < 10 W/m²
3. **Sunny** (☀️) - When solar_radiation >= 400 W/m²
4. **Cloudy** (☁️) - When solar_radiation < 400 W/m²

### Last Updated Timestamp

The timestamp format changes based on recency:
- **< 1 hour ago** - "Updated 5 minutes ago"
- **< 24 hours** - "Updated at 3:45 PM"
- **Older** - "Updated Dec 27, 3:45 PM"

## Technical Details

### Backend

- Timezone stored in `configuration` table with key `display.timezone`
- Validation using `pytz.all_timezones`
- New endpoints: `GET /api/settings`, `PUT /api/settings/timezone`
- New functions: `get_timezone()`, `set_timezone()` in `src/services/config.py`

### Frontend

- Timezone conversion using JavaScript `Intl.DateTimeFormat` API
- Global `userTimezone` variable loaded on app init
- Weather condition determination based on solar radiation and rain rate
- Smart timestamp formatting with relative/absolute times
```

**Step 2: Commit documentation**

```bash
git add docs/timezone-feature.md
git commit -m "docs: add timezone and hero card feature documentation"
```

---

## Success Criteria

- [ ] Hero card displays live temperature, condition, feels-like, humidity, wind, pressure
- [ ] Weather condition accurately reflects current conditions (sunny/cloudy/rainy/night)
- [ ] "Last updated" timestamp shows relative time for recent readings (< 1 hour)
- [ ] "Last updated" timestamp shows absolute time for older readings
- [ ] Timezone can be configured in Settings page
- [ ] All timestamps throughout app use configured timezone
- [ ] Timezone setting persists across browser sessions (stored in database)
- [ ] Auto-refresh continues to work correctly with new hero card
- [ ] All tests pass
- [ ] Invalid timezone values are rejected with 400 error
- [ ] Default timezone is UTC when not configured

---

## Testing Commands

```bash
# Run all tests
pytest tests/ -v

# Run only timezone tests
pytest tests/test_config_service.py tests/test_timezone_api.py tests/test_timezone_integration.py -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Start development server
uvicorn src.main:app --reload
```

---

## Rollback Plan

If issues are discovered:

1. Revert commits: `git revert HEAD~11..HEAD`
2. Or reset to before feature: `git reset --hard <commit-before-task-1>`
3. Database migration rollback (if needed): Delete rows with `key = 'display.timezone'` from `configuration` table
