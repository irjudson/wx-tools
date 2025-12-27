# Sophisticated Weather Dashboard Design

**Date:** 2025-12-27
**Goal:** Build AWN-style sophisticated weather dashboard with interactive historical analysis
**Status:** Design Approved

---

## Overview

Transform the weather station dashboard from a simple current-conditions view into a sophisticated two-page application:

1. **Main Dashboard** - Real-time current conditions (existing, enhanced)
2. **Graphs & Analysis** - Comprehensive historical data visualization with date range filtering

**Key Features:**
- Clickable cards linking to detailed analysis
- Date range filtering with presets and custom picker
- Full-width interactive charts with synchronized zoom/pan
- Smart data sampling for performance (1500-2000 points)
- Statistical summaries alongside visualizations

---

## Architecture

### Two-Page Application Structure

**Page 1: Main Dashboard (`/`)**
- Current conditions only, no date filtering
- Real-time readings updated every 60 seconds
- Sparklines show last 24 hours for context
- Small graph icons on cards link to detailed analysis

**Page 2: Graphs & Analysis (`/graphs`)**
- Historical data with date range filtering
- Full-width interactive charts
- Synchronized zoom/pan across all charts
- Statistical summaries (current, min, max, avg)

### Backend Changes

**New Endpoint: `GET /api/weather/readings/sampled`**

Query parameters:
- `start`: datetime (required)
- `end`: datetime (required)
- `max_points`: int (optional, default=1500)

**Sampling Strategy using TimescaleDB `time_bucket()`:**

| Date Range | Bucket Size | Approx Points |
|------------|-------------|---------------|
| < 6 hours | 1 minute | ~360 |
| 6-24 hours | 2 minutes | ~720 |
| 1-7 days | 10 minutes | ~1008 |
| 7-30 days | 30 minutes | ~1440 |
| 30-90 days | 2 hours | ~1080 |
| 90-365 days | 6 hours | ~1460 |
| > 365 days | 1 day | variable |

**Aggregation Logic:**

- **Temperature fields** (outdoor_temp_f, indoor_temp_f, feels_like_f, dew_point_f): AVG
- **Humidity** (humidity_pct, indoor_humidity_pct): AVG
- **Pressure** (relative_pressure_inhg): AVG
- **Wind speed** (wind_speed_mph): AVG
- **Wind gust** (wind_gust_mph): MAX (show peak gusts)
- **Wind direction** (wind_direction_deg): Circular mean (handle 359°→1° wraparound)
- **Rain rate** (rain_rate_in_hr): MAX (show peak rate)
- **Rain totals** (daily_rain_in, event_rain_in): MAX (cumulative counters)
- **Solar/UV** (solar_radiation_wm2, uv_index): AVG

**Response Format:**

```json
{
  "readings": [
    {
      "timestamp": "2025-12-27T10:00:00Z",
      "outdoor_temp_f": 45.2,
      "feels_like_f": 42.1,
      // ... all fields
    }
  ],
  "metadata": {
    "start": "2025-12-20T00:00:00Z",
    "end": "2025-12-27T23:59:59Z",
    "bucket_size": "10 minutes",
    "total_points": 1008,
    "aggregation": "avg"
  }
}
```

**Enhanced Endpoint: `GET /api/weather/readings`**
- Keeps existing behavior for real-time dashboard
- Returns last 24hr raw readings (no sampling)

### Frontend Structure

**Files:**
- `static/js/app.js` - Existing main dashboard logic
- `static/js/graphs.js` - **NEW** Graphs page functionality
- `templates/index.html` - Existing dashboard (minor updates)
- `templates/graphs.html` - **NEW** Graphs page

**Dependencies:**
- Chart.js 4.4.0 (already in use)
- **NEW:** chartjs-plugin-zoom (for zoom/pan functionality)
- **NEW:** Date picker library (lightweight, e.g., flatpickr or native date inputs)

---

## Main Dashboard Updates

### Card Enhancement

Each weather card gets a small graph icon in top-right corner:

```
┌─────────────────────────────────┐
│ 🌡️ Outdoor          📊         │  ← Graph icon
├─────────────────────────────────┤
│        72.5°F                   │
│                                 │
│ Dew Point: 45°F  Feels: 68°F   │
│ ────────sparkline────────       │
└─────────────────────────────────┘
```

**Icon Specifications:**
- Simple line chart SVG icon (custom or 📊 emoji)
- Size: 20x20px
- Color: Light gray (#94a3b8), blue (#3b82f6) on hover
- Position: Absolute top-right in card-header
- Clickable area: 32x32px (proper touch target)
- Cursor: pointer

**Navigation Mapping:**

| Card | Anchor |
|------|--------|
| Outdoor | `#section-outdoor` |
| Indoor | `#section-indoor` |
| Wind | `#section-wind-speed` |
| Pressure | `#section-pressure` |
| Humidity | `#section-humidity` |
| Rainfall | `#section-rainfall` |
| Solar/UV | `#section-solar` |
| Wind Rose | `#section-wind-direction` |

**Click Behavior:**
- Navigate to `/graphs#section-{metric}`
- Graphs page smooth-scrolls to that section
- Section gets temporary blue glow (2s fade)

**Accessibility:**
- `aria-label="View detailed graphs for [metric]"`
- Wrapped in `<a>` tag for keyboard navigation
- Focus visible state

---

## Graphs Page Design

### Page Layout

**Fixed Header:**
```
┌─────────────────────────────────────────────────────────────┐
│  Graphs & Analysis          [Date Range Filter ▼]  [Apply]  │
└─────────────────────────────────────────────────────────────┘
```

**Scrollable Content:**
- Full-width charts, single column
- Each chart section includes:
  - Chart title
  - Stats badges (top-left): Current, Min, Max, Avg
  - Legend (top-right): Color-coded line names
  - Interactive chart with zoom/pan

### Chart Sections

**1. Outdoor Temperature** (`#section-outdoor`)
- **Lines:** Outdoor temp (blue), Dew point (green), Feels like (orange)
- **Stats:** Current, Min, Max, Avg for each line
- **Y-axis:** °F | **X-axis:** Time

**2. Indoor Temperature** (`#section-indoor`)
- **Lines:** Indoor temp (blue), Indoor dew point (green), Indoor feels like (orange)
- **Stats:** Current, Min, Max, Avg for each line
- **Y-axis:** °F | **X-axis:** Time

**3. Wind Speed** (`#section-wind-speed`)
- **Lines:** Wind speed (blue), Wind gust (red)
- **Stats:** Current, Min, Max, Avg for each line
- **Y-axis:** mph | **X-axis:** Time

**4. Wind Direction** (`#section-wind-direction`)
- **Lines:** Wind direction (purple)
- **Stats:** Current, Most frequent direction
- **Y-axis:** Degrees (0-360) | **X-axis:** Time

**5. Pressure** (`#section-pressure`)
- **Lines:** Relative pressure (blue)
- **Stats:** Current, Min, Max, Avg, Trend (rising/falling/steady)
- **Y-axis:** inHg | **X-axis:** Time

**6. Humidity** (`#section-humidity`)
- **Lines:** Outdoor humidity (blue), Indoor humidity (green)
- **Stats:** Current, Min, Max, Avg for each line
- **Y-axis:** % | **X-axis:** Time

**7. Rainfall** (`#section-rainfall`)
- **Lines:** Rain rate (blue), Daily rain (green), Event rain (orange)
- **Stats:** Total for period, Max rate, Current rate
- **Y-axis:** inches (rate = in/hr) | **X-axis:** Time

**8. Solar & UV** (`#section-solar`)
- **Lines:** Solar radiation W/m² (left Y-axis, orange), UV index (right Y-axis, purple)
- **Stats:** Current, Min, Max, Avg for each line
- **Dual Y-axis chart**

---

## Date Range Filter

### UI Layout

**Filter Dropdown (AWN-style):**

```
┌──────────────────────────────────────────────────┐
│  From: [📅 Dec 20, 2025]  To: [📅 Dec 27, 2025] │
│  ┌────────────────┐     ┌──────────────────────┐│
│  │  Su Mo Tu We..  │     │  Last 24 Hours      ││
│  │  Calendar picker│     │  Past 7 Days        ││
│  │  ...            │     │  Past 30 Days       ││
│  └────────────────┘     │  Past 90 Days       ││
│                          │  Past Year          ││
│  [Cancel]  [Apply]      │  Year to Date       ││
│                          │  Custom             ││
│                          └──────────────────────┘│
└──────────────────────────────────────────────────┘
```

**Preset Buttons:**
- Last 24 Hours
- Past 7 Days
- Past 30 Days
- Past 90 Days
- Past Year
- Year to Date
- Custom

**Behavior:**
- Clicking preset: Immediately applies, closes dropdown, fetches data
- Clicking "Custom": Activates calendar pickers, requires Apply button
- Apply button: Fetches data, closes dropdown, updates URL
- Cancel button: Closes dropdown without changes

**URL Integration:**
- URL updates: `/graphs?start=2025-01-01T00:00:00Z&end=2025-01-07T23:59:59Z`
- Shareable links
- Browser back/forward support
- Default on first load: "Past 7 Days"

**Loading States:**
- During fetch: Charts show spinner overlay
- Error: "Failed to load data" with Retry button

---

## Chart Interactivity

### Zoom & Pan (chartjs-plugin-zoom)

**Zoom Controls:**
- Mouse wheel = vertical zoom (Y-axis values)
- Ctrl + mouse wheel = horizontal zoom (X-axis time)
- Click-drag box selection = zoom to region
- Double-click = reset to full range

**Pan Controls:**
- Click-drag (when zoomed) = pan horizontally
- Shift + drag = pan vertically

**Synchronized Zoom:**
- X-axis (time) zoom synced across ALL charts
- Zooming one chart updates all charts
- Y-axis (values) zoom independent per chart
- Shared state in JavaScript

**Reset:**
- "Reset Zoom" button appears when zoomed
- Resets all charts to full date range

**Visual Feedback:**
- Zoomed charts: Subtle blue border
- Cursor: Crosshair when hovering
- Optional: Minimap showing zoom position

### Tooltips

**Hover Behavior:**
- Shows exact timestamp + all values at that point
- Synchronized across all charts
- Vertical crosshair line on all charts when hovering any chart

---

## Error Handling

### No Data
- Empty state: "No data available for this time period"
- Suggest trying different date range
- Preset buttons remain functional

### Partial Data
- Render available data
- Gaps shown as line breaks (not interpolated)
- Tooltip: "No reading" for missing points

### API Failures
- Error banner: "Failed to load weather data"
- Retry button
- Keep previous data visible if available

### Large Date Ranges
- Backend limit: Max 2 years per request
- Returns 400: "Date range too large, maximum 2 years"
- Frontend shows: "Please select a shorter time range"

---

## Performance

**Chart Rendering:**
- Chart.js decimation plugin (safety net for > 2000 points)
- Lazy loading: Charts below fold render on scroll

**Zoom Optimization:**
- Debounce zoom sync: 100ms delay
- Prevents excessive re-renders

**Caching:**
- Browser caches API responses for 5 minutes
- Same params = cached response

---

## Accessibility

**Charts:**
- Proper ARIA labels on all charts
- Keyboard navigation: Tab to focus, arrows to navigate points
- Screen reader announces values when navigating

**Controls:**
- All buttons keyboard accessible
- Focus visible states
- Proper semantic HTML

**Compatibility:**
- Modern browsers (ES6+)
- Fallback for IE11: "Please use a modern browser"
- Touch support: Pinch-to-zoom on mobile/tablet
- High contrast mode support

---

## Implementation Notes

**Phase 1: Backend**
1. Create sampled readings endpoint
2. Implement bucket size calculation logic
3. Add circular mean for wind direction
4. Add response metadata

**Phase 2: Graphs Page**
1. Create graphs.html template
2. Implement date range filter UI
3. Build chart sections with Chart.js
4. Add zoom plugin integration
5. Implement synchronized zoom state

**Phase 3: Dashboard Integration**
1. Add graph icons to cards
2. Implement navigation with anchors
3. Add scroll + highlight behavior

**Phase 4: Polish**
1. Error states and loading indicators
2. Performance optimization
3. Accessibility audit
4. Browser testing

---

## Success Criteria

✅ Main dashboard shows current conditions with graph icons
✅ Clicking icon navigates to graphs page, scrolls to section
✅ Date range filter with presets works smoothly
✅ All 8 chart sections render with correct data
✅ Zoom/pan works and syncs across charts
✅ Stats show current/min/max/avg correctly
✅ Page handles large date ranges (sampling works)
✅ No performance issues with 2000-point charts
✅ Keyboard accessible, screen reader friendly
✅ Works on mobile/tablet (responsive, touch-friendly)

---

## Future Enhancements (Out of Scope)

- Forecast integration
- Export/share functionality
- Comparison mode (this week vs last week)
- Email/SMS alerts
- Custom aggregations (user-controlled resolution)
