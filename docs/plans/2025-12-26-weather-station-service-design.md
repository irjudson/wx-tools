# Weather Station Data Service - Design Document

**Date:** 2025-12-26
**Version:** 1.0
**Status:** Approved

## Overview

A Docker-based service for archiving WS-2902 weather station data locally, eliminating dependency on Ambient Weather Network for historical data access. The service receives real-time updates from the weather station, stores data in PostgreSQL with TimescaleDB, publishes to MQTT, and provides energy analysis capabilities for evaluating solar and wind power potential.

## Goals

1. **Local Data Independence** - Archive all weather data locally without cloud service fees
2. **Real-time Updates** - Receive direct POST updates from WS-2902 weather station
3. **Historical Import** - Load existing CSV exports from Ambient Weather Network
4. **MQTT Publishing** - Republish weather data to MQTT for integration with other systems
5. **Energy Analysis** - Analyze solar and wind energy potential based on weather data
6. **Extensibility** - Support future analysis types and integrations

## High-Level Architecture

The system consists of five main components:

### 1. Weather Data Service (Python/FastAPI)
- HTTP endpoint receiving POST requests from WS-2902 station
- CSV import engine for historical data
- MQTT publisher for real-time data distribution
- REST API for control and queries
- Web UI for interactive operations

### 2. PostgreSQL + TimescaleDB
- Separate database (`weather_data`) on existing PostgreSQL container
- TimescaleDB hypertables for efficient time-series storage
- Stores all weather metrics with 5-minute granularity
- Optimized for range queries across any time period

### 3. MQTT Broker (optional, external)
- If configured, receives all weather metrics in real-time
- Topic structure: `weather/<metric_name>`
- Configurable via web UI

### 4. Analysis Engine (integrated in main service)
- Pluggable architecture for different analysis types
- Solar analysis: calculates potential kWh from solar radiation data
- Wind analysis: estimates turbine output from wind speed/direction
- Extensible for future analysis types

### 5. Data Flow

```
WS-2902 → HTTP POST → Service → PostgreSQL (store) + MQTT (publish)
CSV Files → Import API → Service → PostgreSQL
PostgreSQL → Analysis Engine → Results (API/UI)
```

## Data Ingestion

### WS-2902 Live Data Ingestion

The WS-2902 weather station POSTs form-encoded data every 30-60 seconds to a custom URL:

```
POST /api/weather/upload
Content-Type: application/x-www-form-urlencoded

PASSKEY=<your_key>&dateutc=2025-12-26+14:30:00&tempf=42.1&humidity=60&
windspeedmph=6.5&windgustmph=6.9&winddir=183&solarradiation=0&uv=0&
dailyrainin=0&baromrelin=29.82...
```

**Processing Steps:**
1. Validate PASSKEY (configured in environment variable or web UI)
2. Parse all metrics from form data
3. Normalize field names to match database schema
4. Insert into PostgreSQL with deduplication (skip if timestamp already exists)
5. Publish to MQTT if configured
6. Return 200 OK (station expects success response)

### CSV Historical Data Import

**Import Process:**
1. Accept file upload via web UI or API
2. Parse CSV header to map columns to database fields
3. Handle date format (ISO 8601 with timezone)
4. Batch insert with `ON CONFLICT DO NOTHING` to handle overlaps/duplicates
5. Track import progress and report statistics
   - Rows imported
   - Duplicates skipped
   - Errors encountered

**Supported Import Methods:**
- Web UI file upload
- API endpoint with file upload
- API endpoint with volume path (for local Docker volume mount)

Both ingestion paths normalize to the same database schema, ensuring consistency.

## Storage Schema

### Database: `weather_data`

**Main Table: `weather_readings` (TimescaleDB hypertable)**

```sql
CREATE TABLE weather_readings (
    timestamp TIMESTAMPTZ NOT NULL,
    outdoor_temp_f REAL,
    feels_like_f REAL,
    dew_point_f REAL,
    wind_speed_mph REAL,
    wind_gust_mph REAL,
    max_daily_gust_mph REAL,
    wind_direction_deg INTEGER,
    rain_rate_in_hr REAL,
    event_rain_in REAL,
    daily_rain_in REAL,
    weekly_rain_in REAL,
    monthly_rain_in REAL,
    yearly_rain_in REAL,
    total_rain_in REAL,
    relative_pressure_inhg REAL,
    absolute_pressure_inhg REAL,
    humidity_pct INTEGER,
    uv_index REAL,
    solar_radiation_wm2 REAL,
    indoor_temp_f REAL,
    indoor_humidity_pct INTEGER,
    indoor_feels_like_f REAL,
    indoor_dew_point_f REAL,
    sensor1_temp_f REAL,
    sensor1_humidity_pct INTEGER,
    sensor1_feels_like_f REAL,
    sensor1_dew_point_f REAL,
    outdoor_battery INTEGER,
    sensor1_battery INTEGER,
    PRIMARY KEY (timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('weather_readings', 'timestamp');

-- Indexes for analysis queries
CREATE INDEX idx_solar_radiation ON weather_readings(timestamp, solar_radiation_wm2);
CREATE INDEX idx_wind_speed ON weather_readings(timestamp, wind_speed_mph);
```

**Benefits:**
- TimescaleDB automatically partitions by time (chunks of ~7 days)
- Compression after 7 days reduces storage by 90%+
- Fast range queries for any analysis period
- Primary key prevents duplicate timestamps
- Indexes optimized for energy analysis queries

## MQTT Publishing

### Configuration

- MQTT broker connection is optional
- Configured via web UI settings page (stored in database)
- Connection parameters: broker URL, username, password, port
- Automatic reconnection with exponential backoff if broker becomes unavailable
- If not configured, service runs without MQTT (publish operations are no-ops)

### Topic Structure

Individual metric topics:
```
weather/outdoor_temp         → 42.1
weather/feels_like           → 38.0
weather/humidity             → 60
weather/wind_speed           → 6.5
weather/wind_gust            → 6.9
weather/wind_direction       → 183
weather/solar_radiation      → 125.5
weather/uv_index             → 2.1
weather/rain_rate            → 0.0
weather/daily_rain           → 0.03
weather/pressure_relative    → 29.82
weather/pressure_absolute    → 25.34
weather/indoor_temp          → 66.7
weather/indoor_humidity      → 34
weather/sensor1_temp         → 52.7
weather/sensor1_humidity     → 56
weather/battery_outdoor      → 1
weather/battery_sensor1      → 1
weather/timestamp            → 2025-12-26T14:30:00-07:00
```

Combined JSON topic:
```
weather/json → {"timestamp": "2025-12-26T14:30:00-07:00", "outdoor_temp": 42.1, ...}
```

### Publishing Behavior

- All metrics published whenever new reading arrives (from station or CSV import)
- Retained messages (last value persists for new subscribers)
- QoS 1 (at least once delivery)
- Graceful degradation if MQTT broker unavailable (log error, continue operation)

## Analysis Engine

### Architecture

**Pluggable Design:**
```python
class EnergyAnalyzer(ABC):
    @abstractmethod
    def analyze(self, start_date: datetime, end_date: datetime, config: dict) -> AnalysisResult:
        pass

    @abstractmethod
    def get_config_schema(self) -> dict:
        pass
```

Each analyzer:
- Queries weather data for specified date range
- Applies configuration parameters
- Returns structured results with raw data and visualization formats
- Registers its configuration schema for UI form generation

### Solar Analysis Module

**Inputs:**
- Date range (start, end)
- Panel area (m²)
- Panel efficiency (%, default 20%)
- Panel orientation/tilt losses (optional, %)
- Electricity cost ($/kWh, optional for ROI)

**Processing:**
1. Query `solar_radiation_wm2` over date range
2. Apply panel efficiency factor
3. Calculate kWh = (solar_radiation × panel_area × efficiency × hours) / 1000
4. Aggregate by day/month/year
5. Calculate seasonal variations
6. Compute ROI if electricity cost provided

**Outputs:**
- Total kWh potential for period
- Daily/monthly/yearly averages
- Peak production hours distribution
- Seasonal variations (summer vs. winter)
- ROI estimates (payback period, annual savings)
- Visualization data: time-series charts, monthly bar charts, seasonal comparisons

### Wind Analysis Module

**Inputs:**
- Date range (start, end)
- Turbine model (selectable) or custom power curve
- Hub height (meters, default 10m)
- Air density adjustment (optional)
- Electricity cost ($/kWh, optional for ROI)

**Processing:**
1. Query `wind_speed_mph` over date range
2. Adjust wind speed for hub height using power law: v2 = v1 × (h2/h1)^α
3. Apply turbine power curve (speed → kW output)
4. Filter for operational range (cut-in to cut-out speeds)
5. Calculate total kWh and capacity factor
6. Analyze wind speed distribution

**Outputs:**
- Total kWh potential for period
- Capacity factor (actual vs. theoretical max)
- Wind speed distribution histogram
- Best/worst months for wind generation
- Operational hours (within turbine range)
- ROI estimates
- Visualization data: wind rose, speed distribution, monthly production

### Extensibility

Future analyzer modules can be added for:
- Battery storage sizing
- Heat pump efficiency analysis
- HVAC optimization
- Water heater efficiency
- Irrigation scheduling
- Freeze/frost warnings

## REST API

### Data Ingestion Endpoints

```
POST   /api/weather/upload
  Description: Receive data from WS-2902 station
  Content-Type: application/x-www-form-urlencoded
  Authentication: PASSKEY validation
  Response: 200 OK

POST   /api/weather/import
  Description: Upload CSV file for import
  Content-Type: multipart/form-data
  Body: file (CSV)
  Response: {imported: 1234, duplicates: 56, errors: 0}

POST   /api/weather/import/path
  Description: Import CSV from mounted volume path
  Body: {path: "/data/ambient-weather-20241226-20251226.csv"}
  Response: {imported: 1234, duplicates: 56, errors: 0}
```

### Data Query Endpoints

```
GET    /api/weather/readings
  Description: Query readings with filters
  Query Params:
    - start: ISO 8601 datetime
    - end: ISO 8601 datetime
    - metrics: comma-separated list (optional, default all)
    - limit: max results (optional)
  Response: [{timestamp, outdoor_temp_f, ...}, ...]

GET    /api/weather/latest
  Description: Get most recent reading
  Response: {timestamp, outdoor_temp_f, ...}

GET    /api/weather/stats
  Description: Database statistics
  Response: {total_readings, first_reading, last_reading, coverage_days}
```

### Analysis Endpoints

```
POST   /api/analysis/solar
  Description: Run solar energy analysis
  Body: {
    start: "2024-01-01",
    end: "2024-12-31",
    config: {
      panel_area_m2: 20,
      efficiency_pct: 20,
      tilt_loss_pct: 10,
      electricity_cost_per_kwh: 0.12
    }
  }
  Response: {total_kwh, daily_avg, monthly_breakdown, roi, charts}

POST   /api/analysis/wind
  Description: Run wind energy analysis
  Body: {
    start: "2024-01-01",
    end: "2024-12-31",
    config: {
      turbine_model: "generic_5kw",
      hub_height_m: 10,
      electricity_cost_per_kwh: 0.12
    }
  }
  Response: {total_kwh, capacity_factor, monthly_breakdown, roi, charts}

GET    /api/analysis/history
  Description: List previous analysis runs
  Response: [{id, type, timestamp, params, results_summary}, ...]
```

### Configuration Endpoints

```
GET    /api/config
  Description: Get all configuration settings
  Response: {mqtt: {...}, station: {...}, analysis_defaults: {...}}

PUT    /api/config/mqtt
  Description: Update MQTT broker settings
  Body: {
    broker_url: "mqtt://localhost:1883",
    username: "user",
    password: "pass",
    enabled: true
  }
  Response: {success: true}

PUT    /api/config/station
  Description: Update station settings
  Body: {passkey: "your_station_key"}
  Response: {success: true}

GET    /api/health
  Description: Service health check
  Response: {
    status: "healthy",
    database: "connected",
    mqtt: "connected",
    last_reading: "2025-12-26T14:30:00Z"
  }
```

## Web UI

### Pages

**1. Dashboard**
- Current conditions (latest reading)
- Recent data chart (last 24 hours)
- System status (database, MQTT connection)
- Quick stats (total readings, date range coverage)

**2. Import Data**
- File upload form
- Import history table (date, file, rows imported, status)
- Drag-and-drop CSV upload

**3. Analysis**
- Analysis type selector (Solar, Wind)
- Date range picker
- Configuration form (dynamically generated from analyzer schema)
- Run analysis button
- Results display:
  - Summary statistics
  - Interactive charts (Chart.js)
  - Export results (JSON, CSV)

**4. Settings**
- MQTT Configuration
  - Broker URL
  - Username/Password
  - Enable/Disable toggle
  - Test connection button
- Station Configuration
  - PASSKEY
  - Update interval display
- Analysis Defaults
  - Default panel efficiency
  - Default turbine model
  - Electricity cost

**5. Data Explorer**
- Date range selector
- Metric selector (checkboxes for multiple metrics)
- Chart visualization
- Data table view
- Export to CSV

### Technology Stack

**Backend:**
- Python 3.11+
- FastAPI (REST API framework)
- SQLAlchemy (database ORM)
- psycopg2 (PostgreSQL driver)
- paho-mqtt (MQTT client)
- pandas (data processing for analysis)

**Frontend:**
- HTML5/CSS3/JavaScript
- Chart.js (visualizations)
- Vanilla JavaScript (no heavy frameworks for simplicity)
- Responsive design (mobile-friendly)

**Database:**
- PostgreSQL 14+
- TimescaleDB 2.x extension

**Containerization:**
- Docker
- docker-compose for multi-container orchestration

## Deployment

### Docker Configuration

**Dockerfile:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  weather-service:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/weather_data
      - STATION_PASSKEY=${STATION_PASSKEY}
    volumes:
      - ./data:/data
    restart: unless-stopped
```

### Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host:port/weather_data
STATION_PASSKEY=your_ws2902_passkey
LOG_LEVEL=INFO
```

MQTT configuration stored in database (managed via web UI).

### WS-2902 Configuration

1. Access weather station web interface or mobile app
2. Navigate to "Custom Server" or "Weather Upload" settings
3. Set custom server URL: `http://<your-host>:8000/api/weather/upload`
4. Set PASSKEY to match your configured value
5. Set upload interval (recommended: 30-60 seconds)
6. Enable custom server upload

## Error Handling

### Database Errors
- Connection retry with exponential backoff
- Transaction rollback on constraint violations
- Log errors and return 500 status with error message
- Health endpoint reports database status

### MQTT Errors
- Graceful degradation (log error, continue without MQTT)
- Automatic reconnection attempts
- Connection status visible in UI settings page
- Optional alert/notification on prolonged disconnection

### Import Errors
- CSV parsing errors: skip malformed rows, log details
- Duplicate timestamps: silently skip (ON CONFLICT DO NOTHING)
- Invalid data types: log warning, use NULL for field
- Return detailed error report with line numbers

### Station Upload Errors
- Invalid PASSKEY: return 401 Unauthorized
- Malformed data: log warning, store available fields
- Database unavailable: return 503, station will retry
- Always return response to prevent station errors

## Testing Strategy

### Unit Tests
- Database models and operations
- Analysis calculations (solar/wind formulas)
- CSV parsing and data normalization
- MQTT publishing logic

### Integration Tests
- End-to-end data flow (upload → database → MQTT)
- CSV import with real files
- Analysis engine with sample datasets
- API endpoints (FastAPI TestClient)

### Manual Testing
- WS-2902 station integration (live POST requests)
- MQTT broker connectivity
- Web UI functionality
- Docker deployment

## Security Considerations

### Authentication
- PASSKEY validation for station uploads (prevent unauthorized data injection)
- Consider adding web UI authentication in future (basic auth, OAuth)

### Data Validation
- Validate all input data types and ranges
- Sanitize CSV inputs to prevent SQL injection
- Rate limiting on API endpoints to prevent abuse

### Network Security
- Run behind reverse proxy (nginx) for HTTPS
- Firewall rules to restrict access to trusted networks
- MQTT credentials stored encrypted in database

## Future Enhancements

### Phase 2
- User authentication for web UI
- Multi-station support (multiple weather stations)
- Alerting system (email/SMS for threshold conditions)
- Data retention policies (auto-archive old data)

### Phase 3
- Mobile app (React Native)
- GraphQL API option
- Real-time websocket updates for UI
- Machine learning for weather prediction

### Phase 4
- Public API for data sharing
- Integration with home automation platforms (Home Assistant, OpenHAB)
- Advanced analysis (climate modeling, long-term trends)

## Success Criteria

1. **Data Ingestion:** Successfully receive and store live updates from WS-2902
2. **Historical Import:** Import 12 months of CSV data without errors
3. **MQTT Publishing:** Publish all metrics to MQTT broker in real-time
4. **Analysis Accuracy:** Solar/wind analysis produces reasonable estimates validated against known data
5. **Uptime:** Service runs continuously with <1% downtime
6. **Performance:** Query and analyze full year of data in <5 seconds
7. **Usability:** Non-technical user can configure and use web UI

## Timeline Considerations

Implementation will proceed in phases:
1. Core service with database schema and basic ingestion
2. CSV import and historical data loading
3. Analysis engine (solar, then wind)
4. Web UI and configuration management
5. MQTT integration
6. Docker packaging and deployment

Each phase will be tested before proceeding to ensure quality.

---

**Document Status:** Approved for implementation
**Next Steps:** Create implementation plan and set up development environment
