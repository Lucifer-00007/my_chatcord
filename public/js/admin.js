document.addEventListener('DOMContentLoaded', () => {
    const menuItems = document.querySelectorAll('.admin-menu-item');
    const sections = document.querySelectorAll('.admin-section');

    // Handle menu item clicks
    menuItems.forEach(item => {
        item.addEventListener('click', async () => {
            // Remove active class from all menu items
            menuItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Load section content
            const sectionName = item.dataset.section;
            await loadSection(sectionName);
        });
    });

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AuthGuard.logout();
        });
    }

    // Load dashboard by default
    const dashboardItem = document.querySelector('.admin-menu-item[data-section="dashboard"]');
    if (dashboardItem) {
        dashboardItem.classList.add('active');
        loadSection('dashboard');
    }
});

async function loadSection(sectionName) {
    try {
        const sectionContainer = document.getElementById(sectionName);
        if (!sectionContainer) {
            console.error(`Section container not found: ${sectionName}`);
            return;
        }

        // Include auth token in the request with correct path
        const token = AuthGuard.getAuthToken();
        const response = await fetch(`/admin/${sectionName}.html`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                AuthGuard.logout(); // Redirect to login if unauthorized
                return;
            }
            throw new Error(`Failed to load section: ${response.statusText}`);
        }
        
        const content = await response.text();
        sectionContainer.innerHTML = content;
        
        // Initialize section based on type
        switch (sectionName) {
            case 'dashboard':
                await initDashboard();
                break;
            case 'text-to-image':
                await initImageApiSection();
                break;
            case 'text-to-voice':
                await initializeVoiceForm();
                break;
            case 'ai-chat':
                await initAiApiSection();
                break;
            case 'room-management':
                await initRoomManagement();
                break;
            case 'user-management':
                await initUserManagement();
                break;
            case 'system-logs':
                await initSystemLogs();
                break;
            case 'system-settings':
                await initSystemSettings();
                break;
        }
        
    } catch (err) {
        console.error(`Error loading section ${sectionName}:`, err);
        showNotification(`Failed to load ${sectionName} section`, 'error');
    }
}

function showSection(sectionName) {
    
    // Hide all sections
    document.querySelectorAll('.section-container').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionName);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }

    // Update menu active state
    document.querySelectorAll('.admin-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });
}

// Initialize admin panel
async function initAdminPanel() {
    
    const currentSection = localStorage.getItem('adminSection') || 'dashboard';
    
    // Add menu click handlers
    document.querySelectorAll('.admin-menu-item').forEach(item => {
        item.addEventListener('click', async () => {
            const sectionName = item.dataset.section;
            await loadSection(sectionName);
            showSection(sectionName);
            localStorage.setItem('adminSection', sectionName);
        });
    });

    // Load and show initial section
    await loadSection(currentSection);
    showSection(currentSection);
}

async function loadDashboardStats() {
    try {
        const data = await window.adminUtils.makeApiRequest('/api/admin/stats');
        updateDashboard(data);
    } catch (err) {
        console.error('Error loading dashboard stats:', err);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

function updateDashboard(data) {
    const statsGrid = document.querySelector('.stats-grid');
    if (!statsGrid) return;

    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-title">Total Users</div>
            <div class="stat-value">${data.users}</div>
            <div class="stat-icon"><i class="fas fa-users"></i></div>
        </div>
        <div class="stat-card">
            <div class="stat-title">Active Channels</div>
            <div class="stat-value">${data.channels}</div>
            <div class="stat-icon"><i class="fas fa-comments"></i></div>
        </div>
        <div class="stat-card">
            <div class="stat-title">Total Messages</div>
            <div class="stat-value">${data.messages}</div>
            <div class="stat-icon"><i class="fas fa-envelope"></i></div>
        </div>
        <div class="stat-card">
            <div class="stat-title">Active APIs</div>
            <div class="stat-value">${data.apis}</div>
            <div class="stat-icon"><i class="fas fa-plug"></i></div>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }, 100);
}

// Make showNotification globally available
window.showNotification = showNotification;

// Initialize all admin sections
async function initAdminPanel() {
    const currentSection = localStorage.getItem('adminSection') || 'dashboard';
    
    // Initialize all section handlers
    const sections = {
        dashboard: initDashboard,
        'ai-chat': initAiApiSection,
        'text-to-image': () => {
            initImageApiSection();
            // Register all Image API related functions
            window.adminCallbacks = {
                ...window.adminCallbacks,
                handleImageFormSubmit,
                editSize,
                editStyle,
                removeGlobalOption,
                saveGlobalSettings,
                addGlobalOption,
                testImageApi,
                editImageApi,
                deleteImageApi,
                toggleImageApi,
                loadImageApiList
            };
        },
        'text-to-voice': initializeVoiceForm,
        'room-management': initRoomManagement,
        'user-management': initUserManagement,
        'system-logs': initSystemLogs,
        'system-settings': initSystemSettings
    };

    // Load and show current section
    await loadSection(currentSection);
    showSection(currentSection);

    // Add menu click handlers
    document.querySelectorAll('.admin-menu-item').forEach(item => {
        item.addEventListener('click', async () => {
            const sectionName = item.dataset.section;
            await loadSection(sectionName);
            showSection(sectionName);
            localStorage.setItem('adminSection', sectionName);
        });
    });
}

// Add showSection function
function showSection(sectionName) {
    
    // Hide all sections
    document.querySelectorAll('.section-container').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionName);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }

    // Update menu active state
    document.querySelectorAll('.admin-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });
}

// Add this to window object
window.initAdminPanel = initAdminPanel;
window.loadSection = loadSection;
window.showSection = showSection;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', initAdminPanel);

// Export necessary functions
window.showNotification = showNotification;

// Add initialization function for system settings
async function initSystemSettings() {
    const script = document.createElement('script');
    script.src = '/js/admin/system-settings.js';
    document.head.appendChild(script);
    
    // Wait for the script to load
    await new Promise((resolve) => {
        script.onload = resolve;
    });
}

