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
let charts = {
    temperature: null,
    humidity: null,
    wind: null,
    solar: null
};

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

        // Temperature Chart
        createOrUpdateChart('temperature', 'temperature-chart', {
            label: 'Temperature (°F)',
            data: readings.map(r => r.outdoor_temp_f),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            yAxisLabel: 'Temperature (°F)'
        }, labels);

        // Humidity Chart
        createOrUpdateChart('humidity', 'humidity-chart', {
            label: 'Humidity (%)',
            data: readings.map(r => r.humidity_pct),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            yAxisLabel: 'Humidity (%)',
            yMin: 0,
            yMax: 100
        }, labels);

        // Wind Speed Chart
        createOrUpdateChart('wind', 'wind-chart', {
            label: 'Wind Speed (mph)',
            data: readings.map(r => r.wind_speed_mph),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            yAxisLabel: 'Wind Speed (mph)',
            yMin: 0
        }, labels);

        // Solar Radiation Chart
        createOrUpdateChart('solar', 'solar-chart', {
            label: 'Solar Radiation (W/m²)',
            data: readings.map(r => r.solar_radiation_wm2),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            yAxisLabel: 'Solar Radiation (W/m²)',
            yMin: 0
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
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const analysisForms = document.querySelectorAll('.analysis-form');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            analysisForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${targetTab}-analysis`) {
                    form.classList.add('active');
                }
            });
        });
    });

    // Solar analysis
    document.getElementById('run-solar-btn').addEventListener('click', runSolarAnalysis);

    // Wind analysis
    document.getElementById('run-wind-btn').addEventListener('click', runWindAnalysis);
}

async function runSolarAnalysis() {
    const startInput = document.getElementById('solar-start').value;
    const endInput = document.getElementById('solar-end').value;
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
            <li><strong>Total Energy:</strong> ${results.total_energy_kwh.toFixed(2)} kWh</li>
            <li><strong>Average Power:</strong> ${results.average_power_w.toFixed(2)} W</li>
            <li><strong>Peak Power:</strong> ${results.peak_power_w.toFixed(2)} W</li>
            <li><strong>Capacity Factor:</strong> ${results.capacity_factor_percent.toFixed(1)}%</li>
            <li><strong>Period:</strong> ${formatDateTime(results.period_start)} to ${formatDateTime(results.period_end)}</li>
            <li><strong>Readings Analyzed:</strong> ${results.readings_count}</li>
        </ul>
    `;

    container.classList.add('visible');
}

async function runWindAnalysis() {
    const startInput = document.getElementById('wind-start').value;
    const endInput = document.getElementById('wind-end').value;
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
            <li><strong>Total Energy:</strong> ${results.total_energy_kwh.toFixed(2)} kWh</li>
            <li><strong>Average Power:</strong> ${results.average_power_w.toFixed(2)} W</li>
            <li><strong>Peak Power:</strong> ${results.peak_power_w.toFixed(2)} W</li>
            <li><strong>Capacity Factor:</strong> ${results.capacity_factor_percent.toFixed(1)}%</li>
            <li><strong>Average Wind Speed:</strong> ${results.average_wind_speed_mph.toFixed(1)} mph</li>
            <li><strong>Period:</strong> ${formatDateTime(results.period_start)} to ${formatDateTime(results.period_end)}</li>
            <li><strong>Readings Analyzed:</strong> ${results.readings_count}</li>
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
        'Temp (°F)',
        'Humidity (%)',
        'Wind (mph)',
        'Gust (mph)',
        'Direction (°)',
        'Rain (in)',
        'Pressure (inHg)',
        'UV Index',
        'Solar (W/m²)'
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
            reading.wind_speed_mph?.toFixed(1) || '-',
            reading.wind_gust_mph?.toFixed(1) || '-',
            reading.wind_direction_deg || '-',
            reading.daily_rain_in?.toFixed(3) || '-',
            reading.relative_pressure_inhg?.toFixed(2) || '-',
            reading.uv_index?.toFixed(1) || '-',
            reading.solar_radiation_wm2?.toFixed(1) || '-'
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

    // Wait for section to load, then populate form
    setTimeout(() => {
        if (type === 'solar') {
            document.getElementById('solar-start').value = formatDateTimeLocal(startDate);
            document.getElementById('solar-end').value = formatDateTimeLocal(endDate);

            // Switch to solar tab
            const solarTab = document.querySelector('[data-tab="solar"]');
            if (solarTab) solarTab.click();
        } else if (type === 'wind') {
            document.getElementById('wind-start').value = formatDateTimeLocal(startDate);
            document.getElementById('wind-end').value = formatDateTimeLocal(endDate);

            // Switch to wind tab
            const windTab = document.querySelector('[data-tab="wind"]');
            if (windTab) windTab.click();
        }

        showStatus('explorer-status', `Date range copied to ${type} analysis`, 'success');
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
