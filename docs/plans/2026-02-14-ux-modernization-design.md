# Complete UX Modernization Design

**Date:** 2026-02-14
**Goal:** Complete the Vue 3 modernization started by Gemini, finishing all views and functionality
**Status:** Design Approved

---

## Overview

This design completes the weather station UX modernization by finishing the work Gemini started. The Vue 3 + TypeScript + Vite frontend is scaffolded but needs implementation of core features.

**Completion Strategy:** Sequential priority implementation
1. **Phase 1:** Graphs page (charts, filtering, zoom/pan)
2. **Phase 2:** Home dashboard (live data, statistics, polish)
3. **Phase 3:** Utility views (Settings, Import, Explorer, Analysis)

---

## Architecture Overview

### Tech Stack
- **Frontend:** Vue 3 (Composition API) + TypeScript + Vite + Tailwind CSS
- **State Management:** Pinia stores (already set up)
- **Charts:** Chart.js 4.5.1 + chartjs-plugin-zoom + chartjs-adapter-date-fns
- **Router:** Vue Router (already configured)
- **Build:** Vite with hot reload

### Project Structure
```
frontend/src/
├── views/
│   ├── Home.vue              # Dashboard - enhance existing
│   ├── Graphs.vue            # Charts - implement functionality
│   ├── Settings.vue          # Implement from scratch
│   ├── ImportData.vue        # Implement from scratch
│   ├── DataExplorer.vue      # Implement from scratch
│   └── EnergyAnalysis.vue    # Implement from scratch
├── stores/
│   └── weather.ts            # Enhance with graphs data
├── composables/
│   ├── useChart.ts           # Enhance for zoom/pan
│   └── useDateRange.ts       # NEW - date filtering logic
├── components/               # NEW directory
│   ├── WeatherCard.vue       # Extract from Home.vue
│   ├── ChartSection.vue      # Reusable chart wrapper
│   ├── DateRangePicker.vue   # Date filter component
│   ├── LoadingSpinner.vue    # Reusable spinner
│   ├── ErrorBanner.vue       # Error display
│   └── SuccessBanner.vue     # Success messages
└── types/
    └── weather.d.ts          # Enhance with chart types
```

### Data Flow
1. **Pinia stores** centralize all API calls and state
2. **Views** consume store data reactively
3. **Composables** provide reusable logic (charts, date ranges)
4. **Components** are presentational and emit events

### Build & Deploy Strategy
- Run `npm run build` after each phase to update `frontend/dist/`
- Backend serves from `frontend/dist/index.html` (already configured)
- No server restart needed - just rebuild frontend

---

## Phase 1: Graphs Page Implementation

### Overview
Complete the Graphs.vue page with fully functional interactive charts, date range filtering, and synchronized zoom/pan.

### Components to Build

**1. Date Range Picker Logic**
- Create `composables/useDateRange.ts`:
  - Manages start/end dates
  - Preset calculations (Last 24h, 7d, 30d, 90d, 1y, YTD)
  - URL sync for shareable links
  - Custom date validation

**2. Chart Configuration**
- Enhance `composables/useChart.ts`:
  - Chart.js initialization with zoom plugin
  - Synchronized zoom state across all charts
  - Responsive sizing
  - Theme support (dark/light mode)

**3. Weather Store Enhancement**
- Add to `stores/weather.ts`:
  - `fetchSampledReadings(start, end, maxPoints)` - calls `/api/weather/readings/sampled`
  - `sampledReadings` ref for chart data
  - `isLoadingCharts` and `chartsError` state
  - Caching for performance (5 min cache)

### Chart Sections (8 charts total)

Each chart section will have:
- **Stats badges** (current, min, max, avg) - computed from data
- **Chart.js line chart** with time-series configuration
- **Synchronized X-axis** zoom (time) across all charts
- **Independent Y-axis** zoom per chart
- **Tooltip** showing exact values on hover
- **Responsive** height and width

**Chart List:**
1. Outdoor Temperature (3 lines: temp, feels like, dew point)
2. Indoor Temperature (3 lines: temp, feels like, dew point)
3. Wind Speed (2 lines: speed, gust)
4. Wind Direction (1 line with 0-360° scale)
5. Barometric Pressure (1 line: relative pressure)
6. Humidity (2 lines: outdoor, indoor)
7. Rainfall (3 lines: rate, daily, event)
8. Solar & UV (dual Y-axis: solar radiation, UV index)

### Interaction Features
- **Date filter dropdown** with preset buttons + custom picker
- **Apply/Cancel** buttons for custom ranges
- **Reset Zoom** button (appears when zoomed)
- **Loading spinner** during data fetch
- **Error state** with retry button
- **Empty state** when no data available

### URL Integration
- `/graphs?start=2025-01-01T00:00:00Z&end=2025-01-07T23:59:59Z`
- Updates on filter apply
- Reads on page load
- Browser back/forward support

---

## Phase 2: Home Dashboard Implementation

### Overview
Complete the Home.vue dashboard with live data, working statistics, and auto-refresh functionality.

### Components to Extract

**1. WeatherCard.vue** - Reusable card component
```typescript
Props:
- title: string
- icon: string
- mainValue: number | string
- unit: string
- stats: { label: string, value: string }[]
- graphLink?: string (router link to graphs section)
```

This extracts the repeated card pattern from Home.vue for maintainability.

### Features to Implement

**1. Hero Card (Current Conditions)**
- Large temperature display with weather condition icon
- Weather condition text (Clear, Cloudy, Rainy, etc.) - derived from data
- Feels like temperature
- Grid of quick stats (humidity, wind, pressure)
- Last updated timestamp (formatted in user's timezone)
- Auto-updates without page flash (already partially working)

**2. Weather Cards Grid** (8 cards)
- **Outdoor:** temp, dew point, feels like, today's min/max range bar
- **Indoor:** temp, dew point, feels like, battery status
- **Wind:** speed, gust, direction (compass), max daily gust
- **Pressure:** current value, trend indicator (↑↗→↘↓)
- **Humidity:** outdoor/indoor split display
- **Rainfall:** rate, daily total, event total
- **Solar/UV:** current radiation, UV index with color coding
- **Wind Rose:** Visual direction distribution (if data available)

**3. Sidebar Statistics**
- Wire up to real data (currently shows "N/A")
- Calculate from last 24 hours:
  - Min temperature
  - Max temperature
  - Avg temperature
  - Outdoor battery status (with warning colors)
- Auto-refresh with dashboard

**4. Graph Icons on Cards**
- Small chart icon (📊 or SVG) in top-right of each card
- Links to `/graphs#section-{metric}`
- Accessible with aria-labels
- Hover effect

### Auto-Refresh Enhancement
- Already implemented in weather store (15 second polling)
- Ensure it starts on mount, stops on unmount
- Visual indicator when new data arrives (subtle animation)
- Handle stale data warnings (from health endpoint)

### Data Derivation Logic

**Weather Conditions:**
```
if (rain_rate > 0) → "Rainy ☔"
else if (solar < 100 && humidity > 85) → "Cloudy ☁️"
else if (solar > 600) → "Sunny ☀️"
else → "Partly Cloudy ⛅"
```

**Pressure Trend:**
- Compare last 3 hours of data
- Rising: > +0.03 inHg
- Falling: < -0.03 inHg
- Steady: within ±0.03 inHg

---

## Phase 3: Utility Views Implementation

### Overview
Implement the four utility views that support the main dashboard and graphs functionality.

### 1. Settings.vue

**Purpose:** User preferences and configuration

**Features:**
- **Timezone Selection**
  - Dropdown with common timezones (searchable)
  - Uses existing `/api/settings/timezone` endpoint
  - Shows current timezone with example timestamp
  - Save button with success/error feedback

- **Display Preferences** (future-ready structure)
  - Temperature units (°F/°C) - UI only, backend later
  - Wind speed units (mph/km/h) - UI only, backend later
  - Date format preference

- **Data Refresh Settings**
  - Auto-refresh toggle (enable/disable)
  - Refresh interval selector (15s, 30s, 60s)
  - Stored in localStorage

- **About Section**
  - App version
  - Database statistics (from `/api/weather/stats`)
  - Last reading timestamp
  - Data collection health status

**Layout:** Form with sections, save button at bottom

### 2. ImportData.vue

**Purpose:** CSV file upload for historical data

**Features:**
- **File Upload Zone**
  - Drag-and-drop area
  - File size limit display (100MB max)
  - File type validation (.csv only)
  - Uses existing `/api/weather/import` endpoint

- **Upload Progress**
  - Progress bar during upload
  - Status messages (validating, processing, storing)
  - Success summary (X records imported, Y duplicates skipped)

- **Recent Imports Log**
  - Table showing last 10 imports
  - Columns: date, filename, records, status
  - Stored in localStorage

- **Import History** (optional if time permits)
  - Query `/api/weather/stats` for database totals
  - Show date range of available data

**Layout:** Card with upload zone, progress area, and history table

### 3. DataExplorer.vue

**Purpose:** Advanced data querying and export

**Features:**
- **Query Builder**
  - Date range picker (reuse from Graphs)
  - Field selector (multi-select: temp, humidity, wind, etc.)
  - Limit input (default 1000, max 10000)
  - Apply button

- **Results Table**
  - Paginated table showing query results
  - Sortable columns
  - Shows first 100 rows with scroll
  - Uses `/api/weather/readings` endpoint

- **Export Options**
  - CSV export button
  - Uses existing `/api/weather/export` endpoint
  - Respects current filters
  - Download with timestamp in filename

- **Quick Stats**
  - Mini summary above table
  - Shows: total records, date range, selected fields

**Layout:** Query builder at top, stats row, table, export button at bottom

### 4. EnergyAnalysis.vue

**Purpose:** Solar and wind energy potential analysis

**Features:**
- **Analysis Type Selector**
  - Radio buttons: Solar / Wind
  - Switches between two analysis modes

- **Configuration Form**
  - **Solar:** panel area (m²), efficiency (%), tilt angle
  - **Wind:** turbine swept area (m²), efficiency (%), hub height
  - Date range picker
  - Run Analysis button

- **Results Display** (after analysis)
  - Uses existing `/api/analysis/solar` or `/api/analysis/wind` endpoints
  - Summary cards:
    - Total energy potential (kWh)
    - Average daily production
    - Peak production day
    - Capacity factor
  - Simple bar chart showing daily production
  - Export results to CSV

- **Saved Configurations** (localStorage)
  - Dropdown to load previous configs
  - Save current config button

**Layout:** Two-column - config form on left, results on right (responsive to stack on mobile)

---

## Shared Components

### LoadingSpinner.vue
- Reusable spinner component
- Props: size (sm/md/lg), message (optional)
- Tailwind styling

### ErrorBanner.vue
- Reusable error display
- Props: error message, retry callback
- Dismissible with X button
- Red theme

### SuccessBanner.vue
- Reusable success message
- Auto-dismiss after 3 seconds
- Props: message
- Green theme

---

## Error Handling

### API Error Handling
- Centralized in Pinia stores with try/catch
- Error types:
  - Network errors (fetch failed)
  - HTTP errors (400, 404, 500)
  - Validation errors (invalid date range)
  - Timeout errors (slow responses)
- Store error state: `{ message: string, code?: number, retry?: () => void }`
- Views display errors using ErrorBanner component

### Loading States
- Every async operation has loading indicator
- Skeleton loaders for initial page loads
- Inline spinners for button actions
- Prevent double-submissions during operations

### Empty States
- No data available messages
- Helpful suggestions (try different date range)
- Keep UI functional (filters still work)

### Edge Cases
- Missing data fields (show "N/A" gracefully)
- Timezone conversion failures (fallback to UTC)
- Chart rendering failures (show error in chart section)
- Large datasets (rely on backend sampling)

---

## Testing Strategy

### Manual Testing Checklist

After each phase:
- [ ] Page loads without console errors
- [ ] All API calls succeed with valid data
- [ ] Error states display properly (test with network offline)
- [ ] Loading states show and hide correctly
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Dark mode toggle works (if time permits)
- [ ] Browser back/forward navigation works
- [ ] URL parameters sync correctly

### Build Validation
- Run `npm run build` successfully
- Check bundle size (should be < 2MB)
- Test production build locally
- Verify all assets load from `/assets/`

### Cross-Browser Testing (minimum)
- Chrome/Edge (primary)
- Firefox (secondary)
- Safari (if available)

### Data Validation
- Test with empty database
- Test with partial data (gaps)
- Test with large date ranges
- Test with recent data only

---

## Performance Targets

- Initial page load: < 2 seconds
- Chart render: < 500ms for 2000 points
- Date range change: < 1 second
- Auto-refresh: < 100ms (should be imperceptible)

---

## Rollback Plan

If issues arise:
1. Frontend issues: Revert to previous `frontend/dist/` build
2. Backend issues: API is backward compatible, no changes needed
3. Git: Each phase committed separately for easy rollback

---

## Success Criteria

### Phase 1 Complete:
✅ All 8 chart types render with real data
✅ Date range filtering works with presets
✅ Custom date picker functional
✅ Synchronized zoom/pan across charts
✅ Stats badges calculate correctly
✅ URL parameters sync
✅ Loading and error states work

### Phase 2 Complete:
✅ Hero card shows live weather data
✅ All 8 weather cards display correct values
✅ Sidebar statistics show real data
✅ Graph icons link to correct sections
✅ Auto-refresh works without flashing
✅ Pressure trend indicator works
✅ Weather condition logic works

### Phase 3 Complete:
✅ Settings page saves preferences
✅ Timezone selection works
✅ Import page handles CSV uploads
✅ Data Explorer queries and exports
✅ Energy Analysis runs calculations
✅ All shared components reusable

### Overall Success:
✅ All pages functional and polished
✅ No console errors in production
✅ Responsive on all screen sizes
✅ Build size < 2MB
✅ Performance targets met
✅ All manual tests passing

---

## Future Enhancements (Out of Scope)

- Automated testing (Vitest, Vue Test Utils)
- PWA support (offline mode)
- Real-time WebSocket updates
- Advanced analytics (forecasting, anomaly detection)
- Export to PDF reports
- Email/SMS alerting
- Multi-station support
- Custom dashboard layouts
