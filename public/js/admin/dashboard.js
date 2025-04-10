async function initDashboard() {
    console.log('Initializing dashboard...');
    await loadStats();
    setInterval(loadStats, 30000);
}

async function loadStats() {
    try {
        console.log('Loading dashboard stats...');
        const stats = await window.adminUtils.makeApiRequest('/api/admin/stats');
        
        console.log('Received stats:', stats);
        
        // Match the property names from the API response
        const statMappings = {
            'Total Users': stats?.users || 0,
            'Active Channels': stats?.channels || 0,
            'Total Messages': stats?.messages || 0,
            'Active APIs': stats?.apis || 0
        };

        // Update each stat card
        for (const [title, value] of Object.entries(statMappings)) {
            updateStatCard(title, value);
        }

    } catch (err) {
        console.error('Error loading stats:', err);
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

window.initDashboard = initDashboard;
