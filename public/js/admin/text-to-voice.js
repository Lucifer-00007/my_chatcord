async function initializeVoiceForm() {
    const voiceElements = {
        form: document.getElementById('voice-api-form'),
        addButton: document.getElementById('add-voice-api-btn'),
        closeButton: document.getElementById('close-voice-form'),
        apiTypeSelect: document.getElementById('voice-api-type'),
        authSection: document.getElementById('auth-section'),
        testButton: document.getElementById('test-voice-api')
    };

    if (!voiceElements.form || !voiceElements.addButton) return;

    // Log found elements
    console.log('Voice form elements:', {
        hasForm: !!voiceElements.form,
        hasAddButton: !!voiceElements.addButton,
        hasCloseButton: !!voiceElements.closeButton,
        hasApiTypeSelect: !!voiceElements.apiTypeSelect,
        hasAuthSection: !!voiceElements.authSection,
        hasTestButton: !!voiceElements.testButton
    });

    // Add initial load of voice settings
    await Promise.all([
        loadVoiceSettings('speed'),
        loadVoiceSettings('pitch'),
        loadVoiceApiList()
    ]);

    // Show/Hide form handlers
    voiceElements.addButton.addEventListener('click', () => {
        voiceElements.form.style.display = 'block';
        voiceElements.addButton.style.display = 'none';
    });

    if (voiceElements.closeButton) {
        voiceElements.closeButton.addEventListener('click', () => {
            if (voiceElements.form instanceof HTMLFormElement) {
                voiceElements.form.reset();
            } else {
                // Manual reset
                Array.from(voiceElements.form.querySelectorAll('input, textarea, select')).forEach(input => {
                    input.value = '';
                });
            }
            voiceElements.form.style.display = 'none';
            voiceElements.addButton.style.display = 'block';
        });
    }

    // Add voice button click handler
    const addVoiceBtn = document.getElementById('add-voice-btn');
    if (addVoiceBtn) {
        addVoiceBtn.onclick = addVoiceEntry;
    }

    // Form submission handling
    voiceElements.form.addEventListener('submit', handleVoiceFormSubmit);

    // API type change handler
    if (voiceElements.apiTypeSelect && voiceElements.authSection) {
        voiceElements.apiTypeSelect.addEventListener('change', handleApiTypeChange);
    }

    // Add test button handler
    if (voiceElements.testButton) {
        voiceElements.testButton.addEventListener('click', testVoiceApi);
    }
}

// Fix loadVoiceApiList function
async function loadVoiceApiList() {
    const voiceApiList = document.getElementById('voice-api-list');
    const apiCount = document.querySelector('.voice-api-count');
    
    try {
        voiceApiList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading Voice APIs...</div>';
        
        const apis = await window.adminUtils.makeApiRequest('/api/admin/voice');
        
        apiCount.textContent = `${apis.length} API${apis.length !== 1 ? 's' : ''}`;
        
        if (!apis.length) {
            voiceApiList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-microphone-alt"></i>
                    <p>No Voice APIs configured yet</p>
                    <p class="hint">Click "Add New API" to get started</p>
                </div>
            `;
            return;
        }

        voiceApiList.innerHTML = apis.map(api => `
            <div class="api-item" data-id="${api._id}" data-name="${api.name}">
                <div class="api-details">
                    <div class="api-name">
                        <span class="api-status ${api.isActive ? 'active' : 'inactive'}"></span>
                        ${api.name}
                    </div>
                    <div class="api-paths">
                        <small>Type: ${api.apiType}</small> | 
                        <small>Voices: ${api.supportedVoices?.length || 0}</small>
                    </div>
                </div>
                <div class="api-controls">
                    <label class="toggle-switch">
                        <input type="checkbox" class="api-toggle" data-id="${api._id}" 
                               ${api.isActive ? 'checked' : ''} onclick="toggleVoiceApi('${api._id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="btn btn-icon edit-api" data-id="${api._id}" onclick="editVoiceApi('${api._id}', '${api.name}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger delete-api" data-id="${api._id}" onclick="deleteVoiceApi('${api._id}', '${api.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading Voice APIs:', err);
        voiceApiList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load Voice APIs</p>
                <button onclick="loadVoiceApiList()" class="btn btn-retry">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// Add voice form submission handler
async function handleVoiceFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const isEditing = form.dataset.mode === 'edit';
    const apiId = form.dataset.apiId;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const formData = {
            name: document.getElementById('voice-api-name').value.trim(),
            apiType: document.getElementById('voice-api-type').value,
            responseType: document.getElementById('voice-response-type').value,
            curlCommand: document.getElementById('voice-curl-command').value,
            requestPath: document.getElementById('voice-request-path').value,
            responsePath: document.getElementById('voice-response-path').value,
            method: 'POST', // Force POST method
            supportedVoices: collectVoices()
        };

        // Add auth data if needed
        if (formData.apiType === 'hearing') {
            formData.auth = {
                loginEndpoint: document.getElementById('auth-endpoint').value,
                tokenPath: document.getElementById('token-path').value,
                credentials: {
                    username: document.getElementById('auth-username').value,
                    password: document.getElementById('auth-password').value
                }
            };
        }

        if (!formData.name || !formData.apiType || !formData.curlCommand || !formData.requestPath) {
            throw new Error('Name, API type, cURL command, and request path are required');
        }

        // Handle create vs update
        const endpoint = isEditing ? 
            `/api/admin/voice/${apiId}` : 
            '/api/admin/voice';

        const res = await window.adminUtils.makeApiRequest(endpoint, {
            method: isEditing ? 'PUT' : 'POST',
            body: formData
        });

        showNotification(`Voice API ${isEditing ? 'updated' : 'saved'} successfully`, 'success');
        resetVoiceForm();
        await loadVoiceApiList();

    } catch (err) {
        console.error('Error saving voice API:', err);
        showNotification(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-save"></i> ${isEditing ? 'Update' : 'Save'} API`;
    }
}

// Add API type change handler
function handleApiTypeChange(e) {
    const authSection = document.getElementById('auth-section');
    if (authSection) {
        authSection.style.display = e.target.value === 'hearing' ? 'block' : 'none';
    }
}

// Add this function before the export statements
function addVoiceEntry(voiceData = null) {
    const voicesContainer = document.getElementById('voice-entries-container');
    if (!voicesContainer) return;

    const entryId = Date.now(); // Use timestamp as unique ID
    const newEntry = document.createElement('div');
    newEntry.className = 'voice-entry';
    newEntry.innerHTML = `
        <div class="entry-fields">
            <div class="form-group">
                <label for="voice-id-${entryId}">Voice ID</label>
                <input type="text" id="voice-id-${entryId}" class="form-input voice-id" value="${voiceData?.id || ''}" required>
            </div>
            <div class="form-group">
                <label for="voice-name-${entryId}">Voice Name</label>
                <input type="text" id="voice-name-${entryId}" class="form-input voice-name" value="${voiceData?.name || ''}" required>
            </div>
            <div class="form-group">
                <label for="voice-gender-${entryId}">Gender</label>
                <select id="voice-gender-${entryId}" class="form-select voice-gender">
                    <option value="male" ${voiceData?.gender === 'male' ? 'selected' : ''}>Male</option>
                    <option value="female" ${voiceData?.gender === 'female' ? 'selected' : ''}>Female</option>
                    <option value="neutral" ${voiceData?.gender === 'neutral' ? 'selected' : ''}>Neutral</option>
                </select>
            </div>
            <div class="form-group">
                <label for="voice-language-${entryId}">Language</label>
                <input type="text" id="voice-language-${entryId}" class="form-input voice-language" 
                       value="${voiceData?.language || ''}" placeholder="en-US" required>
            </div>
        </div>
        <button type="button" class="btn btn-icon btn-danger remove-voice" onclick="removeVoiceEntry(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;

    voicesContainer.appendChild(newEntry);
}

function collectVoices() {
    const entries = document.querySelectorAll('.voice-entry');
    return Array.from(entries).map(entry => ({
        id: entry.querySelector('.voice-id').value.trim(),
        name: entry.querySelector('.voice-name').value.trim(),
        gender: entry.querySelector('.voice-gender').value,
        language: entry.querySelector('.voice-language').value.trim()
    })).filter(voice => voice.id && voice.name && voice.language);
}

// Add test API function
async function testVoiceApi() {
    const elements = {
        testBtn: document.getElementById('test-voice-api'),
        curlCommand: document.getElementById('voice-curl-command'),
        requestPath: document.getElementById('voice-request-path'),
        responsePath: document.getElementById('voice-response-path'),
        apiType: document.getElementById('voice-api-type'),
        responseType: document.getElementById('voice-response-type'),
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

        const testData = {
            curlCommand: elements.curlCommand.value,
            requestPath: elements.requestPath.value,
            responsePath: elements.responsePath?.value,
            apiType: elements.apiType.value,
            responseType: elements.responseType.value
        };

        // Add auth data if needed
        if (elements.apiType.value === 'hearing') {
            testData.auth = {
                loginEndpoint: document.getElementById('auth-endpoint')?.value,
                tokenPath: document.getElementById('token-path')?.value,
                credentials: {
                    username: document.getElementById('auth-username')?.value,
                    password: document.getElementById('auth-password')?.value
                }
            };
        }

        const response = await window.adminUtils.makeApiRequest('/api/admin/voice/test', {
            method: 'POST',
            body: testData
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
async function editVoiceApi(id, name) {
    try {
        const response = await window.adminUtils.makeApiRequest(`/api/admin/voice/${id}`);
        
        const form = document.getElementById('voice-api-form');
        const addButton = document.getElementById('add-voice-api-btn');
        const formHeader = form.querySelector('.form-header h3');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Update form header and submit button
        formHeader.innerHTML = '<i class="fas fa-edit"></i> Update Voice API';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update API';
        
        // Fill form fields
        document.getElementById('voice-api-name').value = response.name;
        document.getElementById('voice-api-type').value = response.apiType || 'direct';
        document.getElementById('voice-response-type').value = response.responseType || 'binary';
        document.getElementById('voice-curl-command').value = response.curlCommand;
        document.getElementById('voice-request-path').value = response.requestPath;
        document.getElementById('voice-response-path').value = response.responsePath || '';
        
        // Set method and handle parameter section
        const methodSelect = document.getElementById('voice-api-method');
        methodSelect.value = response.method || 'POST';
        const paramSection = document.getElementById('voice-param-section');
        paramSection.style.display = response.method === 'GET' ? 'block' : 'none';

        if (response.method === 'GET') {
            document.getElementById('voice-param').value = response.responsePath || '';
        }
        
        // Handle auth section
        const authSection = document.getElementById('auth-section');
        if (response.apiType === 'hearing' && authSection) {
            authSection.style.display = 'block';
            if (response.auth) {
                document.getElementById('auth-endpoint').value = response.auth.loginEndpoint || '';
                document.getElementById('token-path').value = response.auth.tokenPath || '';
                document.getElementById('auth-username').value = response.auth.credentials?.username || '';
                document.getElementById('auth-password').value = response.auth.credentials?.password || '';
            }
        } else if (authSection) {
            authSection.style.display = 'none';
        }
        
        // Clear and populate voice entries
        const voicesContainer = document.getElementById('voice-entries-container');
        voicesContainer.innerHTML = '';
        response.supportedVoices?.forEach(voice => {
            addVoiceEntry(voice);
        });
        
        form.dataset.mode = 'edit';
        form.dataset.apiId = id;
        form.style.display = 'block';
        addButton.style.display = 'none';
        
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Add delete API function
async function deleteVoiceApi(id, name) {
    if (!confirm(`Are you sure you want to delete voice API "${name}"?`)) return;
    
    try {
        await window.adminUtils.makeApiRequest(`/api/admin/voice/${id}`, {
            method: 'DELETE'
        });
        
        showNotification('Voice API deleted successfully', 'success');
        await loadVoiceApiList();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Add toggle API function
async function toggleVoiceApi(id, isActive) {
    try {
        await window.adminUtils.makeApiRequest(`/api/admin/voice/${id}/toggle`, {
            method: 'PATCH',
            body: { isActive }
        });
        
        showNotification(
            `Voice API ${isActive ? 'activated' : 'deactivated'} successfully`, 
            'success'
        );
    } catch (err) {
        showNotification(err.message, 'error');
        const toggle = document.querySelector(`.api-toggle[data-id="${id}"]`);
        if (toggle) toggle.checked = !isActive;
    }
}

// Add form reset handler
function resetVoiceForm() {
    const form = document.getElementById('voice-api-form');
    const formHeader = form.querySelector('.form-header h3');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    formHeader.innerHTML = '<i class="fas fa-plus"></i> Add New Voice API';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save API';
    form.dataset.mode = 'add';
    delete form.dataset.apiId;
    form.reset();
    
    // Clear voice entries
    document.getElementById('voice-entries-container').innerHTML = '';
    
    // Reset auth section
    document.getElementById('auth-section').style.display = 'none';
    
    form.style.display = 'none';
    document.getElementById('add-voice-api-btn').style.display = 'block';
}

// Add saveVoiceSettings function
async function saveVoiceSettings(type) {
    try {
        const range = {
            min: parseFloat(document.getElementById(`${type}-min`).value),
            max: parseFloat(document.getElementById(`${type}-max`).value),
            default: parseFloat(document.getElementById(`${type}-default`).value),
            step: parseFloat(document.getElementById(`${type}-step`).value)
        };

        // Validate values
        if (Object.values(range).some(isNaN)) {
            throw new Error('All values must be numbers');
        }

        if (range.min >= range.max) {
            throw new Error('Minimum value must be less than maximum value');
        }

        if (range.default < range.min || range.default > range.max) {
            throw new Error('Default value must be between min and max');
        }

        if (range.step <= 0) {
            throw new Error('Step must be greater than 0');
        }

        const response = await window.adminUtils.makeApiRequest(`/api/admin/voice-settings/${type}`, {
            method: 'PUT',
            body: { range }
        });

        showNotification(`${type} settings saved successfully`, 'success');
    } catch (err) {
        console.error(`Error saving ${type} settings:`, err);
        showNotification(err.message, 'error');
    }
}

// Add function to load voice settings
async function loadVoiceSettings(type) {
    try {
        console.log(`Loading ${type} settings...`);
        const response = await window.adminUtils.makeApiRequest(`/api/admin/voice-settings/${type}`);
        
        if (response && response.range) {
            document.getElementById(`${type}-min`).value = response.range.min;
            document.getElementById(`${type}-max`).value = response.range.max;
            document.getElementById(`${type}-default`).value = response.range.default;
            document.getElementById(`${type}-step`).value = response.range.step;
        } else {
            console.warn(`No ${type} settings found`);
        }
    } catch (err) {
        console.error(`Error loading ${type} settings:`, err);
        showNotification(`Failed to load ${type} settings: ${err.message}`, 'error');
    }
}

// Export functions
window.initializeVoiceForm = initializeVoiceForm;
window.addVoiceEntry = addVoiceEntry;
window.removeVoiceEntry = function(button) {
    const entry = button.closest('.voice-entry');
    if (entry) {
        entry.remove();
        console.log('Voice entry removed');
    }
};

// Export additional functions
window.loadVoiceApiList = loadVoiceApiList;
window.editVoiceApi = editVoiceApi;
window.deleteVoiceApi = deleteVoiceApi;
window.toggleVoiceApi = toggleVoiceApi;
window.saveVoiceSettings = saveVoiceSettings;
window.loadVoiceSettings = loadVoiceSettings;
