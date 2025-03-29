document.addEventListener('DOMContentLoaded', () => {
    initializeVoiceInterface();
});

function initializeVoiceInterface() {
    // Get elements
    const providerSelect = document.getElementById('voice-api-type');
    const voiceList = document.getElementById('voice-list');
    const addVoiceButton = document.getElementById('add-voice-btn');
    
    // Add single event handler for add voice button
    if (addVoiceButton) {
        addVoiceButton.addEventListener('click', (e) => {
            e.preventDefault();
            addVoiceEntry();
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

// Add new test API function
async function testVoiceApi() {
    const testBtn = document.getElementById('test-voice-api');
    const curlCommand = document.getElementById('voice-curl-command').value;
    const requestPath = document.getElementById('voice-request-path').value;
    const responsePath = document.getElementById('voice-response-path').value;
    const apiType = document.getElementById('voice-api-type').value;
    const responseType = document.getElementById('voice-response-type').value;
    const previewStatus = document.querySelector('#voice-api-form .preview-status');

    if (!curlCommand || !requestPath) {
        window.showNotification('cURL command and request path are required', 'error');
        return;
    }

    try {
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        previewStatus.textContent = 'Testing API...';

        const testData = {
            curlCommand,
            requestPath,
            responsePath,
            apiType,
            responseType,
            auth: apiType === 'hearing' ? {
                loginEndpoint: document.getElementById('auth-endpoint')?.value,
                tokenPath: document.getElementById('token-path')?.value,
                username: document.getElementById('auth-username')?.value,
                password: document.getElementById('auth-password')?.value
            } : null
        };

        const response = await fetch('/api/admin/voice/test', { // Change from /api/voice/test
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify(testData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        previewStatus.textContent = 'API Test Successful';
        previewStatus.style.color = 'var(--success-color)';
        window.showNotification('Voice API test successful', 'success');

    } catch (err) {
        console.error('Test API error:', err);
        previewStatus.textContent = 'API Test Failed';
        previewStatus.style.color = 'var(--error-color)';
        window.showNotification(err.message || 'Failed to test Voice API', 'error');
    } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = '<i class="fas fa-vial"></i> Test API';
        setTimeout(() => {
            if (previewStatus.textContent.includes('Testing')) {
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
