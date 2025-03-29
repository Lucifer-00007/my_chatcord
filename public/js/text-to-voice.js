document.addEventListener('DOMContentLoaded', () => {
    loadVoiceConfig().then(() => {
        initializeVoiceInterface();
    });
});

let VOICE_API_CONFIG = null;

async function loadVoiceConfig() {
    try {
        const response = await fetch('/api/admin/voice/config', {
            headers: {
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            }
        });
        VOICE_API_CONFIG = await response.json();
    } catch (err) {
        console.error('Failed to load voice config:', err);
        window.showNotification('Failed to load voice configuration', 'error');
    }
}

function initializeVoiceInterface() {
    console.log('Initializing voice interface');
    if (!VOICE_API_CONFIG) {
        console.error('Voice configuration not loaded');
        return;
    }

    // Get elements
    const providerSelect = document.getElementById('voice-api-type');
    const voiceList = document.getElementById('voice-list');
    const addVoiceButton = document.getElementById('add-voice-btn');
    const testButton = document.getElementById('test-voice-api');
    
    console.log('Found elements:', {
        providerSelect: !!providerSelect,
        voiceList: !!voiceList,
        addVoiceButton: !!addVoiceButton,
        testButton: !!testButton
    });

    // Add single event handler for add voice button
    if (addVoiceButton) {
        addVoiceButton.addEventListener('click', (e) => {
            e.preventDefault();
            addVoiceEntry();
        });
    }

    // Add direct event listener for test button
    if (testButton) {
        console.log('Adding test button listener');
        testButton.addEventListener('click', (e) => {
            console.log('Test button clicked');
            testVoiceApi(e);
        });
    }

    // Populate provider dropdown
    if (providerSelect) {
        Object.entries(VOICE_API_CONFIG.voiceProviders).forEach(([key, provider]) => {
            const option = new Option(provider.name, key);
            providerSelect.add(option);
        });

        // Add change event listener
        providerSelect.addEventListener('change', () => {
            const selectedProvider = VOICE_API_CONFIG.voiceProviders[providerSelect.value];
            updateVoiceList(selectedProvider);
        });
    }
}

function addVoiceEntry(voice = null) {
    const voiceList = document.getElementById('voice-list');
    if (!voiceList) return;

    const voiceId = `voice-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'voice-entry';
    div.innerHTML = `
        <div class="form-row">
            <div class="flex-1">
                <input type="text" id="${voiceId}-id" 
                       placeholder="Voice ID" class="form-input" 
                       value="${voice?.id || ''}" required>
            </div>
            <div class="flex-1">
                <input type="text" id="${voiceId}-name" 
                       placeholder="Display Name" class="form-input" 
                       value="${voice?.name || ''}" required>
            </div>
            <div class="flex-1">
                <select id="${voiceId}-gender" class="form-select">
                    ${VOICE_API_CONFIG.defaultVoiceTypes.map(type => `
                        <option value="${type.id}" 
                                ${voice?.gender === type.id ? 'selected' : ''}>
                            ${type.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="flex-1">
                <input type="text" id="${voiceId}-language" 
                       placeholder="Language Code" class="form-input" 
                       value="${voice?.language || 'en'}" required>
            </div>
            <button type="button" class="btn btn-icon btn-danger" onclick="removeVoiceEntry(this)" style="margin-top: 0px;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    voiceList.appendChild(div);
    return false; // Prevent form submission
}

function removeVoiceEntry(button) {
    const entry = button.closest('.voice-entry');
    if (entry) {
        entry.remove();
    }
}

function updateVoiceList(provider) {
    const voiceList = document.getElementById('voice-list');
    if (!voiceList) return;

    // Clear existing voices
    voiceList.innerHTML = '';

    // Add default voices for the selected provider
    if (provider.voices) {
        provider.voices.forEach(voice => {
            addVoiceEntry(voice);
        });
    }
}

// Function to collect voice entries data
function collectVoices() {
    return Array.from(document.querySelectorAll('.voice-entry')).map(entry => ({
        id: entry.querySelector('[id$="-id"]').value,
        name: entry.querySelector('[id$="-name"]').value,
        gender: entry.querySelector('[id$="-gender"]').value
    }));
}

// Update test API function
async function testVoiceApi(e) {
    e?.preventDefault();
    console.log('Test API function called');
    
    const elements = {
        testBtn: document.getElementById('test-voice-api'),
        form: document.getElementById('voice-api-form'),
        curlCommand: document.getElementById('voice-curl-command'),
        requestPath: document.getElementById('voice-request-path'),
        responsePath: document.getElementById('voice-response-path'),
        apiType: document.getElementById('voice-api-type'),
        responseType: document.getElementById('voice-response-type')
    };

    // Log found elements
    console.log('Found elements:', Object.fromEntries(
        Object.entries(elements).map(([k, v]) => [k, !!v])
    ));

    // Validate required elements
    if (!elements.testBtn || !elements.form) {
        console.error('Required elements not found for test');
        return;
    }

    // Get preview status element
    const previewStatus = elements.form.querySelector('.preview-status');
    if (!previewStatus) {
        console.error('Preview status element not found');
        return;
    }

    // Validate required fields
    if (!elements.curlCommand?.value || !elements.requestPath?.value) {
        window.showNotification('cURL command and request path are required', 'error');
        return;
    }

    try {
        elements.testBtn.disabled = true;
        elements.testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        previewStatus.textContent = 'Testing API...';

        const testData = {
            curlCommand: elements.curlCommand.value,
            requestPath: elements.requestPath.value,
            responsePath: elements.responsePath.value,
            apiType: elements.apiType.value,
            responseType: elements.responseType.value,
            auth: elements.apiType.value === 'hearing' ? {
                loginEndpoint: document.getElementById('auth-endpoint')?.value,
                tokenPath: document.getElementById('token-path')?.value,
                username: document.getElementById('auth-username')?.value,
                password: document.getElementById('auth-password')?.value
            } : null
        };

        console.log('Sending test request to server...', {
            endpoint: '/api/admin/voice/test',
            dataKeys: Object.keys(testData)
        });

        const response = await fetch('/api/admin/voice/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify(testData)
        });

        console.log('Received response:', {
            status: response.status,
            ok: response.ok
        });

        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        previewStatus.textContent = 'API Test Successful';
        previewStatus.style.color = 'var(--success-color)';
        window.showNotification('Voice API test successful', 'success');

    } catch (err) {
        console.error('Test API error:', {
            message: err.message,
            stack: err.stack
        });
        previewStatus.textContent = 'API Test Failed';
        previewStatus.style.color = 'var(--error-color)';
        window.showNotification(err.message || 'Failed to test Voice API', 'error');
    } finally {
        console.log('Test completed, resetting button state');
        if (elements.testBtn) {
            elements.testBtn.disabled = false;
            elements.testBtn.innerHTML = '<i class="fas fa-vial"></i> Test API';
        }
        setTimeout(() => {
            if (previewStatus?.textContent.includes('Testing')) {
                previewStatus.textContent = '';
            }
        }, 3000);
    }
}

// Export functions needed by admin.js
window.addVoiceEntry = addVoiceEntry;
window.removeVoiceEntry = removeVoiceEntry;
window.collectVoices = collectVoices;
window.testVoiceApi = testVoiceApi;
