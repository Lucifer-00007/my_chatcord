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

function validateAudioBlob(blob) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(blob);
        
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(objectUrl);
            if (audio.duration === Infinity || isNaN(audio.duration)) {
                reject(new Error('Invalid audio duration'));
                return;
            }
            resolve(true);
        };

        audio.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Audio loading failed: ${audio.error?.message || 'Unknown error'}`));
        };

        audio.preload = 'metadata';
        audio.src = objectUrl;

        // Add timeout for loading
        setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Audio loading timed out'));
        }, 10000);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        loadVoiceConfig(),
        loadVoiceApis()
    ]).then(() => {
        initializeVoiceInterface();
    });
});

let VOICE_API_CONFIG = null;
let VOICE_APIS = [];

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
        showNotification('Failed to load voice configuration', 'error');
    }
}

async function loadVoiceApis() {
    try {
        // Get all voice APIs from the server
        const response = await fetch('/api/admin/voice', {
            headers: {
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            }
        });
        const apis = await response.json();

        // Filter active APIs
        VOICE_APIS = apis.filter(api => api.isActive);
        console.log('Loaded voice APIs:', VOICE_APIS);
    } catch (err) {
        console.error('Failed to load voice APIs:', err);
        showNotification('Failed to load voice APIs', 'error');
    }
}

function initializeVoiceInterface() {
    console.log('Initializing voice interface');
    if (!VOICE_API_CONFIG) {
        console.error('Voice configuration not loaded');
        return;
    }

    // Get elements for the user interface
    const modelSelect = document.getElementById('model-select');
    const voiceSelection = document.getElementById('voice-selection');
    const voiceLanguage = document.getElementById('voice-language');
    const previewBtn = document.getElementById('preview-btn');
    const generateBtn = document.getElementById('generate-voice-btn');
    const voiceText = document.getElementById('voice-text');
    const charCount = document.getElementById('char-count');

    // Initialize character counter
    if (voiceText && charCount) {
        voiceText.addEventListener('input', () => {
            charCount.textContent = voiceText.value.length;
        });
    }

    // Initialize sliders
    const voiceSpeed = document.getElementById('voice-speed');
    const voicePitch = document.getElementById('voice-pitch');

    if (voiceSpeed) {
        voiceSpeed.addEventListener('input', () => {
            const valueDisplay = voiceSpeed.parentElement.querySelector('.value');
            if (valueDisplay) {
                valueDisplay.textContent = `${voiceSpeed.value}x`;
            }
        });
    }

    if (voicePitch) {
        voicePitch.addEventListener('input', () => {
            const valueDisplay = voicePitch.parentElement.querySelector('.value');
            if (valueDisplay) {
                valueDisplay.textContent = voicePitch.value;
            }
        });
    }

    // Populate model dropdown
    if (modelSelect) {
        if (VOICE_APIS.length > 0) {
            modelSelect.innerHTML = `
                <option value="">Select Voice Model</option>
                ${VOICE_APIS.map(api => `
                    <option value="${api._id}">${api.name}</option>
                `).join('')}
            `;

            // Enable buttons if we have APIs
            if (previewBtn) previewBtn.disabled = !modelSelect.value;
            if (generateBtn) generateBtn.disabled = !modelSelect.value;
        } else {
            modelSelect.innerHTML = '<option value="">No Voice Models Available</option>';
            if (previewBtn) previewBtn.disabled = true;
            if (generateBtn) generateBtn.disabled = true;
        }

        // Add change event listener for model select
        modelSelect.addEventListener('change', () => {
            updateVoiceSelectionForModel(modelSelect.value);

            // Enable/disable buttons based on selection
            const hasSelection = !!modelSelect.value;
            if (previewBtn) previewBtn.disabled = !hasSelection;
            if (generateBtn) generateBtn.disabled = !hasSelection;
        });
    }

    // Add change event listener for voice selection
    if (voiceSelection) {
        voiceSelection.addEventListener('change', () => {
            updateLanguageDisplay();
        });
    }

    // Add event listeners for preview and generate buttons
    if (previewBtn) {
        previewBtn.addEventListener('click', previewVoice);
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', generateVoiceFile);
    }
}

// Function to update voice selection dropdown based on selected model
function updateVoiceSelectionForModel(modelId) {
    const voiceSelection = document.getElementById('voice-selection');
    if (!voiceSelection) return;

    // Clear current options
    voiceSelection.innerHTML = '';

    if (!modelId) {
        voiceSelection.innerHTML = '<option value="">Select a model first</option>';
        return;
    }

    // Find the selected API
    const selectedApi = VOICE_APIS.find(api => api._id === modelId);
    if (!selectedApi || !selectedApi.supportedVoices || selectedApi.supportedVoices.length === 0) {
        voiceSelection.innerHTML = '<option value="">No voices available</option>';
        return;
    }

    // Add voices from the selected API
    selectedApi.supportedVoices.forEach(voice => {
        if (voice.isActive !== false) { // Include voice if it's active or if isActive is not specified
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = `${voice.name} (${voice.gender})`;
            option.dataset.language = voice.language;
            voiceSelection.appendChild(option);
        }
    });

    // Trigger change event to update language display
    voiceSelection.dispatchEvent(new Event('change'));
}

// Function to update language display based on selected voice
function updateLanguageDisplay() {
    const voiceSelection = document.getElementById('voice-selection');
    const languageDisplay = document.getElementById('voice-language');
    if (!voiceSelection || !languageDisplay) return;

    const selectedOption = voiceSelection.options[voiceSelection.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        languageDisplay.textContent = 'Select a voice';
        return;
    }

    // Get language from the data attribute
    const language = selectedOption.dataset.language;

    // Map language code to a more readable format
    const languageMap = {
        'en': 'English',
        'en-US': 'English (US)',
        'en-GB': 'English (UK)',
        'es': 'Spanish',
        'es-ES': 'Spanish (Spain)',
        'fr': 'French',
        'fr-FR': 'French (France)',
        'de': 'German',
        'de-DE': 'German (Germany)',
        'it': 'Italian',
        'it-IT': 'Italian (Italy)',
        'ja': 'Japanese',
        'ko': 'Korean',
        'pt': 'Portuguese',
        'pt-BR': 'Portuguese (Brazil)',
        'ru': 'Russian',
        'zh': 'Chinese',
        'zh-CN': 'Chinese (Mandarin)',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'nl': 'Dutch',
        'pl': 'Polish',
        'tr': 'Turkish'
    };

    languageDisplay.textContent = languageMap[language] || language || 'Unknown';
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
        showNotification('cURL command and request path are required', 'error');
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
        showNotification('Voice API test successful', 'success');

    } catch (err) {
        console.error('Test API error:', {
            message: err.message,
            stack: err.stack
        });
        previewStatus.textContent = 'API Test Failed';
        previewStatus.style.color = 'var(--error-color)';
        showNotification(err.message || 'Failed to test Voice API', 'error');
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

// Function to add a new voice entry to the form
function addVoiceEntry() {
    const voicesContainer = document.getElementById('voice-entries-container');
    if (!voicesContainer) return;

    const entryId = Date.now(); // Use timestamp as unique ID
    const newEntry = document.createElement('div');
    newEntry.className = 'voice-entry';
    newEntry.dataset.id = entryId;

    newEntry.innerHTML = `
        <div class="entry-fields">
            <div class="form-group">
                <label for="voice-id-${entryId}">Voice ID</label>
                <input type="text" id="voice-id-${entryId}" class="voice-id" required>
            </div>
            <div class="form-group">
                <label for="voice-name-${entryId}">Voice Name</label>
                <input type="text" id="voice-name-${entryId}" class="voice-name" required>
            </div>
            <div class="form-group">
                <label for="voice-gender-${entryId}">Gender</label>
                <select id="voice-gender-${entryId}" class="voice-gender">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="neutral">Neutral</option>
                </select>
            </div>
            <div class="form-group">
                <label for="voice-language-${entryId}">Language</label>
                <input type="text" id="voice-language-${entryId}" class="voice-language" placeholder="en-US" required>
            </div>
        </div>
        <button type="button" class="btn btn-icon btn-danger remove-voice" onclick="removeVoiceEntry(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;

    voicesContainer.appendChild(newEntry);
}

// Function to remove a voice entry from the form
function removeVoiceEntry(button) {
    const entry = button.closest('.voice-entry');
    if (entry) {
        entry.remove();
    }
}

// Function to collect all voice entries from the form
function collectVoices() {
    const entries = document.querySelectorAll('.voice-entry');
    const voices = [];

    entries.forEach(entry => {
        const id = entry.querySelector('.voice-id').value.trim();
        const name = entry.querySelector('.voice-name').value.trim();
        const gender = entry.querySelector('.voice-gender').value;
        const language = entry.querySelector('.voice-language').value.trim();

        if (id && name && language) {
            voices.push({
                id,
                name,
                gender,
                language
            });
        }
    });

    return voices;
}

// Function to generate voice audio
async function generateVoiceAudio(preview = false) {
    console.log('Generate voice audio function called');

    // Get all required elements at the start
    const elements = {
        modelSelect: document.getElementById('model-select'),
        voiceSelection: document.getElementById('voice-selection'),
        voiceText: document.getElementById('voice-text'),
        voiceSpeed: document.getElementById('voice-speed'),
        voicePitch: document.getElementById('voice-pitch'),
        audioPlayer: document.getElementById('audio-player'),
        loadingIndicator: document.getElementById('voice-loading'),
        audioResult: document.getElementById('audio-result'),
        downloadSection: document.getElementById('download-section'),
        generateBtn: document.getElementById('generate-voice-btn')
    };

    try {
        if (!await validateInputs()) {
            return;
        }

        // Show loading indicator and disable generate button
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'flex';
        if (elements.generateBtn) elements.generateBtn.disabled = true;
        if (elements.audioResult) elements.audioResult.style.display = 'none';
        if (elements.downloadSection) elements.downloadSection.style.display = 'none';

        // Prepare request data using elements object
        const requestData = {
            apiId: elements.modelSelect.value,
            voice: elements.voiceSelection.value,
            text: elements.voiceText.value.trim(),
            speed: elements.voiceSpeed ? parseFloat(elements.voiceSpeed.value) : 1.0,
            pitch: elements.voicePitch ? parseFloat(elements.voicePitch.value) : 1.0,
            preview: preview
        };

        console.log('Sending preview request:', requestData);

        // Send request to server
        const response = await fetch('/api/voice/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Get content type from response headers
        const contentType = response.headers.get('Content-Type');
        
        // Handle different response types
        let audioBlob;
        let audioType = 'audio/mpeg'; // Set default audio type
        
        if (contentType.includes('audio/')) {
            audioType = contentType;
            const arrayBuffer = await response.arrayBuffer();
            audioBlob = new Blob([arrayBuffer], { type: audioType });
        } else if (contentType.includes('application/json')) {
            const data = await response.json();
            if (data.audioUrl) {
                const audioRes = await fetch(data.audioUrl);
                audioType = audioRes.headers.get('Content-Type') || 'audio/mpeg';
                const arrayBuffer = await audioRes.arrayBuffer();
                audioBlob = new Blob([arrayBuffer], { type: audioType });
            } else if (data.audioData) {
                const binaryData = atob(data.audioData);
                const bytes = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                    bytes[i] = binaryData.charCodeAt(i);
                }
                audioBlob = new Blob([bytes], { type: audioType });
            } else {
                throw new Error('No audio data in response');
            }
        } else {
            throw new Error(`Unsupported response type: ${contentType}`);
        }

        await validateAudioBlob(audioBlob);
        const audioSource = URL.createObjectURL(audioBlob);

        // Create simple audio player without metadata
        if (elements.audioPlayer) {
            elements.audioPlayer.innerHTML = `
                <audio controls autoplay>
                    <source src="${audioSource}" type="${audioType}">
                    Your browser does not support the audio element.
                </audio>
            `;
        }

        // Show audio result and enable download
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'none';
        if (elements.audioResult) elements.audioResult.style.display = 'block';
        if (elements.downloadSection) {
            elements.downloadSection.style.display = 'block';
            elements.downloadSection.innerHTML = `
                <button class="btn btn-download" onclick="downloadAudio('${audioSource}', 'mp3')">
                    <i class="fas fa-download"></i> Download MP3
                </button>
            `;
        }

        // Re-enable generate button
        if (elements.generateBtn) elements.generateBtn.disabled = false;

    } catch (err) {
        console.error('Preview voice error:', err);
        showNotification(err.message || 'Failed to preview voice', 'error');

        // Reset UI state on error
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'none';
        if (elements.generateBtn) elements.generateBtn.disabled = false;
        if (elements.downloadSection) elements.downloadSection.style.display = 'none';
    }
}

// Function to handle generate button click
async function generateVoiceFile(e) {
    e?.preventDefault();
    await generateVoiceAudio(false);
}

// Function to handle preview button click
async function previewVoice(e) {
    e?.preventDefault();
    await generateVoiceAudio(true);
}

async function validateInputs() {
    const modelSelect = document.getElementById('model-select');
    const voiceSelection = document.getElementById('voice-selection');
    const voiceText = document.getElementById('voice-text');

    if (!modelSelect?.value) {
        showNotification('Please select a voice model', 'warning');
        return false;
    }

    if (!voiceSelection?.value) {
        showNotification('Please select a voice', 'warning');
        return false;
    }

    if (!voiceText?.value.trim()) {
        showNotification('Please enter some text to convert', 'warning');
        return false;
    }

    return true;
}

async function generateVoiceRequest() {
    try {
        // Disable generate button and show loading indicator
        const generateBtn = document.getElementById('generate-voice-btn');
        if (generateBtn) generateBtn.disabled = true;
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (audioResult) audioResult.style.display = 'none';
        if (downloadSection) downloadSection.style.display = 'none';

        // Prepare request data
        const requestData = {
            apiId: modelSelect.value,
            voice: voiceSelection.value,
            text: voiceText.value.trim(),
            speed: voiceSpeed ? parseFloat(voiceSpeed.value) : 1.0,
            pitch: voicePitch ? parseFloat(voicePitch.value) : 1.0,
            preview: preview
        };

        console.log('Sending generate request:', requestData);

        // Send request to server
        const response = await fetch('/api/voice/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Handle response
        const audioArrayBuffer = await response.arrayBuffer();
        const audioType = response.headers.get('Content-Type') || 'audio/mpeg';
        const blob = new Blob([audioArrayBuffer], { type: audioType });
        
        // Validate the audio blob before creating URL
        try {
            await validateAudioBlob(blob);
        } catch (err) {
            notify(`Audio validation failed: ${err.message}`, 'error');
            throw err;
        }
        
        const audioSource = URL.createObjectURL(blob);

        // Create a temporary audio element to get duration
        const tempAudio = new Audio();
        tempAudio.preload = 'metadata';
        tempAudio.src = audioSource;
        await new Promise((resolve) => {
            tempAudio.addEventListener('loadedmetadata', () => {
                resolve();
            });
        });

        const duration = Math.round(tempAudio.duration);

        // Create audio player with enhanced UI
        if (audioPlayer) {
            const selectedVoice = voiceSelection.options[voiceSelection.selectedIndex].text;
            audioPlayer.innerHTML = `
                <audio controls autoplay>
                    <source src="${audioSource}" type="${audioType}">
                    Your browser does not support the audio element.
                </audio>
                <div class="audio-info">
                    <div class="audio-title">${voiceText.value.substring(0, 30)}${voiceText.value.length > 30 ? '...' : ''}</div>
                    <div class="audio-meta">
                        <span><i class="fas fa-clock"></i> ${duration} sec</span>
                        <span><i class="fas fa-microphone-alt"></i> ${selectedVoice}</span>
                    </div>
                </div>
            `;
        }

        // Show audio result
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (audioResult) audioResult.style.display = 'block';

        // Update download buttons
        const downloadSection = document.getElementById('download-section');
        if (downloadSection) {
            downloadSection.innerHTML = `
                <button class="btn btn-download" onclick="downloadAudio('${audioSource}', 'mp3')">
                    <i class="fas fa-download"></i> Download MP3
                </button>
            `;
        }

        // Add to history
        if (responseData && typeof responseData === 'object') {
            addToVoiceHistory({
                id: responseData.id || 'voice-' + Date.now(),
                text: voiceText.value.substring(0, 30) + (voiceText.value.length > 30 ? '...' : ''),
                voiceName: responseData.voiceName || voiceSelection.options[voiceSelection.selectedIndex].textContent,
                audioUrl: responseData.audioUrl || audioSource,
                wavUrl: responseData.wavUrl || null,
                timestamp: new Date().toISOString()
            });
        }

    } catch (err) {
        console.error('Generate voice error:', err);
        showNotification(err.message || 'Failed to generate voice file', 'error');

        // Hide loading indicator and re-enable generate button
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        const generateBtn = document.getElementById('generate-voice-btn');
        if (generateBtn) generateBtn.disabled = false;
        if (downloadSection) downloadSection.style.display = 'none';
    }


    // Function to download audio file
    function downloadAudio(url, format) {
        if (!url) {
            showNotification('Download URL not available', 'error');
            return;
        }

        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-${new Date().getTime()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Function to add entry to voice history
    function addToVoiceHistory(entry) {
        const historyList = document.getElementById('voice-history');
        if (!historyList) return;

        // Get existing history from localStorage
        let history = JSON.parse(localStorage.getItem('voiceHistory') || '[]');

        // Add new entry to the beginning
        history.unshift(entry);

        // Keep only the last 10 entries
        history = history.slice(0, 10);

        // Save to localStorage
        localStorage.setItem('voiceHistory', JSON.stringify(history));

        // Update UI
        updateVoiceHistory();
    }

    // Function to update voice history UI
    function updateVoiceHistory() {
        const historyList = document.getElementById('voice-history');
        if (!historyList) return;

        // Get history from localStorage
        const history = JSON.parse(localStorage.getItem('voiceHistory') || '[]');

        if (history.length === 0) {
            historyList.innerHTML = '<li class="empty-history">No recent conversions</li>';
            return;
        }

        // Update UI
        historyList.innerHTML = history.map(entry => `
        <li class="history-item" data-id="${entry.id}">
            <div class="history-text">${entry.text}</div>
            <div class="history-meta">
                <span class="history-voice">${entry.voiceName}</span>
                <span class="history-time">${formatTimestamp(entry.timestamp)}</span>
            </div>
            <div class="history-actions">
                <button class="btn btn-icon" onclick="playHistoryAudio('${entry.audioUrl}')">
                    <i class="fas fa-play"></i>
                </button>
                <button class="btn btn-icon" onclick="downloadAudio('${entry.audioUrl}', 'mp3')">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        </li>
    `).join('');
    }

    // Function to play audio from history
    function playHistoryAudio(url) {
        if (!url) {
            showNotification('Audio URL not available', 'error');
            return;
        }

        const audioPlayer = document.getElementById('audio-player');
        const audioResult = document.getElementById('audio-result');

        if (audioPlayer) {
            audioPlayer.innerHTML = `
            <audio controls autoplay>
                <source src="${url}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        `;
        }

        if (audioResult) audioResult.style.display = 'block';
    }

    // Helper function to format timestamp
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();

        // If today, show time only
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Otherwise show date
        return date.toLocaleDateString();
    }

    // Export functions needed by admin.js
    window.addVoiceEntry = addVoiceEntry;
    window.removeVoiceEntry = removeVoiceEntry;
    window.collectVoices = collectVoices;
    window.testVoiceApi = testVoiceApi;

    // Export functions for voice history
    window.downloadAudio = downloadAudio;
    window.playHistoryAudio = playHistoryAudio;

    // Add notification function
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
}
