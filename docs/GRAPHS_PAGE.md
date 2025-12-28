# Graphs & Analysis Page

## Overview

The Graphs & Analysis page provides comprehensive historical weather data visualization with interactive charts.

## Features

### Date Range Filtering

**Preset Ranges:**
- Last 24 Hours
- Past 7 Days (default)
- Past 30 Days
- Past 90 Days
- Past Year
- Year to Date
- Custom (select specific dates)

**Custom Date Range:**
1. Click "Past 7 Days" dropdown
2. Click "Custom" button
3. Select start and end dates
4. Click "Apply"

### Interactive Charts

**8 Chart Sections:**
1. Outdoor Temperature (temp, dew point, feels like)
2. Indoor Temperature (temp, dew point, feels like)
3. Wind Speed (speed, gust)
4. Wind Direction
5. Barometric Pressure
6. Humidity (outdoor, indoor)
7. Rainfall (rate, daily, event)
8. Solar & UV (radiation, UV index)

**Zoom Controls:**
- **Ctrl + Mouse Wheel**: Zoom in/out on time axis
- **Click + Drag**: Box select to zoom
- **Shift + Click + Drag**: Pan when zoomed
- **Double Click**: Reset zoom on individual chart
- **Reset Zoom Button**: Reset all charts to full range

**Features:**
- Synchronized zoom across all charts
- Statistics: Current, Min, Max, Avg for each metric
- Tooltips show exact values and timestamp
- Charts auto-scale based on data range

### Navigation

**From Dashboard:**
- Click graph icon (📊) on any weather card
- Automatically scrolls to that metric's chart
- Section highlights briefly for 2 seconds

**Direct Links:**
- Share URLs with date ranges: `/graphs?start=2025-12-20T00:00:00Z&end=2025-12-27T23:59:59Z`
- Anchor links: `/graphs#section-outdoor`

## Performance

**Smart Data Sampling:**
- Automatically selects appropriate bucket size based on date range
- Returns ~1500-2000 data points regardless of range
- Uses TimescaleDB time_bucket for efficient aggregation

| Date Range | Bucket Size | Points |
|------------|-------------|--------|
| < 6 hours | 1 minute | ~360 |
| 6-24 hours | 2 minutes | ~720 |
| 1-7 days | 10 minutes | ~1008 |
| 7-30 days | 30 minutes | ~1440 |
| 30-90 days | 2 hours | ~1080 |
| 90-365 days | 6 hours | ~1460 |

**Limits:**
- Maximum date range: 2 years
- Recommended for best performance: <= 90 days

## Keyboard Accessibility

- **Tab**: Navigate between controls
- **Enter**: Activate buttons
- **Escape**: Close date picker dropdown
- **Arrow Keys**: Navigate chart data points (when focused)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires JavaScript enabled
- Zoom features require modern browser (ES6+ support)
