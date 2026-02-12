// Weather Station Dashboard Application

// Global state
let temperatureChart = null;
let userTimezone = 'UTC'; // Loaded from backend on init

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    initializeNavigation();
    await loadUserSettings(); // Load timezone before dashboard
    loadDatabaseStats(); // Load stats immediately (visible on all pages)
    loadDashboard();
    startDashboardAutoRefresh(); // Auto-refresh every minute
    initializeImportForm();
    initializeAnalysisForms();
    initializeDataExplorer();
    loadSettings();
});

// Navigation Handler
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetSection = item.getAttribute('data-section');
            const href = item.getAttribute('href');

            // If link has a real href (not # or empty), allow default navigation
            if (href && href !== '#' && !href.startsWith('#')) {
                // Let the browser handle the navigation
                return;
            }

            // Handle single-page navigation
            e.preventDefault();

            // Don't do anything if no data-section (e.g., external links)
            if (!targetSection) return;

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                }
            });

            // Load section-specific data
            if (targetSection === 'dashboard') {
                loadDashboard();
            } else if (targetSection === 'settings') {
                loadSettings();
            }
        });
    });
}

// Dashboard Functions
async function loadDashboard() {
    const latest = await loadLatestReading();
    if (latest) {
        updateHeroCard(latest);
        updateWeatherCards(latest);
        updateWindNeedleGauge(latest);
    }
    await Promise.all([
        loadAllCharts(),
        updateWindRose(),
        updateSparklines(),
        updateRainfallBars()
    ]);
}

// Auto-refresh dashboard - poll for new data intelligently
let dashboardRefreshInterval = null;
let lastKnownTimestamp = null;

async function checkForNewData() {
    try {
        const response = await fetch('/api/weather/latest');
        if (!response.ok) return false;

        const data = await response.json();
        const currentTimestamp = data.timestamp;

        // First time - store the timestamp
        if (lastKnownTimestamp === null) {
            lastKnownTimestamp = currentTimestamp;
            return false;
        }

        // Check if new data arrived
        if (currentTimestamp !== lastKnownTimestamp) {
            lastKnownTimestamp = currentTimestamp;
            return true; // New data detected
        }

        return false; // No new data
    } catch (error) {
        console.error('Failed to check for new data:', error);
        return false;
    }
}

function startDashboardAutoRefresh() {
    // Clear any existing interval
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
    }

    // Poll for new data every 15 seconds
    dashboardRefreshInterval = setInterval(async () => {
        // Always refresh stats (visible on all pages in sidebar)
        loadDatabaseStats();

        // Only check dashboard content if dashboard is active
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection && dashboardSection.classList.contains('active')) {
            // Check if new data arrived
            const hasNewData = await checkForNewData();
            if (hasNewData) {
                console.log('New data detected - refreshing dashboard...');
                loadDashboard();
            }
        }
    }, 15000); // Check every 15 seconds
}

function stopDashboardAutoRefresh() {
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
    }
    lastKnownTimestamp = null;
}

async function loadLatestReading() {
    try {
        const response = await fetch('/api/weather/latest');

        if (!response.ok) {
            throw new Error('No data available');
        }

        const data = await response.json();
        return data; // Return data for hero card
    } catch (error) {
        console.error('Failed to load latest reading:', error);
        return null;
    }
}

async function loadDatabaseStats() {
    const container = document.getElementById('database-stats');

    try {
        const response = await fetch('/api/weather/stats');

        if (!response.ok) {
            throw new Error('Failed to load stats');
        }

        const data = await response.json();

        // Format dates
        const firstDate = data.first_reading ? new Date(data.first_reading) : null;
        const lastDate = data.last_reading ? new Date(data.last_reading) : null;

        const formatShortDate = (date) => {
            if (!date) return '--';
            const now = new Date();

            // Convert dates to user's timezone for comparison
            const dateInUserTZ = date.toLocaleDateString('en-US', { timeZone: userTimezone });
            const nowInUserTZ = now.toLocaleDateString('en-US', { timeZone: userTimezone });

            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayInUserTZ = yesterday.toLocaleDateString('en-US', { timeZone: userTimezone });

            const isToday = dateInUserTZ === nowInUserTZ;
            const isYesterday = dateInUserTZ === yesterdayInUserTZ;

            if (isToday) {
                return date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: userTimezone
                });
            } else if (isYesterday) {
                return 'Yesterday';
            } else {
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: userTimezone
                });
            }
        };

        const newStats = {
            lastReading: formatShortDate(lastDate),
            coverage: data.coverage_days !== null ? Math.round(data.coverage_days) + ' days' : '--',
            firstReading: formatShortDate(firstDate),
            totalReadings: data.total_readings.toLocaleString()
        };

        // Only create HTML structure if it doesn't exist
        if (!container.querySelector('.stat-value[data-stat]')) {
            container.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value" data-stat="lastReading">${newStats.lastReading}</div>
                    <div class="stat-label">Last Reading</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" data-stat="coverage">${newStats.coverage}</div>
                    <div class="stat-label">Coverage</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" data-stat="firstReading">${newStats.firstReading}</div>
                    <div class="stat-label">First Reading</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" data-stat="totalReadings">${newStats.totalReadings}</div>
                    <div class="stat-label">Total Readings</div>
                </div>
            `;
        } else {
            // Update only changed values smoothly
            updateStatValueIfChanged('lastReading', newStats.lastReading);
            updateStatValueIfChanged('coverage', newStats.coverage);
            updateStatValueIfChanged('firstReading', newStats.firstReading);
            updateStatValueIfChanged('totalReadings', newStats.totalReadings);
        }
    } catch (error) {
        container.innerHTML = `
            <div class="stat-item" style="grid-column: 1 / -1;">
                <div class="stat-value error">Error</div>
                <div class="stat-label">Failed to load statistics</div>
            </div>
        `;
        console.error('Failed to load database stats:', error);
    }
}

// Helper function to smoothly update a single stat value
function updateStatValueIfChanged(statName, newValue) {
    const element = document.querySelector(`[data-stat="${statName}"]`);
    if (element && element.textContent !== newValue) {
        // Add smooth fade transition
        element.style.transition = 'opacity 0.3s ease-in-out';
        element.style.opacity = '0.4';

        setTimeout(() => {
            element.textContent = newValue;
            element.style.opacity = '1';
        }, 150);
    }
}

// Chart instances
let charts = {};

async function loadAllCharts() {
    try {
        // Get last 24 hours of data
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000));

        const response = await fetch(
            `/api/weather/readings?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=1000`
        );

        if (!response.ok) {
            throw new Error('Failed to load readings');
        }

        const readings = await response.json();

        // Reverse to show oldest first
        readings.reverse();

        // Prepare common chart data
        const labels = readings.map(r => {
            const date = new Date(r.timestamp);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: userTimezone
            });
        });

        // Outdoor Conditions
        createOrUpdateChart('outdoor-temp', 'outdoor-temp-chart', {
            label: 'Temperature (°F)',
            data: readings.map(r => r.outdoor_temp_f),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)'
        }, labels);

        createOrUpdateChart('outdoor-humidity', 'outdoor-humidity-chart', {
            label: 'Humidity (%)',
            data: readings.map(r => r.humidity_pct),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            yMin: 0,
            yMax: 100
        }, labels);

        createOrUpdateChart('feels-like', 'feels-like-chart', {
            label: 'Feels Like (°F)',
            data: readings.map(r => r.feels_like_f),
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)'
        }, labels);

        createOrUpdateChart('dew-point', 'dew-point-chart', {
            label: 'Dew Point (°F)',
            data: readings.map(r => r.dew_point_f),
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)'
        }, labels);

        // Wind Conditions
        createOrUpdateChart('wind-speed', 'wind-speed-chart', {
            label: 'Wind Speed (mph)',
            data: readings.map(r => r.wind_speed_mph),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            yMin: 0
        }, labels);

        createOrUpdateChart('wind-gust', 'wind-gust-chart', {
            label: 'Wind Gust (mph)',
            data: readings.map(r => r.wind_gust_mph),
            borderColor: '#14b8a6',
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            yMin: 0
        }, labels);

        createOrUpdateChart('max-gust', 'max-gust-chart', {
            label: 'Max Daily Gust (mph)',
            data: readings.map(r => r.max_daily_gust_mph),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            yMin: 0
        }, labels);

        createOrUpdateChart('wind-direction', 'wind-direction-chart', {
            label: 'Wind Direction (°)',
            data: readings.map(r => r.wind_direction_deg),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            yMin: 0,
            yMax: 360
        }, labels);

        // Atmospheric Pressure
        createOrUpdateChart('relative-pressure', 'relative-pressure-chart', {
            label: 'Relative Pressure (inHg)',
            data: readings.map(r => r.relative_pressure_inhg),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)'
        }, labels);

        createOrUpdateChart('absolute-pressure', 'absolute-pressure-chart', {
            label: 'Absolute Pressure (inHg)',
            data: readings.map(r => r.absolute_pressure_inhg),
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)'
        }, labels);

        // Solar & UV
        createOrUpdateChart('solar-radiation', 'solar-radiation-chart', {
            label: 'Solar Radiation (W/m²)',
            data: readings.map(r => r.solar_radiation_wm2),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            yMin: 0
        }, labels);

        createOrUpdateChart('uv-index', 'uv-index-chart', {
            label: 'UV Index',
            data: readings.map(r => r.uv_index),
            borderColor: '#eab308',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            yMin: 0
        }, labels);

        // Precipitation
        createOrUpdateChart('hourly-rain', 'hourly-rain-chart', {
            label: 'Hourly Rain (in/hr)',
            data: readings.map(r => r.rain_rate_in_hr),
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            yMin: 0
        }, labels);

        createOrUpdateChart('daily-rain', 'daily-rain-chart', {
            label: 'Daily Rain (in)',
            data: readings.map(r => r.daily_rain_in),
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            yMin: 0
        }, labels);

        createOrUpdateChart('event-rain', 'event-rain-chart', {
            label: 'Event Rain (in)',
            data: readings.map(r => r.event_rain_in),
            borderColor: '#0369a1',
            backgroundColor: 'rgba(3, 105, 161, 0.1)',
            yMin: 0
        }, labels);

        createOrUpdateChart('weekly-rain', 'weekly-rain-chart', {
            label: 'Weekly Rain (in)',
            data: readings.map(r => r.weekly_rain_in),
            borderColor: '#075985',
            backgroundColor: 'rgba(7, 89, 133, 0.1)',
            yMin: 0
        }, labels);

        createOrUpdateChart('monthly-rain', 'monthly-rain-chart', {
            label: 'Monthly Rain (in)',
            data: readings.map(r => r.monthly_rain_in),
            borderColor: '#0c4a6e',
            backgroundColor: 'rgba(12, 74, 110, 0.1)',
            yMin: 0
        }, labels);

        createOrUpdateChart('yearly-rain', 'yearly-rain-chart', {
            label: 'Yearly Rain (in)',
            data: readings.map(r => r.yearly_rain_in),
            borderColor: '#082f49',
            backgroundColor: 'rgba(8, 47, 73, 0.1)',
            yMin: 0
        }, labels);

        // Indoor Conditions
        createOrUpdateChart('indoor-temp', 'indoor-temp-chart', {
            label: 'Indoor Temperature (°F)',
            data: readings.map(r => r.indoor_temp_f),
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)'
        }, labels);

        createOrUpdateChart('indoor-humidity', 'indoor-humidity-chart', {
            label: 'Indoor Humidity (%)',
            data: readings.map(r => r.indoor_humidity_pct),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            yMin: 0,
            yMax: 100
        }, labels);

        createOrUpdateChart('indoor-feels-like', 'indoor-feels-like-chart', {
            label: 'Indoor Feels Like (°F)',
            data: readings.map(r => r.indoor_feels_like_f),
            borderColor: '#ea580c',
            backgroundColor: 'rgba(234, 88, 12, 0.1)'
        }, labels);

        createOrUpdateChart('indoor-dew-point', 'indoor-dew-point-chart', {
            label: 'Indoor Dew Point (°F)',
            data: readings.map(r => r.indoor_dew_point_f),
            borderColor: '#0891b2',
            backgroundColor: 'rgba(8, 145, 178, 0.1)'
        }, labels);

        // Sensor 1
        createOrUpdateChart('sensor1-temp', 'sensor1-temp-chart', {
            label: 'Sensor 1 Temperature (°F)',
            data: readings.map(r => r.sensor1_temp_f),
            borderColor: '#be123c',
            backgroundColor: 'rgba(190, 18, 60, 0.1)'
        }, labels);

        createOrUpdateChart('sensor1-humidity', 'sensor1-humidity-chart', {
            label: 'Sensor 1 Humidity (%)',
            data: readings.map(r => r.sensor1_humidity_pct),
            borderColor: '#1d4ed8',
            backgroundColor: 'rgba(29, 78, 216, 0.1)',
            yMin: 0,
            yMax: 100
        }, labels);

        createOrUpdateChart('sensor1-feels-like', 'sensor1-feels-like-chart', {
            label: 'Sensor 1 Feels Like (°F)',
            data: readings.map(r => r.sensor1_feels_like_f),
            borderColor: '#c2410c',
            backgroundColor: 'rgba(194, 65, 12, 0.1)'
        }, labels);

        createOrUpdateChart('sensor1-dew-point', 'sensor1-dew-point-chart', {
            label: 'Sensor 1 Dew Point (°F)',
            data: readings.map(r => r.sensor1_dew_point_f),
            borderColor: '#0e7490',
            backgroundColor: 'rgba(14, 116, 144, 0.1)'
        }, labels);

        // Battery Status
        createOrUpdateChart('outdoor-battery', 'outdoor-battery-chart', {
            label: 'Outdoor Battery',
            data: readings.map(r => r.outdoor_battery),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            yMin: 0,
            yMax: 1
        }, labels);

        createOrUpdateChart('sensor1-battery', 'sensor1-battery-chart', {
            label: 'Sensor 1 Battery',
            data: readings.map(r => r.sensor1_battery),
            borderColor: '#15803d',
            backgroundColor: 'rgba(21, 128, 61, 0.1)',
            yMin: 0,
            yMax: 1
        }, labels);

    } catch (error) {
        console.error('Failed to load charts:', error);
    }
}

// Create compact Chart.js chart for weather cards
function createCardChart(chartKey, canvasId, config) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Prepare datasets - support both single and multiple datasets
    let datasets;
    if (config.datasets) {
        datasets = config.datasets.map(ds => ({
            label: ds.label,
            data: ds.data,
            borderColor: ds.borderColor,
            backgroundColor: ds.backgroundColor || ds.borderColor.replace(')', ', 0.1)').replace('rgb', 'rgba'),
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 3
        }));
    } else {
        datasets = [{
            label: config.label,
            data: config.data,
            borderColor: config.borderColor,
            backgroundColor: config.backgroundColor || config.borderColor.replace(')', ', 0.1)').replace('rgb', 'rgba'),
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 3
        }];
    }

    // Update existing chart if present, otherwise create new one
    if (charts[chartKey]) {
        // Update chart data smoothly
        charts[chartKey].data.labels = config.labels || [];
        charts[chartKey].data.datasets = datasets;
        charts[chartKey].update('none'); // 'none' mode = no animation for instant update
        return;
    }

    charts[chartKey] = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: config.labels || [],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 6,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: config.datasets && config.datasets.length > 1,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 6,
                        font: { size: 10 },
                        padding: 8
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        title: function(context) {
                            return '';  // No title for compact view
                        },
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1);
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: config.showXAxis || false,
                    ticks: {
                        font: { size: 9 },
                        maxRotation: 0,
                        autoSkipPadding: 20
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: false,
                    beginAtZero: false
                }
            }
        }
    });
}

function createOrUpdateChart(chartKey, canvasId, config, labels) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Support both single dataset (config.data) and multiple datasets (config.datasets)
    let datasets;
    if (config.datasets) {
        // Multiple datasets provided
        datasets = config.datasets.map(ds => ({
            label: ds.label,
            data: ds.data,
            borderColor: ds.borderColor,
            backgroundColor: ds.backgroundColor,
            borderWidth: 2,
            fill: ds.fill !== undefined ? ds.fill : true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: ds.yAxisID || 'y'
        }));
    } else {
        // Single dataset (backward compatibility)
        datasets = [{
            label: config.label,
            data: config.data,
            borderColor: config.borderColor,
            backgroundColor: config.backgroundColor,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4
        }];
    }

    // Update existing chart if present, otherwise create new one
    if (charts[chartKey]) {
        // Update chart data smoothly
        charts[chartKey].data.labels = labels;
        charts[chartKey].data.datasets = datasets;
        charts[chartKey].update('none'); // 'none' mode = no animation for instant update
        return;
    }

    charts[chartKey] = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: config.datasets ? true : false,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 6
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: config.yMin !== undefined,
                    min: config.yMin,
                    max: config.yMax,
                    title: {
                        display: true,
                        text: config.yAxisLabel
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        maxTicksLimit: 12,
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Import Functions
function initializeImportForm() {
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('csv-file');

    importBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];

        if (!file) {
            showStatus('import-status', 'Please select a CSV file', 'error');
            return;
        }

        if (!file.name.endsWith('.csv')) {
            showStatus('import-status', 'File must be a CSV file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        importBtn.disabled = true;
        importBtn.textContent = 'Importing...';
        showStatus('import-status', 'Uploading and processing CSV file...', 'info');

        try {
            const response = await fetch('/api/weather/import', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || 'Import failed');
            }

            showStatus('import-status', 'Import completed successfully!', 'success');
            displayImportResults(result);

            // Refresh dashboard
            loadDashboard();

        } catch (error) {
            showStatus('import-status', `Import failed: ${error.message}`, 'error');
            console.error('Import error:', error);
        } finally {
            importBtn.disabled = false;
            importBtn.textContent = 'Import File';
        }
    });
}

function displayImportResults(results) {
    const container = document.getElementById('import-results');

    container.innerHTML = `
        <h4>Import Results</h4>
        <ul>
            <li><strong>Total Rows:</strong> ${results.total_rows}</li>
            <li><strong>Imported:</strong> ${results.imported}</li>
            <li><strong>Updated:</strong> ${results.updated}</li>
            <li><strong>Errors:</strong> ${results.errors}</li>
        </ul>
    `;

    container.classList.add('visible');
}

// Analysis Functions
function initializeAnalysisForms() {
    // Set default date range (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    document.getElementById('analysis-end').value = formatDateTimeLocal(now);
    document.getElementById('analysis-start').value = formatDateTimeLocal(thirtyDaysAgo);

    // Solar analysis
    document.getElementById('run-solar-btn').addEventListener('click', runSolarAnalysis);

    // Wind analysis
    document.getElementById('run-wind-btn').addEventListener('click', runWindAnalysis);
}

async function runSolarAnalysis() {
    const startInput = document.getElementById('analysis-start').value;
    const endInput = document.getElementById('analysis-end').value;
    const panelArea = parseFloat(document.getElementById('solar-panel-area').value);
    const efficiency = parseFloat(document.getElementById('solar-efficiency').value);

    if (!startInput || !endInput) {
        alert('Please select start and end dates');
        return;
    }

    const btn = document.getElementById('run-solar-btn');
    btn.disabled = true;
    btn.textContent = 'Analyzing...';

    try {
        const response = await fetch('/api/analysis/solar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start: new Date(startInput).toISOString(),
                end: new Date(endInput).toISOString(),
                config: {
                    panel_area_m2: panelArea,
                    efficiency_percent: efficiency
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Analysis failed');
        }

        displaySolarResults(result);

    } catch (error) {
        alert(`Solar analysis failed: ${error.message}`);
        console.error('Solar analysis error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Run Solar Analysis';
    }
}

function displaySolarResults(results) {
    const container = document.getElementById('solar-results');

    container.innerHTML = `
        <h4>Solar Analysis Results</h4>
        <ul>
            <li><strong>Total Energy:</strong> ${results.total_kwh?.toFixed(2) || 'N/A'} kWh</li>
            <li><strong>Daily Average:</strong> ${results.daily_avg_kwh?.toFixed(2) || 'N/A'} kWh/day</li>
            <li><strong>Effective Efficiency:</strong> ${results.data?.effective_efficiency_pct?.toFixed(1) || 'N/A'}%</li>
            <li><strong>Period:</strong> ${formatDateTime(results.start_date)} to ${formatDateTime(results.end_date)}</li>
            <li><strong>Readings Analyzed:</strong> ${results.data?.num_readings || 'N/A'}</li>
            <li><strong>Panel Area:</strong> ${results.config?.panel_area_m2 || 'N/A'} m²</li>
            <li><strong>Panel Efficiency:</strong> ${results.config?.efficiency_percent || 'N/A'}%</li>
            <li><strong>Annual Estimate:</strong> ${results.roi?.annual_kwh?.toFixed(1) || 'N/A'} kWh/year</li>
            <li><strong>Annual Savings:</strong> $${results.roi?.annual_cost_savings?.toFixed(2) || 'N/A'}</li>
            <li><strong>Payback Period:</strong> ${results.roi?.payback_years?.toFixed(1) || 'N/A'} years</li>
        </ul>
    `;

    container.classList.add('visible');
}

async function runWindAnalysis() {
    const startInput = document.getElementById('analysis-start').value;
    const endInput = document.getElementById('analysis-end').value;
    const rotorDiameter = parseFloat(document.getElementById('wind-rotor-diameter').value);
    const efficiency = parseFloat(document.getElementById('wind-efficiency').value);

    if (!startInput || !endInput) {
        alert('Please select start and end dates');
        return;
    }

    const btn = document.getElementById('run-wind-btn');
    btn.disabled = true;
    btn.textContent = 'Analyzing...';

    try {
        const response = await fetch('/api/analysis/wind', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start: new Date(startInput).toISOString(),
                end: new Date(endInput).toISOString(),
                config: {
                    rotor_diameter_m: rotorDiameter,
                    efficiency_percent: efficiency
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Analysis failed');
        }

        displayWindResults(result);

    } catch (error) {
        alert(`Wind analysis failed: ${error.message}`);
        console.error('Wind analysis error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Run Wind Analysis';
    }
}

function displayWindResults(results) {
    const container = document.getElementById('wind-results');

    container.innerHTML = `
        <h4>Wind Analysis Results</h4>
        <ul>
            <li><strong>Total Energy:</strong> ${results.total_kwh?.toFixed(2) || 'N/A'} kWh</li>
            <li><strong>Daily Average:</strong> ${results.daily_avg_kwh?.toFixed(2) || 'N/A'} kWh/day</li>
            <li><strong>Average Power:</strong> ${results.data?.avg_power_kw?.toFixed(2) || 'N/A'} kW</li>
            <li><strong>Rated Power:</strong> ${results.data?.rated_power_kw?.toFixed(1) || 'N/A'} kW</li>
            <li><strong>Capacity Factor:</strong> ${results.data?.capacity_factor_pct?.toFixed(1) || 'N/A'}%</li>
            <li><strong>Operational Hours:</strong> ${results.data?.operational_hours?.toFixed(1) || 'N/A'} hours</li>
            <li><strong>Period:</strong> ${formatDateTime(results.start_date)} to ${formatDateTime(results.end_date)}</li>
            <li><strong>Readings Analyzed:</strong> ${results.data?.num_readings || 'N/A'}</li>
            <li><strong>Rotor Diameter:</strong> ${results.config?.rotor_diameter_m || 'N/A'} m</li>
            <li><strong>Turbine Efficiency:</strong> ${results.config?.efficiency_percent || 'N/A'}%</li>
            <li><strong>Annual Estimate:</strong> ${results.roi?.annual_kwh?.toFixed(1) || 'N/A'} kWh/year</li>
            <li><strong>Annual Savings:</strong> $${results.roi?.annual_cost_savings?.toFixed(2) || 'N/A'}</li>
            <li><strong>Payback Period:</strong> ${results.roi?.payback_years?.toFixed(1) || 'N/A'} years</li>
        </ul>
    `;

    container.classList.add('visible');
}

// Settings Functions
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

            // Handle changes (only add listener if not already added)
            if (!timezoneSelect.dataset.listenerAdded) {
                timezoneSelect.addEventListener('change', async (e) => {
                    await saveTimezone(e.target.value);
                });
                timezoneSelect.dataset.listenerAdded = 'true';
            }
        } catch (error) {
            console.error('Failed to load timezones:', error);
            timezoneSelect.innerHTML = '<option>Error loading timezones</option>';
        }
    }

    try {
        const response = await fetch('/api/config');

        if (!response.ok) {
            throw new Error('Failed to load settings');
        }

        const config = await response.json();
        const mqtt = config.mqtt;

        document.getElementById('mqtt-enabled').checked = mqtt.enabled;
        document.getElementById('mqtt-broker').value = mqtt.broker;
        document.getElementById('mqtt-port').value = mqtt.port;
        document.getElementById('mqtt-topic').value = mqtt.topic;
        document.getElementById('mqtt-username').value = mqtt.username || '';
        document.getElementById('mqtt-password').value = mqtt.password || '';

    } catch (error) {
        console.error('Failed to load settings:', error);
        showStatus('settings-status', 'Failed to load settings', 'error');
    }

    // Save settings handler
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
}

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

        // Show success message
        alert('Timezone updated successfully');

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

async function saveSettings() {
    const config = {
        enabled: document.getElementById('mqtt-enabled').checked,
        broker: document.getElementById('mqtt-broker').value,
        port: parseInt(document.getElementById('mqtt-port').value),
        topic: document.getElementById('mqtt-topic').value,
        username: document.getElementById('mqtt-username').value || null,
        password: document.getElementById('mqtt-password').value || null
    };

    const btn = document.getElementById('save-settings-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const response = await fetch('/api/config/mqtt', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Failed to save settings');
        }

        showStatus('settings-status', 'Settings saved successfully!', 'success');

    } catch (error) {
        showStatus('settings-status', `Failed to save settings: ${error.message}`, 'error');
        console.error('Settings save error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Settings';
    }
}

// Data Explorer Functions
let explorerData = null;

function initializeDataExplorer() {
    const queryBtn = document.getElementById('query-data-btn');
    const exportBtn = document.getElementById('export-csv-btn');
    const solarBtn = document.getElementById('use-for-solar-btn');
    const windBtn = document.getElementById('use-for-wind-btn');

    queryBtn.addEventListener('click', queryExplorerData);
    exportBtn.addEventListener('click', exportExplorerData);
    solarBtn.addEventListener('click', () => useDataForAnalysis('solar'));
    windBtn.addEventListener('click', () => useDataForAnalysis('wind'));

    // Set default date range (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    document.getElementById('explorer-end').value = formatDateTimeLocal(now);
    document.getElementById('explorer-start').value = formatDateTimeLocal(weekAgo);
}

async function queryExplorerData() {
    const startInput = document.getElementById('explorer-start').value;
    const endInput = document.getElementById('explorer-end').value;
    const limit = document.getElementById('explorer-limit').value;

    if (!startInput || !endInput) {
        showStatus('explorer-status', 'Please select both start and end dates', 'error');
        return;
    }

    const queryBtn = document.getElementById('query-data-btn');
    queryBtn.disabled = true;
    queryBtn.textContent = 'Querying...';

    try {
        const start = new Date(startInput).toISOString();
        const end = new Date(endInput).toISOString();

        const response = await fetch(
            `/api/weather/readings?start=${start}&end=${end}&limit=${limit}`
        );

        if (!response.ok) {
            throw new Error('Failed to query data');
        }

        const data = await response.json();
        explorerData = { start, end, limit, readings: data };

        displayExplorerResults(data);
        showStatus('explorer-status', `Found ${data.length} readings`, 'success');

        // Enable action buttons
        document.getElementById('export-csv-btn').disabled = false;
        document.getElementById('use-for-solar-btn').disabled = false;
        document.getElementById('use-for-wind-btn').disabled = false;

    } catch (error) {
        showStatus('explorer-status', `Query failed: ${error.message}`, 'error');
        console.error('Explorer query error:', error);
    } finally {
        queryBtn.disabled = false;
        queryBtn.textContent = 'Query Data';
    }
}

function displayExplorerResults(readings) {
    const container = document.getElementById('explorer-results');
    const summary = document.getElementById('explorer-summary');
    const tableContainer = document.getElementById('explorer-table-container');

    if (!readings || readings.length === 0) {
        summary.innerHTML = '<p>No data found for the selected date range.</p>';
        tableContainer.innerHTML = '';
        container.classList.add('visible');
        return;
    }

    // Display summary
    const firstReading = new Date(readings[0].timestamp);
    const lastReading = new Date(readings[readings.length - 1].timestamp);

    summary.innerHTML = `
        <p><strong>Total Readings:</strong> ${readings.length}</p>
        <p><strong>Date Range:</strong> ${firstReading.toLocaleString('en-US', { timeZone: userTimezone })} to ${lastReading.toLocaleString('en-US', { timeZone: userTimezone })}</p>
    `;

    // Create table
    const table = document.createElement('table');

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = [
        'Timestamp',
        'Outdoor Temp (°F)',
        'Outdoor Humidity (%)',
        'Feels Like (°F)',
        'Dew Point (°F)',
        'Wind Speed (mph)',
        'Wind Gust (mph)',
        'Max Daily Gust (mph)',
        'Wind Direction (°)',
        'Hourly Rain (in/hr)',
        'Event Rain (in)',
        'Daily Rain (in)',
        'Weekly Rain (in)',
        'Monthly Rain (in)',
        'Yearly Rain (in)',
        'Total Rain (in)',
        'Relative Pressure (inHg)',
        'Absolute Pressure (inHg)',
        'UV Index',
        'Solar Radiation (W/m²)',
        'Indoor Temp (°F)',
        'Indoor Humidity (%)',
        'Indoor Feels Like (°F)',
        'Indoor Dew Point (°F)',
        'Sensor 1 Temp (°F)',
        'Sensor 1 Humidity (%)',
        'Sensor 1 Feels Like (°F)',
        'Sensor 1 Dew Point (°F)',
        'Outdoor Battery',
        'Sensor 1 Battery'
    ];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    readings.forEach(reading => {
        const row = document.createElement('tr');
        const cells = [
            new Date(reading.timestamp).toLocaleString('en-US', { timeZone: userTimezone }),
            reading.outdoor_temp_f?.toFixed(1) || '-',
            reading.humidity_pct || '-',
            reading.feels_like_f?.toFixed(1) || '-',
            reading.dew_point_f?.toFixed(1) || '-',
            reading.wind_speed_mph?.toFixed(1) || '-',
            reading.wind_gust_mph?.toFixed(1) || '-',
            reading.max_daily_gust_mph?.toFixed(1) || '-',
            reading.wind_direction_deg || '-',
            reading.rain_rate_in_hr?.toFixed(3) || '-',
            reading.event_rain_in?.toFixed(3) || '-',
            reading.daily_rain_in?.toFixed(3) || '-',
            reading.weekly_rain_in?.toFixed(3) || '-',
            reading.monthly_rain_in?.toFixed(3) || '-',
            reading.yearly_rain_in?.toFixed(3) || '-',
            reading.total_rain_in?.toFixed(3) || '-',
            reading.relative_pressure_inhg?.toFixed(2) || '-',
            reading.absolute_pressure_inhg?.toFixed(2) || '-',
            reading.uv_index?.toFixed(1) || '-',
            reading.solar_radiation_wm2?.toFixed(1) || '-',
            reading.indoor_temp_f?.toFixed(1) || '-',
            reading.indoor_humidity_pct || '-',
            reading.indoor_feels_like_f?.toFixed(1) || '-',
            reading.indoor_dew_point_f?.toFixed(1) || '-',
            reading.sensor1_temp_f?.toFixed(1) || '-',
            reading.sensor1_humidity_pct || '-',
            reading.sensor1_feels_like_f?.toFixed(1) || '-',
            reading.sensor1_dew_point_f?.toFixed(1) || '-',
            reading.outdoor_battery || '-',
            reading.sensor1_battery || '-'
        ];

        cells.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
    container.classList.add('visible');
}

function exportExplorerData() {
    if (!explorerData) {
        showStatus('explorer-status', 'No data to export', 'error');
        return;
    }

    const { start, end, limit } = explorerData;
    const exportUrl = `/api/weather/export?start=${start}&end=${end}&limit=${limit}`;

    // Trigger download
    window.location.href = exportUrl;
    showStatus('explorer-status', 'Downloading CSV...', 'info');
}

function useDataForAnalysis(type) {
    if (!explorerData) {
        showStatus('explorer-status', 'No data to use', 'error');
        return;
    }

    const { start, end } = explorerData;
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Switch to analysis tab
    const analysisLink = document.querySelector('[data-section="analysis"]');
    if (analysisLink) {
        analysisLink.click();
    }

    // Wait for section to load, then populate shared date range
    setTimeout(() => {
        document.getElementById('analysis-start').value = formatDateTimeLocal(startDate);
        document.getElementById('analysis-end').value = formatDateTimeLocal(endDate);

        showStatus('explorer-status', `Date range copied to energy analysis`, 'success');
    }, 100);
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Utility Functions
function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message ${type}`;
}

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

    // Today: show time only (timezone-aware comparison)
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: 'numeric',
        minute: '2-digit'
    });

    // Compare dates in user's configured timezone, not browser timezone
    const userDateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const isToday = userDateFormatter.format(date) === userDateFormatter.format(now);

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

// Update AWN-style outdoor card with temperature ranges
async function updateOutdoorRanges(currentTemp) {
    const rangesContainer = document.getElementById('outdoor-ranges');
    if (!rangesContainer) return;

    try {
        const now = new Date();

        // Define time periods
        const periods = [
            { label: 'today', days: 0 },
            { label: 'yesterday', days: 1 },
            { label: 'week', days: 7 },
            { label: 'month', days: 30 },
            { label: 'year', days: 365 }
        ];

        const rangeData = await Promise.all(periods.map(async period => {
            const endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);

            if (period.days > 0) {
                endDate.setDate(endDate.getDate() - period.days);
            }

            const startDate = new Date(endDate);
            startDate.setHours(0, 0, 0, 0);

            if (period.label === 'yesterday') {
                // Yesterday: full day from midnight to midnight
                endDate.setHours(23, 59, 59, 999);
            } else if (period.days > 1) {
                // For week/month/year: go back N days
                startDate.setDate(startDate.getDate() - period.days + 1);
            }

            const response = await fetch(
                `/api/weather/readings?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=10000`
            );

            if (!response.ok) return { label: period.label, min: null, max: null };

            const readings = await response.json();
            const temps = readings.map(r => r.outdoor_temp_f).filter(t => t !== null);

            return {
                label: period.label,
                min: temps.length > 0 ? Math.min(...temps) : null,
                max: temps.length > 0 ? Math.max(...temps) : null
            };
        }));

        // Calculate global min/max for scaling
        const allTemps = rangeData.flatMap(r => [r.min, r.max]).filter(t => t !== null);
        const globalMin = allTemps.length > 0 ? Math.min(...allTemps) : 0;
        const globalMax = allTemps.length > 0 ? Math.max(...allTemps) : 100;
        const globalRange = globalMax - globalMin || 1;

        // Render range rows
        rangesContainer.innerHTML = rangeData.map(range => {
            if (range.min === null || range.max === null) {
                return `
                    <div class="wx-range-row">
                        <span class="wx-range-label">${range.label}</span>
                        <div class="wx-range-bar">
                            <span class="wx-range-min">--</span>
                            <div class="wx-range-fill" style="left: 0%; width: 0%;"></div>
                            <span class="wx-range-max">--</span>
                        </div>
                    </div>
                `;
            }

            // Calculate percentage positions
            const leftPercent = ((range.min - globalMin) / globalRange) * 100;
            const widthPercent = ((range.max - range.min) / globalRange) * 100;

            return `
                <div class="wx-range-row">
                    <span class="wx-range-label">${range.label}</span>
                    <div class="wx-range-bar">
                        <span class="wx-range-min">${Math.round(range.min)}°</span>
                        <div class="wx-range-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
                        <span class="wx-range-max">${Math.round(range.max)}°</span>
                    </div>
                </div>
            `;
        }).join('');

        // Calculate "From Yesterday" change
        const yesterdayData = rangeData.find(r => r.label === 'yesterday');
        const fromYesterdayEl = document.getElementById('outdoor-from-yesterday');

        if (fromYesterdayEl && currentTemp !== null && yesterdayData && yesterdayData.max !== null) {
            const change = currentTemp - yesterdayData.max;
            const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
            const changeClass = change > 0 ? 'wx-change-positive' : change < 0 ? 'wx-change-negative' : '';

            fromYesterdayEl.textContent = `${arrow} ${Math.abs(change).toFixed(1)}°F`;
            fromYesterdayEl.className = `wx-metric-value wx-change ${changeClass}`;
        }

    } catch (error) {
        console.error('Failed to load outdoor temperature ranges:', error);
    }
}

// Generic range updater for all cards
async function updateCardRanges(containerId, dataField, currentValue, yesterdayField = null) {
    const rangesContainer = document.getElementById(containerId);
    if (!rangesContainer) return;

    try {
        const now = new Date();
        const periods = [
            { label: 'today', days: 0 },
            { label: 'yesterday', days: 1 },
            { label: 'week', days: 7 },
            { label: 'month', days: 30 },
            { label: 'year', days: 365 }
        ];

        const rangeData = await Promise.all(periods.map(async period => {
            const endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);

            if (period.days > 0) {
                endDate.setDate(endDate.getDate() - period.days);
            }

            const startDate = new Date(endDate);
            startDate.setHours(0, 0, 0, 0);

            if (period.label === 'yesterday') {
                endDate.setHours(23, 59, 59, 999);
            } else if (period.days > 1) {
                startDate.setDate(startDate.getDate() - period.days + 1);
            }

            const response = await fetch(
                `/api/weather/readings?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=10000`
            );

            if (!response.ok) return { label: period.label, min: null, max: null };

            const readings = await response.json();
            const values = readings.map(r => r[dataField]).filter(v => v !== null);

            return {
                label: period.label,
                min: values.length > 0 ? Math.min(...values) : null,
                max: values.length > 0 ? Math.max(...values) : null
            };
        }));

        const allValues = rangeData.flatMap(r => [r.min, r.max]).filter(v => v !== null);
        const globalMin = allValues.length > 0 ? Math.min(...allValues) : 0;
        const globalMax = allValues.length > 0 ? Math.max(...allValues) : 100;
        const globalRange = globalMax - globalMin || 1;

        rangesContainer.innerHTML = rangeData.map(range => {
            if (range.min === null || range.max === null) {
                return `
                    <div class="wx-range-row">
                        <span class="wx-range-label">${range.label}</span>
                        <div class="wx-range-bar">
                            <span class="wx-range-min">--</span>
                            <div class="wx-range-fill" style="left: 0%; width: 0%;"></div>
                            <span class="wx-range-max">--</span>
                        </div>
                    </div>
                `;
            }

            const leftPercent = ((range.min - globalMin) / globalRange) * 100;
            const widthPercent = ((range.max - range.min) / globalRange) * 100;
            const formatValue = (v) => dataField.includes('temp') ? Math.round(v) + '°' :
                                       dataField.includes('pressure') ? v.toFixed(2) :
                                       dataField.includes('rain') ? v.toFixed(2) :
                                       Math.round(v);

            return `
                <div class="wx-range-row">
                    <span class="wx-range-label">${range.label}</span>
                    <div class="wx-range-bar">
                        <span class="wx-range-min">${formatValue(range.min)}</span>
                        <div class="wx-range-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
                        <span class="wx-range-max">${formatValue(range.max)}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Update "From Yesterday" if element exists
        if (yesterdayField && currentValue !== null) {
            const yesterdayData = rangeData.find(r => r.label === 'yesterday');
            const fromYesterdayEl = document.getElementById(yesterdayField);

            if (fromYesterdayEl && yesterdayData && yesterdayData.max !== null) {
                const change = currentValue - yesterdayData.max;
                const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
                const changeClass = change > 0 ? 'wx-change-positive' : change < 0 ? 'wx-change-negative' : '';
                const formatChange = dataField.includes('temp') ? Math.abs(change).toFixed(1) + '°F' :
                                   dataField.includes('pressure') ? Math.abs(change).toFixed(2) + ' inHg' :
                                   Math.abs(change).toFixed(1);

                fromYesterdayEl.textContent = `${arrow} ${formatChange}`;
                fromYesterdayEl.className = `wx-metric-value wx-change ${changeClass}`;
            }
        }

    } catch (error) {
        console.error(`Failed to load ranges for ${containerId}:`, error);
    }
}

// Update all weather cards with latest data
function updateWeatherCards(data) {
    // Outdoor Card
    const outdoorTemp = document.getElementById('outdoor-temp-display');
    if (outdoorTemp) {
        outdoorTemp.textContent = data.outdoor_temp_f !== null ?
            Math.round(data.outdoor_temp_f) : '--';
    }


    const outdoorDew = document.getElementById('outdoor-dew');
    if (outdoorDew) {
        outdoorDew.textContent = data.dew_point_f !== null ?
            `${Math.round(data.dew_point_f)}°F` : '--°F';
    }

    const outdoorFeels = document.getElementById('outdoor-feels');
    if (outdoorFeels) {
        outdoorFeels.textContent = data.feels_like_f !== null ?
            `${Math.round(data.feels_like_f)}°F` : '--°F';
    }

    // Update AWN-style ranges asynchronously
    if (data.outdoor_temp_f !== null) {
        updateOutdoorRanges(data.outdoor_temp_f);
    }

    // Indoor Card
    const indoorTemp = document.getElementById('indoor-temp-display');
    if (indoorTemp) {
        indoorTemp.textContent = data.indoor_temp_f !== null ?
            Math.round(data.indoor_temp_f) : '--';
    }

    const indoorHumidityHero = document.getElementById('indoor-humidity-hero');
    if (indoorHumidityHero) {
        indoorHumidityHero.textContent = data.indoor_humidity_pct !== null ?
            data.indoor_humidity_pct : '--';
    }

    const indoorDew = document.getElementById('indoor-dew');
    if (indoorDew) {
        indoorDew.textContent = data.indoor_dew_point_f !== null ?
            `${Math.round(data.indoor_dew_point_f)}°F` : '--°F';
    }

    const indoorFeels = document.getElementById('indoor-feels');
    if (indoorFeels) {
        indoorFeels.textContent = data.indoor_feels_like_f !== null ?
            `${Math.round(data.indoor_feels_like_f)}°F` : '--°F';
    }

    // Update indoor ranges asynchronously
    if (data.indoor_temp_f !== null) {
        updateCardRanges('indoor-ranges', 'indoor_temp_f', data.indoor_temp_f, 'indoor-from-yesterday');
    }

    // Wind Card
    const windSpeedDisplay = document.getElementById('wind-speed-display');
    if (windSpeedDisplay) {
        windSpeedDisplay.textContent = data.wind_speed_mph !== null ?
            data.wind_speed_mph.toFixed(1) : '--';
    }

    const windDirection = document.getElementById('wind-direction');
    if (windDirection) {
        if (data.wind_direction_deg !== null) {
            const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                              'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
            const index = Math.round(data.wind_direction_deg / 22.5) % 16;
            windDirection.textContent = `${directions[index]} (${data.wind_direction_deg}°)`;
        } else {
            windDirection.textContent = '--';
        }
    }

    const windGust = document.getElementById('wind-gust-value');
    if (windGust) {
        windGust.textContent = data.wind_gust_mph !== null ?
            `${data.wind_gust_mph.toFixed(1)} mph` : '-- mph';
    }

    // Update wind circular gauge
    updateWindCircularGauge(data);

    // Rainfall Card
    const rainRate = document.getElementById('rain-rate');
    if (rainRate) {
        rainRate.textContent = data.rain_rate_in_hr !== null ?
            `${data.rain_rate_in_hr.toFixed(2)} in/hr` : '-- in/hr';
    }

    const rainToday = document.getElementById('rain-today');
    if (rainToday) {
        rainToday.textContent = data.daily_rain_in !== null ?
            `${data.daily_rain_in.toFixed(2)} in` : '-- in';
    }

    const rainEvent = document.getElementById('rain-event');
    if (rainEvent) {
        rainEvent.textContent = data.event_rain_in !== null ?
            `${data.event_rain_in.toFixed(2)} in` : '-- in';
    }

    const rainWeekly = document.getElementById('rain-weekly');
    if (rainWeekly) {
        rainWeekly.textContent = data.weekly_rain_in !== null ?
            `${data.weekly_rain_in.toFixed(2)} in` : '-- in';
    }

    const rainMonthly = document.getElementById('rain-monthly');
    if (rainMonthly) {
        rainMonthly.textContent = data.monthly_rain_in !== null ?
            `${data.monthly_rain_in.toFixed(2)} in` : '-- in';
    }

    // Update rainfall cylinders
    updateRainfallCylinders(data);

    // Pressure Card - update gauge
    updatePressureGauge(data);

    // Solar & UV Card
    const solarDisplay = document.getElementById('solar-display');
    if (solarDisplay) {
        const solarValue = data.solar_radiation_wm2 !== null ?
            data.solar_radiation_wm2.toFixed(1) : '0.0';
        solarDisplay.textContent = `${solarValue} W/m²`;
    }

    const uvDisplayFull = document.getElementById('uv-display-full');
    if (uvDisplayFull && data.uv_index !== null) {
        const uv = data.uv_index;
        let level = '';
        if (uv < 3) level = 'Low Risk';
        else if (uv < 6) level = 'Moderate Risk';
        else if (uv < 8) level = 'High Risk';
        else if (uv < 11) level = 'Very High Risk';
        else level = 'Extreme Risk';
        uvDisplayFull.textContent = `${uv.toFixed(1)} - ${level}`;
    } else if (uvDisplayFull) {
        uvDisplayFull.textContent = '0 - Low Risk';
    }
}

// Update rainfall cylinders with animated fill
function updateRainfallCylinders(data) {
    const maxRain = Math.max(
        data.daily_rain_in || 0,
        data.weekly_rain_in || 0,
        data.monthly_rain_in || 0,
        0.1 // Minimum scale
    );

    const todayFill = document.getElementById('rain-today-fill');
    const weeklyFill = document.getElementById('rain-weekly-fill');
    const monthlyFill = document.getElementById('rain-monthly-fill');

    if (todayFill && data.daily_rain_in !== null) {
        const percent = (data.daily_rain_in / maxRain) * 100;
        todayFill.style.height = `${percent}%`;
    }

    if (weeklyFill && data.weekly_rain_in !== null) {
        const percent = (data.weekly_rain_in / maxRain) * 100;
        weeklyFill.style.height = `${percent}%`;
    }

    if (monthlyFill && data.monthly_rain_in !== null) {
        const percent = (data.monthly_rain_in / maxRain) * 100;
        monthlyFill.style.height = `${percent}%`;
    }
}

// Update pressure gauge
function updatePressureGauge(data) {
    const canvas = document.getElementById('pressure-gauge');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.offsetWidth || 250;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.38;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pressure range: 29.0 - 31.0 inHg (AWN standard range)
    const minPressure = 29.0;
    const maxPressure = 31.0;
    const currentPressure = data.relative_pressure_inhg || 30.0;

    // Draw outer circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.stroke();

    // Draw pressure arc - color based on pressure level
    const pressureAngle = ((currentPressure - minPressure) / (maxPressure - minPressure)) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + pressureAngle);
    ctx.lineWidth = 14;

    // Color based on pressure
    if (currentPressure < 29.8) {
        ctx.strokeStyle = '#ef4444'; // Low pressure - red
    } else if (currentPressure > 30.2) {
        ctx.strokeStyle = '#3b82f6'; // High pressure - blue
    } else {
        ctx.strokeStyle = '#10b981'; // Normal - green
    }
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw tick marks with labels (AWN style)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw ticks at 0.5 inHg intervals
    const pressureRange = maxPressure - minPressure; // 2.0 inHg
    const numTicks = 5; // 29.0, 29.5, 30.0, 30.5, 31.0

    for (let i = 0; i <= numTicks; i++) {
        const pressure = minPressure + (i / numTicks) * pressureRange;
        const angle = (i / numTicks) * 2 * Math.PI - Math.PI / 2;

        // Tick mark
        const x1 = centerX + Math.cos(angle) * (radius - 18);
        const y1 = centerY + Math.sin(angle) * (radius - 18);
        const x2 = centerX + Math.cos(angle) * (radius - 8);
        const y2 = centerY + Math.sin(angle) * (radius - 8);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Label inside circle
        const labelX = centerX + Math.cos(angle) * (radius - 28);
        const labelY = centerY + Math.sin(angle) * (radius - 28);
        ctx.fillText(pressure.toFixed(1), labelX, labelY);
    }

    // Draw center pressure value
    ctx.fillStyle = 'var(--text-primary)';
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentPressure.toFixed(2), centerX, centerY - 20);

    // Draw "inHg" label
    ctx.font = '16px system-ui';
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.fillText('inHg', centerX, centerY + 10);
}

// Wind circular gauge (AWN style)
function updateWindCircularGauge(data) {
    const canvas = document.getElementById('wind-circular-gauge');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.offsetWidth || 250;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.38;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentSpeed = data.wind_speed_mph || 0;
    const maxDailyGust = data.max_daily_gust_mph || 0;
    const maxSpeed = 30; // Max speed for gauge scale

    // Draw outer circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.stroke();

    // Draw speed arc (yellow/gold like AWN)
    const speedAngle = (currentSpeed / maxSpeed) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + speedAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#eab308'; // Yellow/gold
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw tick marks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 12; i++) {
        const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
        const x1 = centerX + Math.cos(angle) * (radius - 18);
        const y1 = centerY + Math.sin(angle) * (radius - 18);
        const x2 = centerX + Math.cos(angle) * (radius - 8);
        const y2 = centerY + Math.sin(angle) * (radius - 8);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Draw center speed value
    ctx.fillStyle = 'var(--text-primary)';
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentSpeed.toFixed(1), centerX, centerY - 20);

    // Draw "mph" label
    ctx.font = '16px system-ui';
    ctx.fillText('mph', centerX, centerY + 10);

    // Draw "Today's Peak" label and value
    ctx.font = '14px system-ui';
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.fillText("Today's Peak:", centerX, centerY + 35);

    ctx.font = 'bold 20px system-ui';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(maxDailyGust.toFixed(1), centerX, centerY + 58);
}

// Wind needle gauge visualization
function updateWindNeedleGauge(data) {
    const canvas = document.getElementById('wind-needle-gauge');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.offsetWidth || 200;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.4;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw direction markers (N, E, S, W)
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const directions = ['N', 'E', 'S', 'W'];
    const angles = [0, 90, 180, 270];
    directions.forEach((dir, i) => {
        const angle = (angles[i] - 90) * Math.PI / 180;
        const x = centerX + Math.cos(angle) * (radius + 20);
        const y = centerY + Math.sin(angle) * (radius + 20);
        ctx.fillText(dir, x, y);
    });

    // Draw speed arcs (0-10, 10-20, 20+)
    const speedRanges = [
        { max: 10, color: '#10b981', alpha: 0.2 },
        { max: 20, color: '#f59e0b', alpha: 0.2 },
        { max: Infinity, color: '#ef4444', alpha: 0.2 }
    ];

    if (data.wind_speed_mph !== null) {
        const speed = data.wind_speed_mph;
        speedRanges.forEach((range, i) => {
            if (speed > (i * 10)) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * (0.3 + i * 0.2), 0, 2 * Math.PI);
                ctx.fillStyle = range.color.replace(')', `, ${range.alpha})`).replace('rgb', 'rgba');
                ctx.fill();
            }
        });

        // Draw needle if we have direction
        if (data.wind_direction_deg !== null) {
            const angle = (data.wind_direction_deg - 90) * Math.PI / 180;

            // Needle
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * radius * 0.9,
                centerY + Math.sin(angle) * radius * 0.9
            );
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(
                centerX + Math.cos(angle) * radius * 0.9,
                centerY + Math.sin(angle) * radius * 0.9
            );
            ctx.lineTo(
                centerX + Math.cos(angle - 0.3) * radius * 0.7,
                centerY + Math.sin(angle - 0.3) * radius * 0.7
            );
            ctx.lineTo(
                centerX + Math.cos(angle + 0.3) * radius * 0.7,
                centerY + Math.sin(angle + 0.3) * radius * 0.7
            );
            ctx.closePath();
            ctx.fillStyle = '#1f2937';
            ctx.fill();
        }

        // Center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#1f2937';
        ctx.fill();

        // Speed text
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(speed.toFixed(1), centerX, centerY + 30);
        ctx.font = '12px system-ui';
        ctx.fillText('mph', centerX, centerY + 45);
    }
}

// Store wind rose data globally
let windRoseData = [];

// Update wind rose with historical data
async function updateWindRose() {
    const canvas = document.getElementById('wind-rose');
    if (!canvas) return;

    // Fetch last 24 hours of data for wind rose
    try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000));

        const response = await fetch(
            `/api/weather/readings?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=1000`
        );

        if (!response.ok) return;

        const readings = await response.json();

        // Group by direction (16 sectors) and speed ranges
        const sectors = 16;
        const speedRanges = [
            { min: 0, max: 5, color: '#10b981' },
            { min: 5, max: 10, color: '#3b82f6' },
            { min: 10, max: 15, color: '#f59e0b' },
            { min: 15, max: Infinity, color: '#ef4444' }
        ];

        const windData = Array.from({ length: sectors }, () =>
            speedRanges.map(() => 0)
        );

        readings.forEach(r => {
            if (r.wind_direction_deg !== null && r.wind_speed_mph !== null) {
                const sector = Math.floor(((r.wind_direction_deg + 11.25) % 360) / 22.5);
                const speedRangeIdx = speedRanges.findIndex(range =>
                    r.wind_speed_mph >= range.min && r.wind_speed_mph < range.max
                );
                if (speedRangeIdx >= 0) {
                    windData[sector][speedRangeIdx]++;
                }
            }
        });

        // Render wind rose
        const ctx = canvas.getContext('2d');
        const size = canvas.offsetWidth || 180;
        canvas.width = size;
        canvas.height = size;

        const centerX = size / 2;
        const centerY = size / 2;
        const maxRadius = size * 0.4;

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Find max count for scaling
        const maxCount = Math.max(...windData.flat());

        // Draw concentric circles
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, maxRadius * i / 3, 0, 2 * Math.PI);
            ctx.stroke();
        }

        // Draw direction lines
        for (let i = 0; i < 4; i++) {
            const angle = i * Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle - Math.PI/2) * maxRadius,
                centerY + Math.sin(angle - Math.PI/2) * maxRadius
            );
            ctx.stroke();
        }

        // Draw direction labels
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labels = ['N', 'E', 'S', 'W'];
        labels.forEach((label, i) => {
            const angle = i * Math.PI / 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (maxRadius + 15);
            const y = centerY + Math.sin(angle) * (maxRadius + 15);
            ctx.fillText(label, x, y);
        });

        // Draw wind rose petals
        windData.forEach((sectorData, sectorIdx) => {
            const angle = sectorIdx * 2 * Math.PI / sectors - Math.PI / 2;
            const nextAngle = (sectorIdx + 1) * 2 * Math.PI / sectors - Math.PI / 2;

            let cumulativeRadius = 0;
            sectorData.forEach((count, speedIdx) => {
                if (count > 0) {
                    const radius = (count / maxCount) * maxRadius;
                    const outerRadius = cumulativeRadius + radius;

                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.arc(centerX, centerY, outerRadius, angle, nextAngle);
                    ctx.lineTo(centerX, centerY);
                    ctx.fillStyle = speedRanges[speedIdx].color;
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    cumulativeRadius = outerRadius;
                }
            });
        });

    } catch (error) {
        console.error('Failed to render wind rose:', error);
    }
}

// Update sparklines
async function updateSparklines() {
    try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (6 * 60 * 60 * 1000)); // Last 6 hours

        const response = await fetch(
            `/api/weather/readings?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=100`
        );

        if (!response.ok) return;

        const readings = await response.json();

        // Create labels from timestamps
        const labels = readings.map(r => {
            const date = new Date(r.timestamp);
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: userTimezone
            });
        });

        // Solar & UV dual chart (reversed: current on right, past on left)
        createCardChart('card-solar', 'solar-uv-sparkline', {
            labels: labels.slice().reverse(),
            datasets: [
                {
                    label: 'Solar Radiation',
                    data: readings.map(r => r.solar_radiation_wm2).reverse(),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)'
                },
                {
                    label: 'UV Index',
                    data: readings.map(r => r.uv_index).reverse(),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)'
                }
            ],
            showXAxis: true
        });

    } catch (error) {
        console.error('Failed to render card charts:', error);
    }
}

function drawSparkline(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth || canvas.width;
    const height = canvas.height;

    canvas.width = width;

    // Filter out null values
    const validData = data.filter(d => d !== null);
    if (validData.length === 0) return;

    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const range = max - min || 1;

    ctx.clearRect(0, 0, width, height);

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    data.forEach((value, i) => {
        if (value === null) return;

        const x = (i / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 10) - 5;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Fill area under line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
    ctx.fill();
}

// Draw dual-line sparkline (for solar & UV)
function drawDualSparkline(canvasId, data1, data2, color1, color2) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data1 || !data2 || data1.length === 0 || data2.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth || canvas.width;
    const height = canvas.height;

    canvas.width = width;

    // Filter out null values for each dataset
    const validData1 = data1.filter(d => d !== null);
    const validData2 = data2.filter(d => d !== null);

    if (validData1.length === 0 && validData2.length === 0) return;

    // Normalize each dataset to 0-1 range independently
    const min1 = validData1.length > 0 ? Math.min(...validData1) : 0;
    const max1 = validData1.length > 0 ? Math.max(...validData1) : 1;
    const range1 = max1 - min1 || 1;

    const min2 = validData2.length > 0 ? Math.min(...validData2) : 0;
    const max2 = validData2.length > 0 ? Math.max(...validData2) : 1;
    const range2 = max2 - min2 || 1;

    ctx.clearRect(0, 0, width, height);

    // Helper to draw one dataset
    const drawDataset = (data, min, range, color, fillAlpha = 0.1) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        let firstPoint = true;
        data.forEach((value, i) => {
            if (value === null) return;

            const x = (i / (data.length - 1)) * width;
            const y = height - ((value - min) / range) * (height - 10) - 5;

            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Fill area
        if (!firstPoint) {
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.fillStyle = color.replace(')', `, ${fillAlpha})`).replace('rgb', 'rgba');
            ctx.fill();
        }
    };

    // Draw both datasets
    drawDataset(data1, min1, range1, color1, 0.15);
    drawDataset(data2, min2, range2, color2, 0.15);
}

// Update rainfall bars
async function updateRainfallBars() {
    const canvas = document.getElementById('rainfall-bars');
    if (!canvas) return;

    try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000));

        const response = await fetch(
            `/api/weather/readings?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=1000`
        );

        if (!response.ok) return;

        const readings = await response.json();

        // Group by hour
        const hourlyData = Array(24).fill(0);
        readings.forEach(r => {
            if (r.rain_rate_in_hr !== null) {
                const hour = new Date(r.timestamp).getHours();
                hourlyData[hour] = Math.max(hourlyData[hour], r.rain_rate_in_hr);
            }
        });

        // Render bar chart
        const ctx = canvas.getContext('2d');
        const width = canvas.offsetWidth || canvas.width;
        const height = canvas.height;

        canvas.width = width;

        ctx.clearRect(0, 0, width, height);

        const maxRain = Math.max(...hourlyData, 0.01); // Avoid division by zero
        const barWidth = width / 24;

        hourlyData.forEach((rain, hour) => {
            const barHeight = (rain / maxRain) * (height - 20);
            const x = hour * barWidth;
            const y = height - barHeight;

            ctx.fillStyle = rain > 0 ? '#0ea5e9' : '#e5e7eb';
            ctx.fillRect(x, y, barWidth - 2, barHeight);
        });

    } catch (error) {
        console.error('Failed to render rainfall bars:', error);
    }
}
