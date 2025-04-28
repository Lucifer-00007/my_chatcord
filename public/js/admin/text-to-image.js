async function initImageApiSection() {
    console.log('[initImageApiSection] Starting initialization...');
    // Minimal guard for adminUtils, all auth handled in admin.js
    if (!window.adminUtils) return;

    const elements = {
        formDiv: document.getElementById('image-api-form'),
        list: document.getElementById('image-api-list'),
        addButton: document.getElementById('add-image-api-btn'),
        closeButton: document.getElementById('close-image-form'),
        testButton: document.getElementById('test-image-api')
    };
    const form = elements.formDiv ? elements.formDiv.querySelector('form') : null;
    if (!elements.formDiv || !form || !elements.list || !elements.addButton) {
        console.error('Required elements for Image API section not found:', {
            hasFormDiv: !!elements.formDiv,
            hasForm: !!form,
            hasList: !!elements.list,
            hasAddButton: !!elements.addButton
        });
        return;
    }

    // Show/Hide form handlers
    elements.addButton.addEventListener('click', () => {
        elements.formDiv.style.display = 'block';
        elements.addButton.style.display = 'none';
    });

    if (elements.closeButton) {
        elements.closeButton.addEventListener('click', () => {
            // Access the form element directly since it's an HTMLFormElement
            const formDiv = document.getElementById('image-api-form');
            const form = formDiv ? formDiv.querySelector('form') : null;
            if (form instanceof HTMLFormElement) {
                form.reset();
            }
            elements.formDiv.style.display = 'none';
            elements.addButton.style.display = 'block';
        });
    }

    // Initial load
    await Promise.all([
        loadImageApiList(),
        loadGlobalSettings()
    ]);

    // Initialize event handlers
    initToggleHandlers();

    // Form submission handling
    form.addEventListener('submit', handleImageFormSubmit);

    // Add test button handler
    const testButton = document.getElementById('test-image-api');
    if (testButton) {
        testButton.addEventListener('click', testImageApi);
    }
}

// Fix loadImageApiList function
async function loadImageApiList() {
    if (!window.adminUtils) {
        console.error('[text-to-image.js] adminUtils is undefined, but user is authenticated. Possible server/network error.');
        // Optionally show a user-friendly error message here
        alert('Server unavailable or network error. Please try again later.');
        return;
    }

    const imageApiList = document.getElementById('image-api-list');
    const apiCount = document.querySelector('.image-api-count');
    
    try {
        imageApiList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading Image APIs...</div>';
        
        // First try to get active APIs, fallback to all APIs if there's an error
        let apis = [];
        try {
            apis = await window.adminUtils.makeApiRequest('/api/admin/image-apis/active');
        } catch (activeErr) {
            console.warn('Failed to fetch active APIs, falling back to all APIs:', activeErr);
            apis = await window.adminUtils.makeApiRequest('/api/admin/image-apis');
        }
        
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

        imageApiList.innerHTML = apis.map(api => `
            <div class="api-item" data-id="${api._id}" data-name="${api.name}">
                <div class="api-details">
                    <div class="api-name">
                        <span class="api-status ${api.isActive ? 'active' : 'inactive'}"></span>
                        ${api.name}
                    </div>
                    <div class="api-paths">
                        <small>Request: ${api.requestPath}</small> | 
                        <small>Response: ${api.responsePath || 'None'}</small>
                    </div>
                </div>
                <div class="api-controls">
                    <label class="toggle-switch">
                        <input type="checkbox" class="api-toggle" data-id="${api._id}" ${api.isActive ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="btn btn-icon edit-api" data-id="${api._id}" onclick="editImageApi('${api._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger delete-api" data-id="${api._id}" onclick="deleteImageApi('${api._id}', '${api.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Initialize toggle handlers after loading the list
        initToggleHandlers();

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

// Add form submission handler
async function handleImageFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const formData = {
            name: document.getElementById('image-api-name').value.trim(),
            curlCommand: document.getElementById('image-curl-command').value,
            requestPath: document.getElementById('image-request-path').value,
            responsePath: document.getElementById('image-response-path').value,
            supportedSizes: Array.from(document.querySelectorAll('#global-size-options .size-item'))
                .filter(item => item.querySelector('input[type="checkbox"]').checked)
                .map(item => ({
                    id: item.dataset.id,
                    label: item.querySelector('label').textContent
                })),
            supportedStyles: Array.from(document.querySelectorAll('#global-style-options .style-item'))
                .filter(item => item.querySelector('input[type="checkbox"]').checked)
                .map(item => ({
                    id: item.dataset.id,
                    name: item.querySelector('label').textContent
                }))
        };

        if (!formData.name || !formData.curlCommand || !formData.requestPath) {
            throw new Error('Name, cURL command, and request path are required');
        }

        // Check if we're editing or adding
        const isEditing = form.dataset.mode === 'edit';
        const apiId = form.dataset.apiId;

        const endpoint = isEditing ? 
            `/api/admin/image-apis/${apiId}` : 
            '/api/admin/image-apis';

        const method = isEditing ? 'PUT' : 'POST';

        const res = await window.adminUtils.makeApiRequest(endpoint, {
            method,
            body: formData
        });

        showNotification(`Image API ${isEditing ? 'updated' : 'saved'} successfully`, 'success');
        resetImageForm();
        await loadImageApiList();

    } catch (err) {
        console.error('Error saving Image API:', err);
        showNotification(err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save API';
        }
    }
}

// Add action handlers
function handleImageApiAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const apiItem = btn.closest('.api-item');
    const name = apiItem.dataset.name;

    if (action === 'edit') {
        editImageApi(id, name);
    } else if (action === 'delete') {
        deleteImageApi(id, name);
    }
}

function handleImageApiToggle(e) {
    const toggle = e.target;
    if (!toggle.classList.contains('api-toggle')) return;

    const id = toggle.dataset.id;
    toggleImageApi(id, toggle.checked);
}

// Add helper functions
function resetImageForm() {
    const formDiv = document.getElementById('image-api-form');
    const form = formDiv ? formDiv.querySelector('form') : null;
    if (!form) {
        console.error('Form element not found or not an HTMLFormElement');
        return;
    }

    const formHeader = form.querySelector('.form-header h3');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (formHeader) {
        formHeader.innerHTML = '<i class="fas fa-plus"></i> Add New Image API';
    }
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save API';
    }

    form.dataset.mode = 'add';
    delete form.dataset.apiId;

    // Reset form inputs manually in case form.reset() is not available
    form.querySelectorAll('input, textarea').forEach(input => {
        input.value = '';
    });

    try {
        form.reset();
    } catch (err) {
        console.warn('Form reset failed, inputs were cleared manually');
    }

    formDiv.style.display = 'none';
    
    const addButton = document.getElementById('add-image-api-btn');
    if (addButton) {
        addButton.style.display = 'block';
    }
}

// Add the loadGlobalSettings function
async function loadGlobalSettings() {
    if (!window.adminUtils) {
        console.error('[text-to-image.js] adminUtils is undefined, but user is authenticated. Possible server/network error.');
        // Optionally show a user-friendly error message here
        alert('Server unavailable or network error. Please try again later.');
        return;
    }

    try {
        console.log('Starting to load global settings...');
        const sizeContainer = document.getElementById('global-size-options');
        const styleContainer = document.getElementById('global-style-options');

        if (!sizeContainer || !styleContainer) {
            console.error('Required containers not found:', {
                hasSizeContainer: !!sizeContainer,
                hasStyleContainer: !!styleContainer
            });
            return;
        }

        // Clear existing options
        sizeContainer.innerHTML = '';
        styleContainer.innerHTML = '';

        // Load sizes
        console.log('Fetching sizes...');
        const sizesRes = await window.adminUtils.makeApiRequest('/api/admin/image-apis/settings/sizes');
        console.log('Received sizes:', sizesRes);

        if (sizesRes.values?.length > 0) {
            sizesRes.values.forEach(size => {
                const sizeId = size.id || `${size.width}x${size.height}`;
                const div = document.createElement('div');
                div.className = 'size-item';
                div.dataset.id = sizeId;
                div.innerHTML = `
                    <input type="checkbox" id="size-${sizeId}" ${size.isActive ? 'checked' : ''}>
                    <label for="size-${sizeId}">${size.label || sizeId}</label>
                    <div class="item-controls">
                        <button type="button" class="btn-icon btn-edit" onclick="editSize('${sizeId}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn-icon btn-danger" onclick="removeGlobalOption(this, 'sizes')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                sizeContainer.appendChild(div);
            });
        }

        // Load styles
        console.log('Fetching styles...');
        const stylesRes = await window.adminUtils.makeApiRequest('/api/admin/image-apis/settings/styles');
        console.log('Received styles:', stylesRes);

        if (stylesRes.values?.length > 0) {
            stylesRes.values.forEach(style => {
                const styleId = style.id || style.name.toLowerCase().replace(/\s+/g, '-');
                const div = document.createElement('div');
                div.className = 'style-item';
                div.dataset.id = styleId;
                div.innerHTML = `
                    <input type="checkbox" id="style-${styleId}" ${style.isActive ? 'checked' : ''}>
                    <label for="style-${styleId}">${style.name}</label>
                    <div class="item-controls">
                        <button type="button" class="btn-icon btn-edit" onclick="editStyle('${styleId}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn-icon btn-danger" onclick="removeGlobalOption(this, 'styles')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                styleContainer.appendChild(div);
            });
        }

        console.log('Global settings loaded successfully');
    } catch (err) {
        console.error('Error loading global settings:', err);
        showNotification('Failed to load settings: ' + err.message, 'error');
    }
}

// Add helper functions for global settings
function editSize(id) {
    const item = document.querySelector(`.size-item[data-id="${id}"]`);
    if (!item) return;

    const currentLabel = item.querySelector('label').textContent;
    const [width, height] = currentLabel.split('x').map(Number);
    
    const newSize = prompt('Enter new size (e.g., 512x512):', `${width}x${height}`);
    if (newSize && /^\d+x\d+$/.test(newSize)) {
        const [newWidth, newHeight] = newSize.split('x').map(Number);
        item.dataset.id = `${newWidth}x${newHeight}`;
        item.querySelector('label').textContent = newSize;
        saveGlobalSettings('sizes');
    }
}

function editStyle(id) {
    const item = document.querySelector(`.style-item[data-id="${id}"]`);
    if (!item) return;

    const currentName = item.querySelector('label').textContent;
    const newName = prompt('Enter new style name:', currentName);
    
    if (newName) {
        const newId = newName.toLowerCase().replace(/\s+/g, '-');
        item.dataset.id = newId;
        item.querySelector('label').textContent = newName;
        saveGlobalSettings('styles');
    }
}

function removeGlobalOption(btn, type) {
    const item = btn.closest('.size-item, .style-item');
    if (item) {
        item.remove();
        saveGlobalSettings(type);
    }
}

async function saveGlobalSettings(type) {
    try {
        const values = type === 'sizes' ? 
            Array.from(document.querySelectorAll('#global-size-options .size-item'))
                .map(el => ({
                    id: el.dataset.id,
                    label: el.querySelector('label').textContent,
                    isActive: el.querySelector('input[type="checkbox"]').checked
                })) :
            Array.from(document.querySelectorAll('#global-style-options .style-item'))
                .map(el => ({
                    id: el.dataset.id,
                    name: el.querySelector('label').textContent,
                    isActive: el.querySelector('input[type="checkbox"]').checked
                }));

        const res = await fetch(`/api/admin/image-settings/${type}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify({ values })
        });

        if (!res.ok) {
            throw new Error(`Failed to save ${type}`);
        }

        showNotification(`${type} updated successfully`, 'success');
    } catch (err) {
        console.error('Error saving settings:', err);
        showNotification(err.message, 'error');
    }
}

// Add function to handle adding new options
function addGlobalOption(type) {
    if (type === 'size') {
        const size = prompt('Enter size (e.g., 512x512):');
        if (!size || !/^\d+x\d+$/.test(size)) {
            showNotification('Invalid size format. Please use format: widthxheight', 'error');
            return;
        }

        const [width, height] = size.split('x').map(Number);
        const sizeId = `${width}x${height}`;
        const container = document.getElementById('global-size-options');
        const div = document.createElement('div');
        div.className = 'size-item';
        div.dataset.id = sizeId;
        div.innerHTML = `
            <input type="checkbox" id="size-${sizeId}" checked>
            <label for="size-${sizeId}">${width}x${height}</label>
            <div class="item-controls">
                <button type="button" class="btn-icon btn-edit" onclick="editSize('${sizeId}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-icon btn-danger" onclick="removeGlobalOption(this, 'sizes')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
        saveGlobalSettings('sizes');
    } else if (type === 'style') {
        const styleName = prompt('Enter style name:');
        if (!styleName) return;

        const styleId = styleName.toLowerCase().replace(/\s+/g, '-');
        const container = document.getElementById('global-style-options');
        const div = document.createElement('div');
        div.className = 'style-item';
        div.dataset.id = styleId;
        div.innerHTML = `
            <input type="checkbox" id="style-${styleId}" checked>
            <label for="style-${styleId}">${styleName}</label>
            <div class="item-controls">
                <button type="button" class="btn-icon btn-edit" onclick="editStyle('${styleId}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-icon btn-danger" onclick="removeGlobalOption(this, 'styles')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
        saveGlobalSettings('styles');
    }
}

// Add test API function
async function testImageApi() {
    const elements = {
        testBtn: document.getElementById('test-image-api'),
        curlCommand: document.getElementById('image-curl-command'),
        requestPath: document.getElementById('image-request-path'),
        responsePath: document.getElementById('image-response-path'),
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

        const response = await window.adminUtils.makeApiRequest('/api/admin/image-apis/test', {
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

// Add edit API function
async function editImageApi(id, name) {
    try {
        const response = await window.adminUtils.makeApiRequest(`/api/admin/image-apis/${id}`);
        
        const formDiv = document.getElementById('image-api-form');
        const form = formDiv ? formDiv.querySelector('form') : null;
        const addButton = document.getElementById('add-image-api-btn');
        const formHeader = form.querySelector('.form-header h3');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Update form header and submit button
        formHeader.innerHTML = '<i class="fas fa-edit"></i> Update Image API';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update API';
        
        // Fill form fields
        document.getElementById('image-api-name').value = response.name;
        document.getElementById('image-curl-command').value = response.curlCommand;
        document.getElementById('image-request-path').value = response.requestPath;
        document.getElementById('image-response-path').value = response.responsePath || '';
        
        form.dataset.mode = 'edit';
        form.dataset.apiId = id;
        formDiv.style.display = 'block';
        addButton.style.display = 'none';
        
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Add delete API function
async function deleteImageApi(id, name) {
    if (!confirm(`Are you sure you want to delete image API "${name}"?`)) return;
    
    try {
        await window.adminUtils.makeApiRequest(`/api/admin/image-apis/${id}`, {
            method: 'DELETE'
        });
        
        showNotification('Image API deleted successfully', 'success');
        await loadImageApiList();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Add toggle API function
async function toggleImageApi(id, isActive) {
    try {
        await window.adminUtils.makeApiRequest(`/api/admin/image-apis/${id}/toggle`, {
            method: 'PATCH',
            body: { isActive }
        });
        
        showNotification(
            `Image API ${isActive ? 'activated' : 'deactivated'} successfully`, 
            'success'
        );
    } catch (err) {
        showNotification(err.message, 'error');
        const toggle = document.querySelector(`.api-toggle[data-id="${id}"]`);
        if (toggle) toggle.checked = !isActive;
    }
}

// Add event delegation for toggle switches
function initToggleHandlers() {
    const apiList = document.getElementById('image-api-list');
    if (!apiList) return;

    apiList.addEventListener('change', async (e) => {
        if (e.target.matches('.api-toggle')) {
            const toggle = e.target;
            const apiId = toggle.dataset.id;
            const isActive = toggle.checked;

            try {
                const response = await window.adminUtils.makeApiRequest(`/api/admin/image-apis/${apiId}/toggle`, {
                    method: 'PATCH',
                    body: { isActive }
                });

                showNotification(`API ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
                
                // Update UI to reflect new state
                const apiItem = toggle.closest('.api-item');
                if (apiItem) {
                    const statusIndicator = apiItem.querySelector('.api-status');
                    if (statusIndicator) {
                        statusIndicator.className = `api-status ${isActive ? 'active' : 'inactive'}`;
                    }
                }
            } catch (err) {
                console.error('Error toggling API:', err);
                // Revert toggle state on error
                toggle.checked = !isActive;
                showNotification(err.message || 'Failed to update API status', 'error');
            }
        }
    });
}

// Export required functions
window.loadImageApiList = loadImageApiList;
window.handleImageFormSubmit = handleImageFormSubmit;
window.initImageApiSection = initImageApiSection;
window.editSize = editSize;
window.editStyle = editStyle;
window.removeGlobalOption = removeGlobalOption;
window.saveGlobalSettings = saveGlobalSettings;
window.addGlobalOption = addGlobalOption;
window.testImageApi = testImageApi;
window.editImageApi = editImageApi;
window.deleteImageApi = deleteImageApi;
window.toggleImageApi = toggleImageApi;

