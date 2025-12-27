// graphs.js - Sophisticated Weather Dashboard
// Handles date range selection, chart configuration, and data fetching

// Global state
let currentDateRange = {
    start: null,
    end: null,
    preset: 'past-7-days'
};

let charts = {}; // Will store Chart.js instances
let zoomState = {}; // Track zoom state per chart

// Chart sections configuration
const CHART_SECTIONS = [
    {
        id: 'outdoor',
        title: 'Outdoor Temperature & Humidity',
        charts: [
            { id: 'outdoor-temp', type: 'line', yAxis: 'Temperature (°F)', metrics: ['outdoor_temp'] },
            { id: 'outdoor-humidity', type: 'line', yAxis: 'Humidity (%)', metrics: ['outdoor_humidity'] }
        ]
    },
    {
        id: 'indoor',
        title: 'Indoor Temperature & Humidity',
        charts: [
            { id: 'indoor-temp', type: 'line', yAxis: 'Temperature (°F)', metrics: ['indoor_temp'] },
            { id: 'indoor-humidity', type: 'line', yAxis: 'Humidity (%)', metrics: ['indoor_humidity'] }
        ]
    },
    {
        id: 'wind',
        title: 'Wind Speed & Direction',
        charts: [
            { id: 'wind-speed', type: 'line', yAxis: 'Speed (mph)', metrics: ['wind_speed', 'wind_gust'] },
            { id: 'wind-direction', type: 'scatter', yAxis: 'Direction (°)', metrics: ['wind_direction'] }
        ]
    },
    {
        id: 'rain',
        title: 'Rainfall',
        charts: [
            { id: 'rain-rate', type: 'line', yAxis: 'Rate (in/hr)', metrics: ['rain_rate'] },
            { id: 'rain-daily', type: 'bar', yAxis: 'Daily Total (in)', metrics: ['rain_daily'] }
        ]
    },
    {
        id: 'pressure',
        title: 'Barometric Pressure',
        charts: [
            { id: 'pressure-abs', type: 'line', yAxis: 'Pressure (inHg)', metrics: ['pressure_abs'] },
            { id: 'pressure-rel', type: 'line', yAxis: 'Pressure (inHg)', metrics: ['pressure_rel'] }
        ]
    },
    {
        id: 'solar',
        title: 'Solar Radiation & UV',
        charts: [
            { id: 'solar-radiation', type: 'line', yAxis: 'W/m²', metrics: ['solar_radiation'] },
            { id: 'uv-index', type: 'line', yAxis: 'UV Index', metrics: ['uv'] }
        ]
    },
    {
        id: 'soil',
        title: 'Soil Moisture',
        charts: [
            { id: 'soil-moisture', type: 'line', yAxis: 'Moisture (%)', metrics: ['soil_moisture'] }
        ]
    },
    {
        id: 'battery',
        title: 'Battery Status',
        charts: [
            { id: 'battery', type: 'line', yAxis: 'Battery', metrics: ['battery'] }
        ]
    }
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeDateRange();
    setupEventListeners();
    loadDataAndRenderCharts();

    // Handle hash navigation (e.g., #section-outdoor)
    if (window.location.hash) {
        handleHashNavigation();
    }
});

// Initialize date range from URL params or default to past 7 days
function initializeDateRange() {
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');
    const endParam = urlParams.get('end');

    if (startParam && endParam) {
        // Use URL parameters
        currentDateRange.start = new Date(startParam);
        currentDateRange.end = new Date(endParam);
        currentDateRange.preset = 'custom';

        // Update UI inputs
        document.getElementById('start-date').value = formatDateTimeLocal(currentDateRange.start);
        document.getElementById('end-date').value = formatDateTimeLocal(currentDateRange.end);

        updatePresetButtons('custom');
        updateRangeLabel();
    } else {
        // Default to past 7 days
        applyPreset('past-7-days');
    }
}

// Format date for datetime-local input (YYYY-MM-DDTHH:mm)
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Setup all event listeners
function setupEventListeners() {
    // Date filter toggle
    const toggleBtn = document.getElementById('date-filter-toggle');
    const dropdown = document.getElementById('date-filter-dropdown');

    toggleBtn.addEventListener('click', function() {
        const isExpanded = dropdown.classList.toggle('show');
        toggleBtn.setAttribute('aria-expanded', isExpanded);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.date-filter')) {
            dropdown.classList.remove('show');
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const preset = this.dataset.preset;
            applyPreset(preset);
        });
    });

    // Custom range apply button
    document.getElementById('apply-custom-range').addEventListener('click', function() {
        const startInput = document.getElementById('start-date').value;
        const endInput = document.getElementById('end-date').value;

        if (!startInput || !endInput) {
            alert('Please select both start and end dates.');
            return;
        }

        const start = new Date(startInput);
        const end = new Date(endInput);

        if (start >= end) {
            alert('Start date must be before end date.');
            return;
        }

        currentDateRange.start = start;
        currentDateRange.end = end;
        currentDateRange.preset = 'custom';

        updatePresetButtons('custom');
        updateRangeLabel();
        updateURL();
        loadDataAndRenderCharts();

        // Close dropdown
        dropdown.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
    });

    // Reset all zoom button
    document.getElementById('reset-all-zoom').addEventListener('click', function() {
        resetAllZoom();
    });

    // Hash navigation for deep linking
    window.addEventListener('hashchange', handleHashNavigation);
}

// Apply a preset date range
function applyPreset(preset) {
    const now = new Date();
    let start, end;

    switch(preset) {
        case 'past-24-hours':
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            end = now;
            break;
        case 'past-7-days':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            end = now;
            break;
        case 'past-30-days':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            end = now;
            break;
        case 'past-year':
            start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            end = now;
            break;
        default:
            return;
    }

    currentDateRange.start = start;
    currentDateRange.end = end;
    currentDateRange.preset = preset;

    // Update custom range inputs to match preset
    document.getElementById('start-date').value = formatDateTimeLocal(start);
    document.getElementById('end-date').value = formatDateTimeLocal(end);

    updatePresetButtons(preset);
    updateRangeLabel();
    updateURL();
    loadDataAndRenderCharts();
}

// Update preset button active states
function updatePresetButtons(activePreset) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        if (btn.dataset.preset === activePreset) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Update the date range label in the toggle button
function updateRangeLabel() {
    const label = document.getElementById('current-range-label');

    if (currentDateRange.preset === 'custom') {
        const startStr = currentDateRange.start.toLocaleDateString();
        const endStr = currentDateRange.end.toLocaleDateString();
        label.textContent = `${startStr} - ${endStr}`;
    } else {
        // Use preset label
        const presetLabels = {
            'past-24-hours': 'Past 24 Hours',
            'past-7-days': 'Past 7 Days',
            'past-30-days': 'Past 30 Days',
            'past-year': 'Past Year'
        };
        label.textContent = presetLabels[currentDateRange.preset] || 'Select Range';
    }
}

// Update URL with current date range for shareable links
function updateURL() {
    const params = new URLSearchParams();
    params.set('start', currentDateRange.start.toISOString());
    params.set('end', currentDateRange.end.toISOString());

    const newURL = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState({}, '', newURL);
}

// Handle hash navigation (scroll to section and highlight)
function handleHashNavigation() {
    const hash = window.location.hash.substring(1); // Remove #

    if (hash.startsWith('section-')) {
        const sectionId = hash.replace('section-', '');
        const section = document.getElementById(`section-${sectionId}`);

        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Highlight section briefly
            section.classList.add('highlighted');
            setTimeout(() => {
                section.classList.remove('highlighted');
            }, 2000);
        }
    }
}

// Load data and render all charts (placeholder - will be implemented in Task 5)
function loadDataAndRenderCharts() {
    console.log('Loading data for range:', currentDateRange.start, 'to', currentDateRange.end);
    // TODO: Fetch data from /api/data endpoint
    // TODO: Render charts using Chart.js
}

// Reset zoom on all charts (placeholder - will be implemented in Task 5)
function resetAllZoom() {
    console.log('Resetting all zoom levels');
    // TODO: Call resetZoom() on all Chart.js instances
}
