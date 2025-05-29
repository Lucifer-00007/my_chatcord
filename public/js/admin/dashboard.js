async function initDashboard() {
    // Wait for adminUtils to be initialized
    await waitForAdminUtils();
    
    await loadStats();
    // Update stats every 5 minutes
    setInterval(loadStats, 5 * 60 * 1000);
}

// Helper function to wait for adminUtils initialization
function waitForAdminUtils() {
    return new Promise(resolve => {
        if (window.adminUtils) {
            resolve();
            return;
        }

        const checkInterval = setInterval(() => {
            if (window.adminUtils) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}

let retryAttempt = 0;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 5000; // 5 seconds

async function loadStats() {
    try {
        const stats = await window.adminUtils.makeApiRequest('/api/admin/stats');
        
        // Reset retry attempt on success
        retryAttempt = 0;
        
        // Match the property names from the API response with HTML titles
        const statMappings = {
            'Total Users': stats?.users || 0,
            'Active Rooms': stats?.rooms || 0,
            'Total Messages': stats?.messages || 0,
            'Active APIs': stats?.apis || 0
        };

        // Update each stat card
        for (const [title, value] of Object.entries(statMappings)) {
            updateStatCard(title, value);
        }

    } catch (err) {
        // Handle rate limiting with exponential backoff
        if (err.status === 429 && retryAttempt < MAX_RETRY_ATTEMPTS) {
            retryAttempt++;
            const retryDelay = BASE_RETRY_DELAY * Math.pow(2, retryAttempt - 1);
            console.log(`Rate limited. Retrying in ${retryDelay/1000} seconds...`);
            
            setTimeout(() => {
                loadStats();
            }, retryDelay);
        } else {
            // Show error in UI only if we've exhausted retries or it's not a rate limit error
            const errorMessage = err.status === 429 
                ? 'Too many requests. Please try again later.' 
                : 'Failed to load dashboard statistics';
            showNotification(errorMessage, 'error');
        }
    }
}

function updateStatCard(title, value) {
    try {
        // Find the stat card by title
        const cards = document.querySelectorAll('.stat-card');
        const card = Array.from(cards).find(card => 
            card.querySelector('.stat-title')?.textContent.trim() === title
        );
        
        if (!card) {
            console.warn(`Stat card not found for title: ${title}`);
            return;
        }

        const valueElement = card.querySelector('.stat-value');
        if (valueElement) {
            valueElement.textContent = Number(value).toLocaleString();
        } else {
            console.warn(`Value element not found in card: ${title}`);
        }
    } catch (err) {
        console.error(`Error updating stat card ${title}:`, err);
    }
}

// --- Chart.js and Leaflet imports (via CDN fallback if not bundled) ---
if (typeof Chart === 'undefined') {
    const chartScript = document.createElement('script');
    chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(chartScript);
}
if (typeof L === 'undefined') {
    const leafletLink = document.createElement('link');
    leafletLink.rel = 'stylesheet';
    leafletLink.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
    document.head.appendChild(leafletLink);
    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet/dist/leaflet.js';
    document.head.appendChild(leafletScript);
}

// --- Dashboard visualizations ---
window.addEventListener('DOMContentLoaded', async () => {
    await initDashboard();
    await renderUserStatusPieChart();
    await renderActiveApisPieChart();
    await renderMessagesBarChart();
    await renderActivityHeatmap();
    await renderMessageLengthHistogram();
});

// --- Chart.js color palette ---
const chartColors = [
    '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', '#00BCD4', '#FF9800', '#607D8B', '#E91E63', '#8BC34A'
];

async function renderUserStatusPieChart() {
    try {
        const data = await window.adminUtils.makeApiRequest('/api/admin/stats/user-status-pie');
        const ctx = document.getElementById('userStatusPieChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: chartColors.slice(0, data.labels.length),
                    borderWidth: 2,
                    borderColor: '#fff',
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: '#333', font: { size: 14 } }
                    },
                    tooltip: { enabled: true }
                },
                cutout: '65%'
            }
        });
    } catch (err) { console.error('Pie chart error', err); }
}

async function renderActiveApisPieChart() {
    try {
        const data = await window.adminUtils.makeApiRequest('/api/admin/stats/active-apis-pie');
        const ctx = document.getElementById('activeApisPieChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: chartColors.slice(0, data.labels.length),
                    borderWidth: 2,
                    borderColor: '#fff',
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: '#333', font: { size: 14 } }
                    },
                    tooltip: { enabled: true }
                },
                cutout: '65%'
            }
        });
    } catch (err) { console.error('Active APIs pie chart error', err); }
}

async function renderMessagesBarChart() {
    try {
        const data = await window.adminUtils.makeApiRequest('/api/admin/stats/messages-per-channel-bar');
        const ctx = document.getElementById('messagesBarChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Messages',
                    data: data.values,
                    backgroundColor: chartColors[1],
                    borderRadius: 6,
                    maxBarThickness: 32
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: {
                        ticks: { color: '#333', font: { size: 13 } },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#333', font: { size: 13 } },
                        grid: { color: '#eee' }
                    }
                }
            }
        });
    } catch (err) { console.error('Bar chart error', err); }
}

async function renderActivityHeatmap() {
    try {
        const data = await window.adminUtils.makeApiRequest('/api/admin/stats/activity-heatmap');
        const container = document.getElementById('activityHeatmap');
        let html = '<table class="heatmap-table"><tr><th></th>';
        html += data.hours.map(h=>`<th>${h}</th>`).join('') + '</tr>';
        data.days.forEach((day, i) => {
            html += `<tr><td>${day}</td>`;
            html += data.data[i].map(val => {
                const intensity = Math.min(1, val/10);
                const bg = `rgba(33,150,243,${intensity})`;
                const color = intensity > 0.5 ? '#fff' : '#222';
                return `<td style="background:${bg};color:${color};font-weight:${val>0?600:400}">${val||''}</td>`;
            }).join('');
            html += '</tr>';
        });
        html += '</table>';
        container.innerHTML = html;
    } catch (err) { console.error('Heatmap error', err); }
}

async function renderMessageLengthHistogram() {
    try {
        const data = await window.adminUtils.makeApiRequest('/api/admin/stats/message-length-histogram');
        const ctx = document.getElementById('messageLengthHistogram').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.bins,
                datasets: [{
                    label: 'Messages',
                    data: data.counts,
                    backgroundColor: chartColors[2],
                    borderRadius: 6,
                    maxBarThickness: 32
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: {
                        ticks: { color: '#333', font: { size: 13 } },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#333', font: { size: 13 } },
                        grid: { color: '#eee' }
                    }
                }
            }
        });
    } catch (err) { console.error('Histogram error', err); }
}

window.initDashboard = initDashboard;
