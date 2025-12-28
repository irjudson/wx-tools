// graphs.js - Sophisticated Weather Dashboard
// Handles date range selection, chart configuration, and data fetching

// Global state
let currentDateRange = {
    start: null,
    end: null,
    preset: '7d'
};

let charts = {}; // Will store Chart.js instances
let zoomState = {}; // Track zoom state per chart

// Chart sections configuration
const CHART_SECTIONS = [
    {
        id: 'outdoor',
        title: 'Outdoor Temperature',
        datasets: [
            { key: 'outdoor_temp_f', label: 'Temperature', color: '#3b82f6' },
            { key: 'dew_point_f', label: 'Dew Point', color: '#10b981' },
            { key: 'feels_like_f', label: 'Feels Like', color: '#f97316' }
        ],
        yAxisLabel: 'Temperature (°F)'
    },
    {
        id: 'indoor',
        title: 'Indoor Temperature',
        datasets: [
            { key: 'indoor_temp_f', label: 'Temperature', color: '#3b82f6' },
            { key: 'indoor_dew_point_f', label: 'Dew Point', color: '#10b981' },
            { key: 'indoor_feels_like_f', label: 'Feels Like', color: '#f97316' }
        ],
        yAxisLabel: 'Temperature (°F)'
    },
    {
        id: 'wind-speed',
        title: 'Wind Speed',
        datasets: [
            { key: 'wind_speed_mph', label: 'Wind Speed', color: '#3b82f6' },
            { key: 'wind_gust_mph', label: 'Wind Gust', color: '#ef4444' }
        ],
        yAxisLabel: 'Speed (mph)'
    },
    {
        id: 'wind-direction',
        title: 'Wind Direction',
        datasets: [
            { key: 'wind_direction_deg', label: 'Direction', color: '#a855f7' }
        ],
        yAxisLabel: 'Direction (degrees)'
    },
    {
        id: 'pressure',
        title: 'Barometric Pressure',
        datasets: [
            { key: 'relative_pressure_inhg', label: 'Pressure', color: '#3b82f6' }
        ],
        yAxisLabel: 'Pressure (inHg)'
    },
    {
        id: 'humidity',
        title: 'Humidity',
        datasets: [
            { key: 'humidity_pct', label: 'Outdoor', color: '#3b82f6' },
            { key: 'indoor_humidity_pct', label: 'Indoor', color: '#10b981' }
        ],
        yAxisLabel: 'Humidity (%)'
    },
    {
        id: 'rainfall',
        title: 'Rainfall',
        datasets: [
            { key: 'rain_rate_in_hr', label: 'Rate (in/hr)', color: '#3b82f6' },
            { key: 'daily_rain_in', label: 'Daily Total', color: '#10b981' },
            { key: 'event_rain_in', label: 'Event Total', color: '#f97316' }
        ],
        yAxisLabel: 'Rainfall (inches)'
    },
    {
        id: 'solar',
        title: 'Solar & UV',
        datasets: [
            { key: 'solar_radiation_wm2', label: 'Solar Radiation', color: '#f97316', yAxisID: 'y' },
            { key: 'uv_index', label: 'UV Index', color: '#a855f7', yAxisID: 'y1' }
        ],
        yAxisLabel: 'Solar (W/m²)',
        dualAxis: true
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
        const start = new Date(startParam);
        const end = new Date(endParam);

        // Validate dates are valid and in reasonable range
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn('Invalid date parameters, using default');
            applyPreset('7d');
            return;
        }

        if (start >= end) {
            console.warn('Start date must be before end date');
            applyPreset('7d');
            return;
        }

        currentDateRange.start = start;
        currentDateRange.end = end;
        currentDateRange.preset = 'custom';

        // Update UI inputs
        document.getElementById('start-date').value = formatDateTimeLocal(currentDateRange.start);
        document.getElementById('end-date').value = formatDateTimeLocal(currentDateRange.end);

        updatePresetButtons('custom');
        updateRangeLabel();
    } else {
        // Default to past 7 days
        applyPreset('7d');
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

// Show validation error in dropdown
function showValidationError(message) {
    const dropdown = document.getElementById('date-filter-dropdown');
    // Remove any existing error
    const existingError = dropdown.querySelector('.validation-error');
    if (existingError) existingError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');
    errorDiv.style.cssText = 'color: #dc2626; background: #fef2f2; padding: 0.5rem; border-radius: 6px; margin-bottom: 0.5rem; font-size: 0.875rem;';
    dropdown.insertBefore(errorDiv, dropdown.firstChild);
    setTimeout(() => errorDiv.remove(), 3000);
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
        if (!event.target.closest('.date-range-controls')) {
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
            showValidationError('Please select both start and end dates');
            return;
        }

        const start = new Date(startInput);
        const end = new Date(endInput);

        if (start >= end) {
            showValidationError('Start date must be before end date');
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

function applyPreset(preset) {
    const end = new Date();
    const start = new Date();

    switch(preset) {
        case '24h':
            start.setHours(start.getHours() - 24);
            updateRangeLabel('Last 24 Hours');
            break;
        case '7d':
            start.setDate(start.getDate() - 7);
            updateRangeLabel('Past 7 Days');
            break;
        case '30d':
            start.setDate(start.getDate() - 30);
            updateRangeLabel('Past 30 Days');
            break;
        case '90d':
            start.setDate(start.getDate() - 90);
            updateRangeLabel('Past 90 Days');
            break;
        case '1y':
            start.setFullYear(start.getFullYear() - 1);
            updateRangeLabel('Past Year');
            break;
        case 'ytd':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            updateRangeLabel('Year to Date');
            break;
    }

    currentDateRange.start = start;
    currentDateRange.end = end;
    currentDateRange.preset = preset;

    document.getElementById('start-date').value = formatDateTimeLocal(start);
    document.getElementById('end-date').value = formatDateTimeLocal(end);

    updatePresetButtons(preset);
    updateURL();
    loadDataAndRenderCharts();
    document.getElementById('date-filter-dropdown').style.display = 'none';
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
function updateRangeLabel(labelText) {
    const label = document.getElementById('current-range-label');

    if (labelText) {
        // Use provided label text (from applyPreset)
        label.textContent = labelText;
    } else if (currentDateRange.preset === 'custom') {
        const startStr = currentDateRange.start.toLocaleDateString();
        const endStr = currentDateRange.end.toLocaleDateString();
        label.textContent = `${startStr} - ${endStr}`;
    } else {
        // Use preset label
        const presetLabels = {
            '24h': 'Last 24 Hours',
            '7d': 'Past 7 Days',
            '30d': 'Past 30 Days',
            '90d': 'Past 90 Days',
            '1y': 'Past Year',
            'ytd': 'Year to Date'
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
    // Destroy existing charts before creating new ones
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {}; // Clear references

    console.log('Loading data for range:', currentDateRange.start, 'to', currentDateRange.end);
    // TODO: Fetch data from /api/data endpoint
    // TODO: Render charts using Chart.js
}

// Reset zoom on all charts (placeholder - will be implemented in Task 5)
function resetAllZoom() {
    console.log('Resetting all zoom levels');
    // TODO: Call resetZoom() on all Chart.js instances
}
