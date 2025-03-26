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
    initImageApiSection();
    loadGlobalSettings();
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

function initImageApiSection() {
    // Store all relevant elements in an object to maintain proper scope
    const elements = {
        form: document.getElementById('image-api-form'),
        list: document.getElementById('image-api-list'),
        addButton: document.getElementById('add-image-api-btn'),
        closeButton: document.getElementById('close-image-form'),
        testButton: document.getElementById('test-image-api')
    };

    // Log what elements were found/missing
    console.log('Image API section initialization:', {
        form: !!elements.form,
        list: !!elements.list,
        addBtn: !!elements.addButton,
        closeBtn: !!elements.closeButton
    });

    if (!elements.form || !elements.list || !elements.addButton) {
        console.error('Required elements for Image API section not found');
        return;
    }

    // Show/Hide form handlers
    elements.addButton.addEventListener('click', () => {
        elements.form.style.display = 'block';
        elements.addButton.style.display = 'none';
    });

    if (elements.closeButton) {
        elements.closeButton.addEventListener('click', () => {
            elements.form.style.display = 'none';
            elements.addButton.style.display = 'block';
            elements.form.reset();
        });
    }

    // SINGLE form submission handler with proper scoping
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        console.log('Image API form submission started');
        
        const formData = {
            name: document.getElementById('image-api-name').value.trim(),
            curlCommand: document.getElementById('image-curl-command').value,
            requestPath: document.getElementById('image-request-path').value,
            responsePath: document.getElementById('image-response-path').value || ''
        };

        console.log('Form data prepared:', {
            name: formData.name,
            requestPath: formData.requestPath,
            responsePath: formData.responsePath,
            curlLength: formData.curlCommand?.length || 0
        });

        try {
            if (!formData.name || !formData.curlCommand || !formData.requestPath) {
                throw new Error('Name, cURL command, and request path are required');
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            const res = await fetch('/api/admin/image-apis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                elements.form.reset();
                elements.form.style.display = 'none';
                elements.addButton.style.display = 'block';
                showNotification('Image API saved successfully', 'success');
                await loadImageApiList();
            } else {
                throw new Error(data.message || 'Failed to save Image API');
            }
        } catch (err) {
            console.error('Error saving Image API:', err);
            showNotification(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save API';
        }
    });

    // Test Image API button handler
    if (elements.testButton) {
        elements.testButton.addEventListener('click', async () => {
            const testBtn = elements.testButton;
            const curlCommand = document.getElementById('image-curl-command').value;
            const requestPath = document.getElementById('image-request-path').value;
            const responsePath = document.getElementById('image-response-path').value;
            const previewStatus = elements.form.querySelector('.preview-status');
        
            // Update validation to make responsePath optional
            if (!curlCommand || !requestPath) {
                showNotification('cURL command and request path are required', 'error');
                return;
            }
        
            try {
                testBtn.disabled = true;
                testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
                previewStatus.textContent = 'Testing API...';
        
                const response = await fetch('/api/admin/image-apis/test', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                    },
                    body: JSON.stringify({ 
                        curlCommand,
                        requestPath,
                        responsePath  // This will be empty string when blank
                    })
                });
        
                const data = await response.json();
        
                if (response.ok) {
                    previewStatus.textContent = 'API Test Successful';
                    previewStatus.style.color = 'var(--success-color)';
                    showNotification('Image API test successful', 'success');
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
                setTimeout(() => {
                    previewStatus.textContent = '';
                }, 3000);
            }
        });
    }

    // Initial load of image APIs
    loadImageApiList();
    loadGlobalSettings();
}

// IMPORTANT: Remove these duplicate handlers:
// - document.getElementById('image-api-form').addEventListener('submit', ...)
// - imageApiForm.addEventListener('submit', ...)

async function loadImageApiList() {
    const imageApiList = document.getElementById('image-api-list');
    const apiCount = document.querySelector('.image-api-count');
    
    try {
        imageApiList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading Image APIs...</div>';
        
        const res = await fetch('/api/admin/image-apis', {
            headers: {
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            }
        });

        const apis = await res.json();
        
        apiCount.textContent = `${apis.length} API${apis.length !== 1 ? 's' : ''}`;
        
        if (!apis.length) {
            imageApiList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-image"></i>
                    <p>No Image APIs configured yet</p>
                    <p class="hint">Click "Add New API" to get started</p>
                </div>
            `;
            return;
        }

        // Render API list
        imageApiList.innerHTML = apis.map(api => `
            <div class="api-item" data-id="${api._id}" data-name="${api.name}">
                <div class="api-details">
                    <div class="api-name">
                        <span class="api-status ${api.isActive ? 'active' : 'inactive'}"></span>
                        ${api.name}
                    </div>
                    <div class="api-endpoint">${api.endpoint || 'No endpoint specified'}</div>
                    <div class="api-paths">
                        <small>Sizes: ${(api.supportedSizes || []).map(s => s.label).join(', ') || 'None'}</small> |
                        <small>Styles: ${(api.supportedStyles || []).map(s => s.name).join(', ') || 'None'}</small>
                    </div>
                </div>
                <div class="api-controls">
                    <label class="toggle-switch">
                        <input type="checkbox" class="api-toggle" data-id="${api._id}" ${api.isActive ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="btn btn-icon edit-api" data-id="${api._id}" data-action="edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger delete-api" data-id="${api._id}" data-action="delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading Image APIs:', err);
        imageApiList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load Image APIs</p>
                <button onclick="loadImageApiList()" class="btn btn-retry">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

function handleStyleEdit(apiId) {
    const styleOptions = document.getElementById('style-options');
    const existingStyles = Array.from(styleOptions.querySelectorAll('.style-option'));
    const styles = existingStyles.map(styleOpt => ({
        id: styleOpt.querySelector('input').value,
        name: styleOpt.querySelector('label').textContent,
        description: `${styleOpt.querySelector('label').textContent} style`
    }));

    updateStyles(apiId, styles);
}

function handleSizeEdit(apiId) {
    const sizeOptions = document.getElementById('size-options');
    const existingSizes = Array.from(sizeOptions.querySelectorAll('.size-option'));
    const sizes = existingSizes.map(sizeOpt => {
        const value = parseInt(sizeOpt.querySelector('input').value);
        return {
            width: value,
            height: value,
            label: `${value}x${value}`
        };
    });

    updateSizes(apiId, sizes);
}

async function updateStyles(apiId, styles) {
    try {
        const res = await fetch(`/api/admin/image-apis/${apiId}/styles`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify({ styles })
        });

        if (!res.ok) throw new Error('Failed to update styles');
        
        showNotification('Styles updated successfully', 'success');
        await loadImageApiList(); // Reload the list to show updates
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

async function updateSizes(apiId, sizes) {
    try {
        const res = await fetch(`/api/admin/image-apis/${apiId}/sizes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify({ sizes })
        });

        if (!res.ok) throw new Error('Failed to update sizes');
        
        showNotification('Sizes updated successfully', 'success');
        await loadImageApiList(); // Reload the list to show updates
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

async function loadGlobalSettings() {
    try {
        // Load sizes
        const sizesRes = await fetch('/api/admin/image-settings/sizes', {
            headers: { 'Authorization': `Bearer ${AuthGuard.getAuthToken()}` }
        });
        const sizesData = await sizesRes.json();
        
        // Load styles
        const stylesRes = await fetch('/api/admin/image-settings/styles', {
            headers: { 'Authorization': `Bearer ${AuthGuard.getAuthToken()}` }
        });
        const stylesData = await stylesRes.json();

        console.log('Loaded settings:', { sizes: sizesData.values, styles: stylesData.values });

        // Clear existing options
        const sizeContainer = document.getElementById('global-size-options');
        const styleContainer = document.getElementById('global-style-options');
        
        if (sizeContainer) sizeContainer.innerHTML = '';
        if (styleContainer) styleContainer.innerHTML = '';

        // Add saved size options
        sizesData.values?.forEach(size => {
            addGlobalSizeOption(size);
        });

        // Add saved style options
        stylesData.values?.forEach(style => {
            addGlobalStyleOption(style);
        });
    } catch (err) {
        console.error('Error loading settings:', err);
        showNotification('Failed to load settings', 'error');
    }
}

async function saveGlobalSettings(type) {
    try {
        const values = type === 'sizes' ? 
            Array.from(document.querySelectorAll('#global-size-options .size-item'))
                .map(el => {
                    const label = el.querySelector('label').textContent;
                    const [name, dimensions] = label.split(' (');
                    const [width, height] = dimensions.replace(')', '').split('x').map(Number);
                    
                    return {
                        id: `${width}x${height}`,
                        name: label,
                        width: width,  // Add direct width property
                        height: height, // Add direct height property
                        value: {
                            width: width,
                            height: height
                        },
                        isActive: el.querySelector('input[type="checkbox"]').checked
                    };
                }) :
            Array.from(document.querySelectorAll('#global-style-options .style-item'))
                .map(el => ({
                    id: el.dataset.id,  // Use the data-id attribute
                    name: el.querySelector('label').textContent,
                    value: el.dataset.id,  // Use same ID for value
                    isActive: el.querySelector('input[type="checkbox"]').checked
                }));

        console.log('Saving settings:', { type, values });

        const res = await fetch(`/api/admin/image-settings/${type}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify({ values })
        });

        if (!res.ok) throw new Error('Failed to save settings');
        const data = await res.json();
        
        // Reload the options to show the updated data
        if (type === 'sizes') {
            updateSizeOptions(data.values);
        }
        
        showNotification(`${type} updated successfully`, 'success');
    } catch (err) {
        console.error('Error saving settings:', err);
        showNotification(err.message, 'error');
    }
}

function collectSizeValues() {
    return Array.from(document.querySelectorAll('#size-options .size-option'))
        .map(el => ({
            id: el.querySelector('input').value,
            name: `${el.querySelector('input').value}x${el.querySelector('input').value}`,
            value: {
                width: parseInt(el.querySelector('input').value),
                height: parseInt(el.querySelector('input').value)
            },
            isActive: el.querySelector('input').checked
        }));
}

function collectStyleValues() {
    return Array.from(document.querySelectorAll('#style-options .style-option'))
        .map(el => ({
            id: el.querySelector('input').value,
            name: el.querySelector('label').textContent,
            value: el.querySelector('input').value,
            isActive: el.querySelector('input').checked
        }));
}

function updateSizeOptions(sizes) {
    const container = document.getElementById('size-options');
    container.innerHTML = sizes.map(size => `
        <div class="size-option">
            <input type="checkbox" id="size-${size.id}" value="${size.id}" 
                   ${size.isActive ? 'checked' : ''}>
            <label for="size-${size.id}">${size.name}</label>
            <button type="button" class="btn-icon btn-danger remove-size" 
                    onclick="removeOption(this, 'sizes')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function updateStyleOptions(styles) {
    const container = document.getElementById('style-options');
    container.innerHTML = styles.map(style => `
        <div class="style-option">
            <input type="checkbox" id="style-${style.id}" value="${style.id}"
                   ${style.isActive ? 'checked' : ''}>
            <label for="style-${style.id}">${style.name}</label>
            <button type="button" class="btn-icon btn-danger remove-style" 
                    onclick="removeOption(this, 'styles')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeOption(btn, type) {
    btn.closest('.size-option, .style-option').remove();
    saveGlobalSettings(type);
}

function addGlobalSizeOption(size) {
    const container = document.getElementById('global-size-options');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'size-item';
    div.dataset.id = size.id;
    div.innerHTML = `
        <input type="checkbox" id="size-${size.id}" ${size.isActive ? 'checked' : ''}>
        <label for="size-${size.id}">${size.name}</label>
        <div class="item-controls">
            <button type="button" class="btn-icon" onclick="editSize('${size.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn-icon btn-danger" onclick="removeGlobalOption(this, 'sizes')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
}

function addGlobalStyleOption(style) {
    const container = document.getElementById('global-style-options');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'style-item';
    div.dataset.id = style.id;
    div.innerHTML = `
        <input type="checkbox" id="style-${style.id}" ${style.isActive ? 'checked' : ''}>
        <label for="style-${style.id}">${style.name}</label>
        <div class="item-controls">
            <button type="button" class="btn-icon" onclick="editStyle('${style.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn-icon btn-danger" onclick="removeGlobalOption(this, 'styles')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
}

// Update editSize to handle saved sizes correctly
function editSize(id) {
    const item = document.querySelector(`.size-item[data-id="${id}"]`);
    if (!item) return;

    const currentLabel = item.querySelector('label').textContent;
    const [name, dimensions] = currentLabel.split(' (');
    const [width, height] = dimensions.replace(')', '').split('x').map(Number);

    const newSize = prompt('Enter new size (e.g., 512x512):', `${width}x${height}`);
    if (newSize) {
        const [newWidth, newHeight] = newSize.split('x').map(Number);
        if (newWidth && newHeight) {
            const newName = prompt('Enter name for this size:', name) || `${newWidth}x${newHeight}`;
            item.querySelector('label').textContent = `${newName} (${newWidth}x${newHeight})`;
            saveGlobalSettings('sizes');
        }
    }
}

function editStyle(id) {
    const item = document.querySelector(`.style-item[data-id="${id}"]`);
    if (!item) return;

    const currentLabel = item.querySelector('label').textContent;
    const newName = prompt('Enter new style name:', currentLabel);
    
    if (newName) {
        // Create new ID from the name
        const newId = newName.toLowerCase().replace(/\s+/g, '-');
        
        // Update both label and dataset
        item.querySelector('label').textContent = newName;
        item.dataset.id = newId;  // Update the data-id attribute
        
        saveGlobalSettings('styles');
    }
}

function removeGlobalOption(btn, type) {
    const item = btn.closest('.size-item, .style-item');
    item.remove();
    saveGlobalSettings(type);
}

function collectGlobalSizeValues() {
    return Array.from(document.querySelectorAll('#global-size-options .size-item'))
        .map(el => {
            const [width, height] = el.querySelector('label').textContent.split('x').map(Number);
            return {
                id: el.dataset.id,
                name: `${width}x${height}`,
                value: { width, height },
                isActive: el.querySelector('input[type="checkbox"]').checked
            };
        });
}

function collectGlobalStyleValues() {
    return Array.from(document.querySelectorAll('#global-style-options .style-item'))
        .map(el => ({
            id: el.dataset.id,
            name: el.querySelector('label').textContent,
            value: el.dataset.id,
            isActive: el.querySelector('input[type="checkbox"]').checked
        }));
}

async function saveVoiceSettings(type) {
    const btn = event.target;
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const settings = {
            type,
            range: {
                min: parseFloat(document.getElementById(`${type}-min`).value),
                max: parseFloat(document.getElementById(`${type}-max`).value),
                default: parseFloat(document.getElementById(`${type}-default`).value),
                step: parseFloat(document.getElementById(`${type}-step`).value)
            }
        };

        // Validate values
        if (settings.range.min >= settings.range.max) {
            throw new Error('Minimum value must be less than maximum value');
        }

        if (settings.range.default < settings.range.min || 
            settings.range.default > settings.range.max) {
            throw new Error('Default value must be between min and max values');
        }

        const res = await fetch(`/api/admin/voice-settings/${type}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify(settings)
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to save settings');
        }

        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} settings saved successfully`, 'success');
    } catch (err) {
        console.error(`Error saving ${type} settings:`, err);
        showNotification(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
