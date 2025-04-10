async function initAiApiSection() {
    const elements = {
        form: document.getElementById('api-form'),
        list: document.getElementById('api-list'),
        addButton: document.getElementById('add-api-btn'),
        closeButton: document.getElementById('close-form'),
        testButton: document.getElementById('test-api')  // Add test button
    };

    if (!elements.form || !elements.list || !elements.addButton) {
        console.error('Required elements for AI API section not found');
        return;
    }

    // Show/Hide form handlers
    elements.addButton.addEventListener('click', () => {
        elements.form.style.display = 'block';
        elements.addButton.style.display = 'none';
    });

    if (elements.closeButton) {
        elements.closeButton.addEventListener('click', () => {
            const form = document.getElementById('api-form');
            resetForm(form);
            form.style.display = 'none';
            document.getElementById('add-api-btn').style.display = 'block';
        });
    }

    // Add test button handler
    if (elements.testButton) {
        elements.testButton.addEventListener('click', testApi);
    }

    // Load existing APIs
    await loadApiList();

    // Form submission handling
    elements.form.addEventListener('submit', handleFormSubmit);
}

// Add API List loading function
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
                    <p class="hint">Click "Add New API" to get started</div>
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

// Add form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const formData = {
            name: document.getElementById('api-name').value.trim(),
            curlCommand: document.getElementById('curl-command').value,
            requestPath: document.getElementById('request-path').value,
            responsePath: document.getElementById('response-path').value
        };

        if (!formData.name || !formData.curlCommand || !formData.requestPath) {
            throw new Error('Name, cURL command, and request path are required');
        }

        const res = await window.adminUtils.makeApiRequest('/api/admin/ai-apis', {
            method: 'POST',
            body: formData
        });

        showNotification('API saved successfully', 'success');
        form.reset();
        form.style.display = 'none';
        document.getElementById('add-api-btn').style.display = 'block';
        await loadApiList();

    } catch (err) {
        console.error('Error saving API:', err);
        showNotification(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save API';
    }
}

// Handle API actions (edit/delete)
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

// Handle API toggle
function handleApiToggle(e) {
    const toggle = e.target;
    if (!toggle.classList.contains('api-toggle')) return;

    const id = toggle.dataset.id;
    toggleApi(id, toggle.checked);
}

// Add test API function
async function testApi() {
    const elements = {
        testBtn: document.getElementById('test-api'),
        curlCommand: document.getElementById('curl-command'),
        requestPath: document.getElementById('request-path'),
        responsePath: document.getElementById('response-path'),
        testStatus: document.querySelector('.test-indicator'),
        testMessage: document.querySelector('.test-message'),
        testDetails: document.querySelector('.test-details'),
        testResponse: document.querySelector('.test-response'),
        testSection: document.querySelector('.test-status-section')
    };

    if (!elements.curlCommand?.value || !elements.requestPath?.value) {
        showNotification('cURL command and request path are required', 'error');
        return;
    }

    try {
        // Show test section
        elements.testSection.style.display = 'block';

        // Update UI to show testing state
        elements.testBtn.disabled = true;
        elements.testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        elements.testStatus.className = 'test-indicator running';
        elements.testStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing API...';
        elements.testMessage.textContent = 'Making test request...';
        elements.testDetails.style.display = 'none';

        const response = await window.adminUtils.makeApiRequest('/api/admin/ai-apis/test', {
            method: 'POST',
            body: {
                curlCommand: elements.curlCommand.value,
                requestPath: elements.requestPath.value,
                responsePath: elements.responsePath?.value
            }
        });

        // Update UI for success
        elements.testStatus.className = 'test-indicator success';
        elements.testStatus.innerHTML = '<i class="fas fa-check-circle"></i> Test Successful';
        elements.testMessage.textContent = 'API test completed successfully';
        
        // Show response details
        elements.testDetails.style.display = 'block';
        elements.testResponse.textContent = JSON.stringify(response.details, null, 2);
        
        showNotification('API test successful', 'success');

    } catch (err) {
        // Update UI for error
        elements.testStatus.className = 'test-indicator error';
        elements.testStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Test Failed';
        elements.testMessage.textContent = err.message;
        elements.testDetails.style.display = 'none';
        
        showNotification(err.message, 'error');
    } finally {
        elements.testBtn.disabled = false;
        elements.testBtn.innerHTML = '<i class="fas fa-vial"></i> Test API';
    }
}

// Add missing edit and delete functions
async function editData(id, name) {
    try {
        const response = await window.adminUtils.makeApiRequest(`/api/admin/ai-apis/${id}`);
        
        // Get form elements
        const form = document.getElementById('api-form');
        const addButton = document.getElementById('add-api-btn');
        const formHeader = form.querySelector('.form-header h3');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Fill form with API data
        document.getElementById('api-name').value = response.name;
        document.getElementById('curl-command').value = response.curlCommand;
        document.getElementById('request-path').value = response.requestPath;
        document.getElementById('response-path').value = response.responsePath || '';
        
        // Update form header and submit button
        formHeader.innerHTML = '<i class="fas fa-edit"></i> Update API';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update API';
        
        // Set form to edit mode
        form.dataset.mode = 'edit';
        form.dataset.apiId = id;
        
        // Show form
        form.style.display = 'block';
        addButton.style.display = 'none';
        
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

async function deleteData(id, name) {
    if (!confirm(`Are you sure you want to delete API "${name}"?`)) return;
    
    try {
        await window.adminUtils.makeApiRequest(`/api/admin/ai-apis/${id}`, {
            method: 'DELETE'
        });
        
        showNotification('API deleted successfully', 'success');
        await loadApiList();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

async function toggleApi(id, isActive) {
    try {
        await window.adminUtils.makeApiRequest(`/api/admin/ai-apis/${id}/toggle`, {
            method: 'PATCH',
            body: { isActive }
        });
        
        showNotification(
            `API ${isActive ? 'activated' : 'deactivated'} successfully`, 
            'success'
        );
    } catch (err) {
        showNotification(err.message, 'error');
        // Revert toggle if failed
        const toggle = document.querySelector(`.api-toggle[data-id="${id}"]`);
        if (toggle) toggle.checked = !isActive;
    }
}

function formatCurl() {
    const textarea = document.getElementById('curl-command');
    try {
        const command = textarea.value.trim();
        if (!command) return;

        const parsed = parseCurlCommand(command);
        const formatted = JSON.stringify(parsed, null, 2);
        textarea.value = formatted;
    } catch (err) {
        showNotification('Failed to format cURL command', 'error');
    }
}

// Add form reset handler
function resetForm(form) {
    const formHeader = form.querySelector('.form-header h3');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    formHeader.innerHTML = '<i class="fas fa-plus"></i> Add New API';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save API';
    form.dataset.mode = 'add';
    delete form.dataset.apiId;
    form.reset();
}

// Export required functions
window.loadApiList = loadApiList;

// Export the initialization function
window.initAiApiSection = initAiApiSection;
