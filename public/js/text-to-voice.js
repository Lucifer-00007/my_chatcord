document.addEventListener('DOMContentLoaded', () => {
    initializeVoiceInterface();
});

function initializeVoiceInterface() {
    // Get elements
    const providerSelect = document.getElementById('voice-api-type');
    const langSelect = document.getElementById('supported-languages');
    const voiceList = document.getElementById('voice-list');
    
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

    // Populate supported languages
    if (langSelect) {
        VOICE_API_CONFIG.supportedLanguages.forEach(lang => {
            const option = new Option(`${lang.name} (${lang.code})`, lang.code);
            langSelect.add(option);
        });
    }

    // Add event listeners for the voice list
    document.getElementById('add-voice-btn')?.addEventListener('click', () => addVoiceEntry());
}

function addVoiceEntry(voice = null) {
    const voiceList = document.getElementById('voice-list');
    if (!voiceList) return;

    const voiceId = `voice-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'voice-entry';
    div.innerHTML = `
        <div class="form-row">
            <div class="form-group flex-1">
                <input type="text" id="${voiceId}-id" 
                       placeholder="Voice ID" class="form-input" 
                       value="${voice?.id || ''}" required>
            </div>
            <div class="form-group flex-1">
                <input type="text" id="${voiceId}-name" 
                       placeholder="Display Name" class="form-input" 
                       value="${voice?.name || ''}" required>
            </div>
            <div class="form-group flex-1">
                <select id="${voiceId}-gender" class="form-select">
                    ${VOICE_API_CONFIG.defaultVoiceTypes.map(type => `
                        <option value="${type.id}" 
                                ${voice?.gender === type.id ? 'selected' : ''}>
                            ${type.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <button type="button" class="btn btn-icon btn-danger" onclick="removeVoiceEntry(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    voiceList.appendChild(div);
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

// Export functions that might be needed by other scripts
window.addVoiceEntry = addVoiceEntry;
window.removeVoiceEntry = removeVoiceEntry;
window.collectVoices = collectVoices;
