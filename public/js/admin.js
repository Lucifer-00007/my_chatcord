document.addEventListener('DOMContentLoaded', () => {
    const menuItems = document.querySelectorAll('.admin-menu-item');
    const sections = document.querySelectorAll('.admin-section');

    // Handle menu item clicks
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            
            // Update active states
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            // Show selected section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });
        });
    });

    // Load dashboard data
    loadDashboardStats();
    initAiApiSection();
});

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            }
        });
        const data = await res.json();
        updateDashboard(data);
    } catch (err) {
        console.error('Error loading dashboard stats:', err);
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

function initAiApiSection() {
    const apiForm = document.getElementById('api-form');
    const apiList = document.getElementById('api-list');
    const addApiBtn = document.getElementById('add-api-btn');
    const closeFormBtn = document.getElementById('close-form');

    // Show/Hide form handlers
    addApiBtn.addEventListener('click', () => {
        apiForm.style.display = 'block';
        addApiBtn.style.display = 'none';
    });

    closeFormBtn.addEventListener('click', () => {
        apiForm.style.display = 'none';
        addApiBtn.style.display = 'block';
        apiForm.reset();
    });

    // Load existing APIs
    loadApiList();

    // Form submission handling
    apiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const formData = {
            name: document.getElementById('api-name').value,
            curlCommand: document.getElementById('curl-command').value,
            requestPath: document.getElementById('request-path').value,
            responsePath: document.getElementById('response-path').value
        };

        try {
            const res = await fetch('/api/admin/ai-apis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (res.ok) {
                apiForm.reset();
                apiForm.style.display = 'none';
                addApiBtn.style.display = 'block';
                showNotification('API saved successfully', 'success');
                loadApiList();
            } else {
                showNotification(data.message || 'Failed to save API', 'error');
            }
        } catch (err) {
            console.error('Error saving API:', err);
            showNotification('Failed to save API', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save API';
        }
    });

    // Add Test API functionality
    document.getElementById('test-api').addEventListener('click', async () => {
        const testBtn = document.getElementById('test-api');
        const curlCommand = document.getElementById('curl-command').value;
        const responsePath = document.getElementById('response-path').value;  
        const requestPath = document.getElementById('request-path').value; // Add this line
        const previewStatus = document.querySelector('.preview-status');

        if (!curlCommand) {
            showNotification('Please enter a cURL command first', 'error');
            return;
        }

        if (!requestPath || !responsePath) { // Add validation
            showNotification('Request path and response path are required', 'error');
            return;
        }

        try {
            // Disable button and show loading state
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            previewStatus.textContent = 'Testing connection...';

            const response = await fetch('/api/admin/ai-apis/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify({ 
                    curlCommand,
                    requestPath,  // Add request path
                    responsePath  // Add response path to request
                })
            });

            const data = await response.json();

            if (response.ok) {
                previewStatus.textContent = 'API Test Successful';
                previewStatus.style.color = 'var(--success-color)';
                showNotification('API test successful', 'success');
            } else {
                throw new Error(data.message || 'API test failed');
            }
        } catch (err) {
            previewStatus.textContent = 'API Test Failed';
            previewStatus.style.color = 'var(--error-color)';
            showNotification(err.message, 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-vial"></i> Test API';

            // Reset status after 3 seconds
            setTimeout(() => {
                previewStatus.textContent = '';
            }, 3000);
        }
    });
}

async function loadApiList() {
    const apiList = document.getElementById('api-list');
    const apiCount = document.querySelector('.api-count');
    
    try {
        apiList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading APIs...</div>';
        
        const res = await fetch('/api/admin/ai-apis', {
            headers: {
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            }
        });

        const apis = await res.json();
        
        if (!Array.isArray(apis) || apis.length === 0) {
            apiList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-plug"></i>
                    <p>No APIs configured yet</p>
                    <p class="hint">Click "Add New API" to get started</p>
                </div>
            `;
            apiCount.textContent = '0 APIs';
            return;
        }

        apiCount.textContent = `${apis.length} API${apis.length !== 1 ? 's' : ''}`;
        
        apiList.innerHTML = apis.map(api => `
            <div class="api-item" data-id="${api._id}" data-name="${api.name}">
                <div class="api-details">
                    <div class="api-name">
                        <span class="api-status ${api.isActive ? 'active' : 'inactive'}"></span>
                        ${api.name}
                    </div>
                    <div class="api-endpoint">${api.endpoint || 'No endpoint specified'}</div>
                    <div class="api-paths">
                        <small>Request: ${api.requestPath}</small> | 
                        <small>Response: ${api.responsePath}</small>
                    </div>
                </div>
                <div class="api-controls">
                    <label class="toggle-switch" title="${api.isActive ? 'Deactivate' : 'Activate'} API">
                        <input type="checkbox" 
                               class="api-toggle"
                               data-id="${api._id}"
                               ${api.isActive ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="btn btn-icon edit-api" 
                            data-id="${api._id}"
                            data-action="edit"
                            title="Edit ${api.name}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger delete-api" 
                            data-id="${api._id}"
                            data-action="delete"
                            title="Delete ${api.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event delegation
        apiList.addEventListener('click', handleApiAction);
        apiList.addEventListener('change', handleApiToggle);

    } catch (err) {
        console.error('Error loading APIs:', err);
        apiList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load APIs</p>
                <button onclick="loadApiList()" class="btn btn-retry">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// New unified edit function
async function editData(id, name) {
    console.log('Edit operation started:', { id, name });
    try {
        const editBtn = document.querySelector(`[data-id="${id}"] .edit-api`);
        if (!editBtn) {
            throw new Error('Edit button not found');
        }

        // Show loading state
        editBtn.disabled = true;
        editBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Fetch API details
        const res = await fetch(`/api/admin/ai-apis/${id}`, {
            headers: {
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            }
        });

        console.log('API fetch response:', { status: res.status, ok: res.ok });

        if (!res.ok) {
            throw new Error(await res.text() || 'Failed to fetch API details');
        }

        const api = await res.json();
        console.log('Received API data:', api);

        // Populate form
        const form = document.getElementById('api-form');
        form.dataset.mode = 'edit';
        form.dataset.apiId = id;

        // Populate form fields
        document.getElementById('api-name').value = api.name;
        document.getElementById('curl-command').value = api.curlCommand;
        document.getElementById('request-path').value = api.requestPath;
        document.getElementById('response-path').value = api.responsePath;

        // Update UI
        form.style.display = 'block';
        document.getElementById('add-api-btn').style.display = 'none';
        document.querySelector('.form-header h3').innerHTML = '<i class="fas fa-edit"></i> Edit API Configuration';
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update API';

        console.log('Form populated successfully');
    } catch (err) {
        console.error('Error in editData:', err);
        showNotification(err.message || 'Failed to load API details', 'error');
    } finally {
        // Reset edit button state
        const editBtn = document.querySelector(`[data-id="${id}"] .edit-api`);
        if (editBtn) {
            editBtn.disabled = false;
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        }
    }
}

// New unified delete function
async function deleteData(id, name) {
    console.log('Delete operation started:', { id, name });
    try {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            console.log('Delete cancelled by user');
            return;
        }

        const deleteBtn = document.querySelector(`[data-id="${id}"] .delete-api`);
        if (!deleteBtn) {
            throw new Error('Delete button not found');
        }

        // Show loading state
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const res = await fetch(`/api/admin/ai-apis/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            }
        });

        console.log('Delete response:', { status: res.status, ok: res.ok });

        if (!res.ok) {
            throw new Error(await res.text() || 'Failed to delete API');
        }

        console.log('Successfully deleted:', { id, name });
        showNotification(`${name} deleted successfully`, 'success');
        await loadApiList(); // Reload the list
    } catch (err) {
        console.error('Error in deleteData:', err);
        showNotification(err.message || 'Failed to delete API', 'error');
        
        // Reset delete button state if it still exists
        const deleteBtn = document.querySelector(`[data-id="${id}"] .delete-api`);
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        }
    }
}

async function toggleApi(id, isActive) {
    const apiItem = document.querySelector(`[data-id="${id}"]`);
    const toggleBtn = apiItem?.querySelector('.api-toggle');
    const toggleLabel = toggleBtn?.closest('.toggle-switch');

    if (!toggleBtn || !toggleLabel) {
        console.error('Toggle elements not found');
        return;
    }

    const originalState = toggleBtn.checked;
    
    try {
        toggleLabel.classList.add('loading');
        console.log('Toggling API:', { id, isActive });

        const res = await fetch(`/api/admin/ai-apis/${id}/toggle`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify({ isActive })
        });

        const data = await res.json();
        console.log('Toggle response:', data);

        if (!res.ok) {
            throw new Error(data.message || 'Failed to toggle API');
        }

        // Update status indicator
        const statusIndicator = apiItem.querySelector('.api-status');
        if (statusIndicator) {
            statusIndicator.className = `api-status ${isActive ? 'active' : 'inactive'}`;
        }

        // Keep the checkbox state consistent with the server response
        toggleBtn.checked = data.api.isActive;

        showNotification(
            `API ${isActive ? 'activated' : 'deactivated'} successfully`,
            'success'
        );
    } catch (err) {
        console.error('Error toggling API:', err);
        // Revert toggle state on error
        toggleBtn.checked = originalState;
        showNotification(err.message || 'Failed to update API status', 'error');
    } finally {
        toggleLabel.classList.remove('loading');
    }
}

function handleApiAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const apiItem = btn.closest('.api-item');
    const name = apiItem.dataset.name;

    if (action === 'edit') {
        editData(id, name);
    } else if (action === 'delete') {
        deleteData(id, name);
    }
}

function handleApiToggle(e) {
    const toggle = e.target;
    if (!toggle.classList.contains('api-toggle')) return;

    const id = toggle.dataset.id;
    toggleApi(id, toggle.checked);
}

document.getElementById('api-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const isEdit = form.dataset.mode === 'edit';
    const apiId = form.dataset.apiId;
    const apiNameInput = document.getElementById('api-name');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        // Trim the API name to prevent whitespace issues
        const formData = {
            name: apiNameInput.value.trim(),
            curlCommand: document.getElementById('curl-command').value,
            requestPath: document.getElementById('request-path').value,
            responsePath: document.getElementById('response-path').value
        };

        // Validate name before submitting
        if (!formData.name) {
            throw new Error('API name is required');
        }

        const res = await fetch(
            isEdit ? `/api/admin/ai-apis/${apiId}` : '/api/admin/ai-apis',
            {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify(formData)
            }
        );

        const data = await res.json();
        if (!res.ok) {
            if (data.code === 'DUPLICATE_NAME') {
                apiNameInput.classList.add('error');
                apiNameInput.focus();
                throw new Error(`An API named "${formData.name}" already exists. Please choose a different name.`);
            }
            throw new Error(data.message || 'Failed to save API');
        }

        // Clear error state if successful
        apiNameInput.classList.remove('error');
        
        showNotification(`API ${isEdit ? 'updated' : 'saved'} successfully`, 'success');
        form.reset();
        form.style.display = 'none';
        document.getElementById('add-api-btn').style.display = 'block';
        form.dataset.mode = 'create';
        form.dataset.apiId = '';
        await loadApiList();
    } catch (err) {
        console.error('Error saving API:', err);
        showNotification(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Save'} API`;
    }
});

// Add input validation
document.getElementById('api-name').addEventListener('input', function() {
    this.value = this.value.trim();
    this.classList.remove('error');
});

async function deleteApi(apiName) {
    const apiNameSlug = apiName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/\./g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .trim();

    const deleteBtnId = `${apiNameSlug}-delete`;
    console.log('Delete operation started:', { apiName, apiNameSlug, deleteBtnId });

    try {
        // Find the delete button and API element
        const deleteBtn = document.getElementById(deleteBtnId);
        if (!deleteBtn) {
            throw new Error(`Delete button not found for ID: ${deleteBtnId}`);
        }

        const apiElement = deleteBtn.closest('.api-item');
        if (!apiElement) {
            throw new Error('API element not found');
        }

        const apiId = apiElement.dataset.id;
        console.log('Found API element:', { apiId, elementFound: !!apiElement });

        if (!confirm(`Are you sure you want to delete the API "${apiName}"? This action cannot be undone.`)) {
            console.log('Delete cancelled by user');
            return;
        }

        // Show loading state
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        console.log('Sending delete request:', { apiId, url: `/api/admin/ai-apis/${apiId}` });

        const res = await fetch(`/api/admin/ai-apis/${apiId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            }
        });

        console.log('Delete response:', { status: res.status, ok: res.ok });

        if (!res.ok) {
            throw new Error(await res.text() || 'Failed to delete API');
        }

        console.log('API deleted successfully:', { apiId });
        showNotification('API deleted successfully', 'success');
        await loadApiList(); // Reload the list
    } catch (err) {
        console.error('Error in deleteApi:', {
            error: err.message,
            stack: err.stack
        });
        showNotification(err.message || 'Failed to delete API', 'error');
    }
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
