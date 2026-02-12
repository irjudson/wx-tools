// graphs.js - Sophisticated Weather Dashboard
// Handles date range selection, chart configuration, and data fetching

// Global state
let currentDateRange = {
    start: null,
    end: null,
    preset: 'all'
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
        // Default to all time to show historical data
        applyPreset('all');
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
        const isVisible = dropdown.style.display !== 'none';
        if (isVisible) {
            dropdown.style.display = 'none';
            toggleBtn.setAttribute('aria-expanded', 'false');
        } else {
            dropdown.style.display = 'block';
            toggleBtn.setAttribute('aria-expanded', 'true');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.date-range-controls')) {
            dropdown.style.display = 'none';
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
    document.getElementById('reset-zoom-btn').addEventListener('click', function() {
        resetAllZoom();
    });

    // Error retry button
    document.getElementById('error-retry').addEventListener('click', function() {
        loadDataAndRenderCharts();
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
        case 'all':
            // Show all available data - use a very old start date
            start.setFullYear(2020, 0, 1);
            start.setHours(0, 0, 0, 0);
            updateRangeLabel('All Time');
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

// Load data and render all charts
async function loadDataAndRenderCharts() {
    showLoading();
    hideError();

    try {
        const response = await fetch(
            `/api/weather/readings/sampled?start=${currentDateRange.start.toISOString()}&end=${currentDateRange.end.toISOString()}`
        );

        if (!response.ok) {
            let errorMessage = 'Failed to load weather data';

            if (response.status === 400) {
                const error = await response.json();
                errorMessage = error.detail || 'Invalid date range';
            } else if (response.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (!data.readings || data.readings.length === 0) {
            showEmptyState();
            return;
        }

        renderCharts(data.readings);
        hideLoading();

    } catch (error) {
        console.error('Failed to load weather data:', error);
        showError(error.message);
    }
}

function showLoading() {
    document.getElementById('loading-state').style.display = 'flex';
    document.getElementById('charts-container').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('charts-container').style.display = 'block';
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-state').style.display = 'flex';
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('charts-container').style.display = 'none';
}

function hideError() {
    document.getElementById('error-state').style.display = 'none';
}

function showEmptyState() {
    hideLoading();
    const container = document.getElementById('charts-container');
    container.innerHTML = `
        <div class="empty-state">
            <h3>No data available</h3>
            <p>No weather readings found for this time period.</p>
            <p>Try selecting a different date range.</p>
        </div>
    `;
    container.style.display = 'block';
}

function renderCharts(readings) {
    // Destroy existing Chart.js instances to prevent memory leaks
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {}; // Clear references

    const container = document.getElementById('charts-container');
    container.innerHTML = ''; // Clear existing

    CHART_SECTIONS.forEach(section => {
        const sectionEl = createChartSection(section, readings);
        container.appendChild(sectionEl);
    });
}

function createChartSection(config, readings) {
    const section = document.createElement('div');
    section.className = 'chart-section';
    section.id = `section-${config.id}`;

    // Header
    const header = document.createElement('div');
    header.className = 'chart-header';

    // Title and stats
    const titleStats = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'chart-title';
    title.textContent = config.title;
    titleStats.appendChild(title);

    const stats = createStats(config.datasets, readings);
    titleStats.appendChild(stats);

    // Legend
    const legend = createLegend(config.datasets);

    header.appendChild(titleStats);
    header.appendChild(legend);
    section.appendChild(header);

    // Canvas
    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'chart-canvas-wrapper';
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${config.id}`;
    canvasWrapper.appendChild(canvas);
    section.appendChild(canvasWrapper);

    // Create chart
    createChart(canvas, config, readings);

    return section;
}

function createStats(datasets, readings) {
    const statsDiv = document.createElement('div');
    statsDiv.className = 'chart-stats';

    datasets.forEach(dataset => {
        const values = readings
            .map(r => r[dataset.key])
            .filter(v => v !== null && v !== undefined);

        if (values.length === 0) return;

        const current = values[values.length - 1];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        const statBadge = document.createElement('div');
        statBadge.className = 'stat-badge';
        statBadge.innerHTML = `
            <span class="stat-label">${dataset.label}</span>
            <span class="stat-value">${current.toFixed(1)}</span>
            <span class="stat-label">Min: ${min.toFixed(1)} | Max: ${max.toFixed(1)} | Avg: ${avg.toFixed(1)}</span>
        `;
        statsDiv.appendChild(statBadge);
    });

    return statsDiv;
}

function createLegend(datasets) {
    const legendDiv = document.createElement('div');
    legendDiv.className = 'chart-legend';

    datasets.forEach(dataset => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = dataset.color;

        const label = document.createElement('span');
        label.textContent = dataset.label;

        item.appendChild(colorBox);
        item.appendChild(label);
        legendDiv.appendChild(item);
    });

    return legendDiv;
}

function createChart(canvas, config, readings) {
    const ctx = canvas.getContext('2d');

    const chartData = {
        labels: readings.map(r => new Date(r.timestamp)),
        datasets: config.datasets.map(dataset => ({
            label: dataset.label,
            data: readings.map(r => r[dataset.key]),
            borderColor: dataset.color,
            backgroundColor: dataset.color + '20', // Add transparency
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: dataset.yAxisID || 'y'
        }))
    };

    const scales = {
        x: {
            type: 'time',
            time: {
                displayFormats: {
                    hour: 'MMM d, ha',
                    day: 'MMM d',
                    week: 'MMM d',
                    month: 'MMM yyyy'
                }
            },
            title: {
                display: true,
                text: 'Time'
            }
        },
        y: {
            title: {
                display: true,
                text: config.yAxisLabel
            },
            beginAtZero: false
        }
    };

    // Dual axis for solar chart
    if (config.dualAxis) {
        scales.y1 = {
            position: 'right',
            title: {
                display: true,
                text: 'UV Index'
            },
            beginAtZero: true,
            grid: {
                drawOnChartArea: false
            }
        };
    }

    charts[config.id] = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                        title: function(tooltipItems) {
                            return new Date(tooltipItems[0].parsed.x).toLocaleString();
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                            modifierKey: 'ctrl'
                        },
                        drag: {
                            enabled: true
                        },
                        mode: 'x',
                        onZoomComplete: function({chart}) {
                            handleZoomChange(chart);
                        }
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                        modifierKey: 'shift',
                        onPanComplete: function({chart}) {
                            handleZoomChange(chart);
                        }
                    }
                }
            },
            scales: scales
        }
    });
}

function handleZoomChange(sourceChart) {
    // Get zoom range from source chart
    const xScale = sourceChart.scales.x;
    zoomState.min = xScale.min;
    zoomState.max = xScale.max;

    // Apply to all other charts (debounced)
    clearTimeout(window.zoomSyncTimeout);
    window.zoomSyncTimeout = setTimeout(() => {
        syncZoomAcrossCharts(sourceChart);
    }, 100);

    // Show reset button
    document.getElementById('reset-zoom-btn').style.display = 'block';

    // Add zoomed indicator
    document.querySelectorAll('.chart-section').forEach(section => {
        section.classList.add('zoomed');
    });
}

function syncZoomAcrossCharts(sourceChart) {
    Object.values(charts).forEach(chart => {
        if (chart !== sourceChart) {
            chart.zoomScale('x', { min: zoomState.min, max: zoomState.max }, 'none');
        }
    });
}

function resetAllZoom() {
    zoomState.min = null;
    zoomState.max = null;

    Object.values(charts).forEach(chart => {
        chart.resetZoom();
    });

    document.getElementById('reset-zoom-btn').style.display = 'none';

    document.querySelectorAll('.chart-section').forEach(section => {
        section.classList.remove('zoomed');
    });
}
