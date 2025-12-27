// Weather Station Dashboard Application

// Global state
let temperatureChart = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
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

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = item.getAttribute('data-section');

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
    await Promise.all([
        loadLatestReading(),
        loadDatabaseStats(),
        loadAllCharts()
    ]);
}

// Auto-refresh dashboard every minute
let dashboardRefreshInterval = null;

function startDashboardAutoRefresh() {
    // Clear any existing interval
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
    }

    // Refresh every 60 seconds
    dashboardRefreshInterval = setInterval(() => {
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection && dashboardSection.classList.contains('active')) {
            console.log('Auto-refreshing dashboard...');
            loadDashboard();
        }
    }, 60000); // 60 seconds
}

function stopDashboardAutoRefresh() {
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
    }
}

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
    } catch (error) {
        container.innerHTML = `<p class="error">No readings available</p>`;
        console.error('Failed to load latest reading:', error);
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

        container.innerHTML = `
            <p><strong>Total Readings:</strong> ${data.total_readings.toLocaleString()}</p>
            <p><strong>First Reading:</strong> ${data.first_reading ? formatDateTime(data.first_reading) : 'N/A'}</p>
            <p><strong>Last Reading:</strong> ${data.last_reading ? formatDateTime(data.last_reading) : 'N/A'}</p>
            <p><strong>Date Range:</strong> ${data.coverage_days !== null && data.coverage_days !== undefined ? data.coverage_days.toFixed(1) + ' days' : 'N/A'}</p>
        `;
    } catch (error) {
        container.innerHTML = `<p class="error">Failed to load statistics</p>`;
        console.error('Failed to load database stats:', error);
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
                minute: '2-digit'
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

function createOrUpdateChart(chartKey, canvasId, config, labels) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Destroy existing chart if present
    if (charts[chartKey]) {
        charts[chartKey].destroy();
    }

    charts[chartKey] = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: config.label,
                data: config.data,
                borderColor: config.borderColor,
                backgroundColor: config.backgroundColor,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
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
                    display: false
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
            <li><strong>Duplicates:</strong> ${results.duplicates}</li>
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
        <p><strong>Date Range:</strong> ${firstReading.toLocaleString()} to ${lastReading.toLocaleString()}</p>
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
            new Date(reading.timestamp).toLocaleString(),
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

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}
