function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
        <i class="fas fa-${
          type === 'success'
            ? 'check-circle'
            : type === 'error'
              ? 'exclamation-circle'
              : 'info-circle'
        }"></i>
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
    // First try with AudioContext for more reliable decoding
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const arrayBuffer = reader.result;

        // Attempt to decode the audio data
await audioContext.decodeAudioData(arrayBuffer);
       audioContext.close();
       resolve(true);
     } catch (decodeError) {
        // Always release the AudioContext before falling back
        if (audioContext && typeof audioContext.close === 'function') {
          audioContext.close();
        }
        console.warn(
           'AudioContext decode failed, falling back to Audio element:',
           decodeError
         );

        // Fallback to Audio element if decoding fails
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(blob);

        const loadTimeout = setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          audio.remove();
          reject(new Error('Audio loading timed out'));
        }, 10000);

        audio.onloadedmetadata = () => {
          clearTimeout(loadTimeout);
          URL.revokeObjectURL(objectUrl);

          // Additional validation for the loaded audio
          if (
            audio.duration === Infinity ||
            isNaN(audio.duration) ||
            audio.duration === 0
          ) {
            audio.remove();
            reject(new Error('Invalid audio duration'));
            return;
          }

          audio.remove();
          resolve(true);
        };

        audio.onerror = () => {
          clearTimeout(loadTimeout);
          URL.revokeObjectURL(objectUrl);
          audio.remove();
          reject(
            new Error(
              `Audio loading failed: ${audio.error?.message || 'Unknown error'}`
            )
          );
        };

        audio.preload = 'metadata';
        audio.src = objectUrl;
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read audio data'));
    };

    reader.readAsArrayBuffer(blob);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([loadVoiceConfig(), loadVoiceApis()]).then(() => {
    initializeVoiceInterface();
  });
});

let VOICE_API_CONFIG = null;
let VOICE_APIS = [];

async function loadVoiceConfig() {
  try {
    const response = await fetch('/api/voice/config', {
      headers: {
        Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
      },
    });
    // If forbidden but endpoint is public, do not show admin error
    if (response.status === 403) {
      VOICE_API_CONFIG = null;
      showNotification(
        'Voice configuration is not available for your account',
        'warning'
      );
      return;
    }
    VOICE_API_CONFIG = await response.json();
  } catch (err) {
    console.error('Failed to load voice config:', err);
    showNotification('Failed to load voice configuration', 'error');
  }
}

async function loadVoiceApis() {
  try {
    const response = await fetch('/api/voice/public-active', {
      headers: {
        Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
      },
    });
    // If forbidden but endpoint is public, do not show admin error
    if (response.status === 403) {
      VOICE_APIS = [];
      showNotification(
        'Voice APIs are not available for your account',
        'warning'
      );
      return;
    }
    VOICE_APIS = await response.json();
    // Only id and name are available from the public endpoint
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
                ${VOICE_APIS.map(
                  (api) => `
                    <option value="${api._id}">${api.name}</option>
                `
                ).join('')}
            `;

      // Enable buttons if we have APIs
      if (previewBtn) previewBtn.disabled = !modelSelect.value;
      if (generateBtn) generateBtn.disabled = !modelSelect.value;
    } else {
      modelSelect.innerHTML =
        '<option value="">No Voice Models Available</option>';
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
    voiceSelection.innerHTML =
      '<option value="">Select a model first!</option>';
    return;
  }

  // Find the selected API
  const selectedApi = VOICE_APIS.find((api) => api._id === modelId);
  console.log('Selected API:', selectedApi);

  // Guard for missing supportedVoices
  if (!selectedApi || typeof selectedApi.supportedVoices === 'undefined') {
    voiceSelection.innerHTML = '<option value="">Voices will load after selecting a model</option>';
    return;
  }

  if (!selectedApi.supportedVoices || selectedApi.supportedVoices.length === 0) {
    voiceSelection.innerHTML = '<option value="">No voices available</option>';
    return;
  }

  // Add voices from the selected API
  selectedApi.supportedVoices.forEach((voice) => {
    if (voice.isActive !== false) {
      // Include voice if it's active or if isActive is not specified
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
  console.log('Selected voice option:', selectedOption);
  if (!selectedOption || !selectedOption.value) {
    languageDisplay.textContent = 'Select a voice';
    return;
  }

  // Get language from the data attribute
  const { language } = selectedOption.dataset;

  // Map language code to a more readable format
  const languageMap = {
    en: 'English',
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    es: 'Spanish',
    'es-ES': 'Spanish (Spain)',
    fr: 'French',
    'fr-FR': 'French (France)',
    de: 'German',
    'de-DE': 'German (Germany)',
    it: 'Italian',
    'it-IT': 'Italian (Italy)',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    'pt-BR': 'Portuguese (Brazil)',
    ru: 'Russian',
    zh: 'Chinese',
    'zh-CN': 'Chinese (Mandarin)',
    ar: 'Arabic',
    hi: 'Hindi',
    nl: 'Dutch',
    pl: 'Polish',
    tr: 'Turkish',
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
    responseType: document.getElementById('voice-response-type'),
  };

  // Log found elements
  console.log(
    'Found elements:',
    Object.fromEntries(Object.entries(elements).map(([k, v]) => [k, !!v]))
  );

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
    elements.testBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Testing...';
    previewStatus.textContent = 'Testing API...';

    const testData = {
      curlCommand: elements.curlCommand.value,
      requestPath: elements.requestPath.value,
      responsePath: elements.responsePath.value,
      apiType: elements.apiType.value,
      responseType: elements.responseType.value,
      auth:
        elements.apiType.value === 'hearing'
          ? {
              loginEndpoint: document.getElementById('auth-endpoint')?.value,
              tokenPath: document.getElementById('token-path')?.value,
              username: document.getElementById('auth-username')?.value,
              password: document.getElementById('auth-password')?.value,
            }
          : null,
    };

    console.log('Sending test request to server...', {
      endpoint: '/api/admin/voice/test',
      dataKeys: Object.keys(testData),
    });

    const response = await fetch('/api/admin/voice/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
      },
      body: JSON.stringify(testData),
    });

    console.log('Received response:', {
      status: response.status,
      ok: response.ok,
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
      stack: err.stack,
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

  entries.forEach((entry) => {
    const id = entry.querySelector('.voice-id').value.trim();
    const name = entry.querySelector('.voice-name').value.trim();
    const gender = entry.querySelector('.voice-gender').value;
    const language = entry.querySelector('.voice-language').value.trim();

    if (id && name && language) {
      voices.push({
        id,
        name,
        gender,
        language,
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
    generateBtn: document.getElementById('generate-voice-btn'),
  };

  try {
    if (!(await validateInputs())) {
      return;
    }

    // Show loading indicator and disable generate button
    if (elements.loadingIndicator)
      elements.loadingIndicator.style.display = 'flex';
    if (elements.generateBtn) elements.generateBtn.disabled = true;
    if (elements.audioResult) elements.audioResult.style.display = 'none';
    if (elements.downloadSection)
      elements.downloadSection.style.display = 'none';

    // Prepare request data using elements object
    const requestData = {
      apiId: elements.modelSelect.value,
      voice: elements.voiceSelection.value,
      text: elements.voiceText.value.trim(),
      speed: elements.voiceSpeed ? parseFloat(elements.voiceSpeed.value) : 1.0,
      pitch: elements.voicePitch ? parseFloat(elements.voicePitch.value) : 1.0,
      preview,
    };

    console.log('Sending preview request:', requestData);

    // Send request to server
    const response = await fetch('/api/voice/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
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

    console.log('Starting duration calculation for audio...');
    console.log(
      `Audio blob details: type=${audioType}, size=${audioBlob.size} bytes`
    );

    const duration = await getAudioDuration(audioBlob);
    console.log(`Final duration passed to buildCustomAudioPlayer: ${duration}`);
    const durationFormatted = formatDuration(duration);
    console.log(`Formatted duration for display: ${durationFormatted}`);

    if (elements.audioPlayer) {
      const selectedVoice =
        elements.voiceSelection.options[elements.voiceSelection.selectedIndex]
          .text;
      console.log(
        `Building audio player with duration: ${duration}, formatted: ${durationFormatted}`
      );
      elements.audioPlayer.innerHTML = buildCustomAudioPlayer(
        audioSource,
        audioType,
        duration,
        selectedVoice
      );
      initializeCustomPlayer();
    }

    // Show audio result and enable download
    if (elements.loadingIndicator)
      elements.loadingIndicator.style.display = 'none';
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
    if (elements.loadingIndicator)
      elements.loadingIndicator.style.display = 'none';
    if (elements.generateBtn) elements.generateBtn.disabled = false;
    if (elements.downloadSection)
      elements.downloadSection.style.display = 'none';
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

// Function to get audio duration using AudioContext (more accurate)
function getAudioDurationWithContext(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      console.log('FileReader loaded audio data, creating AudioContext...');
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      audioContext.decodeAudioData(
        event.target.result,
        (buffer) => {
          const { duration } = buffer;
          console.log(`AudioContext decoded duration: ${duration} seconds`);
          resolve(duration);
          audioContext.close();
        },
        (error) => {
          console.error('Error decoding audio data:', error);
          reject(error);
          audioContext.close();
        }
      );
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };
    console.log('Starting to read audio blob as ArrayBuffer...');
    reader.readAsArrayBuffer(blob);
  });
}

async function getAudioDuration(blob) {
  let duration = 0;
  try {
    console.log('Attempting duration calculation with AudioContext...');
    console.log(`Blob type: ${blob.type}, size: ${blob.size} bytes`);

    duration = await getAudioDurationWithContext(blob);
    console.log(`AudioContext method succeeded. Duration: ${duration}`);
    return duration;
  } catch (error) {
    console.error('AudioContext method failed:', error);
    console.log('Falling back to HTMLAudioElement method...');

    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);

      audio.addEventListener('loadedmetadata', () => {
        const fallbackDuration = audio.duration;
        console.log(
          `HTMLAudioElement loadedmetadata duration: ${fallbackDuration}`
        );
        URL.revokeObjectURL(url);
        audio.remove();
        if (fallbackDuration === Infinity) {
          console.warn(
            'HTMLAudioElement reported Infinity duration, defaulting to 0'
          );
        }
        resolve(fallbackDuration === Infinity ? 0 : fallbackDuration);
      });

      audio.addEventListener('error', (e) => {
        console.error('HTMLAudioElement error:', audio.error || e);
        URL.revokeObjectURL(url);
        audio.remove();
        resolve(0);
      });

      audio.preload = 'metadata';
      audio.src = url;
      console.log('HTMLAudioElement created and metadata loading started...');

      const timeoutId = setTimeout(() => {
        console.warn('HTMLAudioElement fallback timed out after 5 seconds');
        URL.revokeObjectURL(url);
        audio.remove();
        resolve(0);
      }, 5000);

      audio.addEventListener('loadedmetadata', () => clearTimeout(timeoutId));
      audio.addEventListener('error', () => clearTimeout(timeoutId));
    });
  }
}

// Add these helper functions
function formatDuration(seconds) {
  // Ensure we have a valid number and it's not Infinity
  if (!seconds || seconds === Infinity || isNaN(seconds)) {
    return '0:00';
  }

  // Round down to nearest whole number
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function buildCustomAudioPlayer(
  audioSource,
  audioType,
  duration,
  selectedVoice
) {
  const durationFormatted = formatDuration(duration);

  return `
        <div class="custom-audio-player">
            <audio id="audioElement" preload="metadata">
                <source src="${audioSource}" type="${audioType}">
                Your browser does not support the audio element.
            </audio>
            
            <div class="player-controls">
                <button class="play-pause-btn">
                    <i class="fas fa-play"></i>
                </button>
                
                <div class="progress-bar">
                    <div class="progress"></div>
                </div>
                
                <div class="time-display">
                    <span class="current-time">0:00</span>
                    <span class="current-time">/</span>
                    <span class="duration">${durationFormatted}</span>
                </div>
            </div>
            
            <div class="audio-info">
                <div class="audio-meta">
                <span><i class="fas fa-clock"></i> ${durationFormatted}</span>
                <span><i class="fas fa-microphone-alt"></i> ${selectedVoice}</span>
                </div>
            </div>
        </div>
    `;
}

function initializeCustomPlayer() {
  const audio = document.getElementById('audioElement');
  if (!audio) return;

  const player = audio.closest('.custom-audio-player');
  if (!player) return;

  const playPauseBtn = player.querySelector('.play-pause-btn');
  const progress = player.querySelector('.progress');
  const currentTimeDisplay = player.querySelector('.current-time');
  const durationDisplay = player.querySelector('.duration');
  const audioMetaDuration = player.querySelector(
    '.audio-meta span:first-child'
  );
  const progressBar = player.querySelector('.progress-bar');

  if (
    !playPauseBtn ||
    !progress ||
    !currentTimeDisplay ||
    !durationDisplay ||
    !progressBar
  ) {
    console.error('Custom audio player elements not found!');
    return;
  }

  // Get the pre-calculated duration from the display
  const initialDuration = parseDurationString(durationDisplay.textContent);
  console.log(`Using pre-calculated duration: ${initialDuration}s`);

  let animationFrameId = null;

  function updateProgress() {
    if (!isNaN(audio.currentTime)) {
      // Use our initial duration rather than audio.duration
      const percent = (audio.currentTime / initialDuration) * 100;
      progress.style.width = `${percent}%`;
      currentTimeDisplay.textContent = formatDuration(audio.currentTime);
    } else {
      progress.style.width = '0%';
      currentTimeDisplay.textContent = formatDuration(0);
    }
  }

  function animationLoop() {
    // console.log(`RAF Loop: time=${audio.currentTime.toFixed(2)}, paused=${audio.paused}, ended=${audio.ended}`);

    updateProgress();

    if (!audio.paused && !audio.ended) {
      animationFrameId = requestAnimationFrame(animationLoop);
    } else {
      console.log('RAF Loop stopping.');
      animationFrameId = null;
    }
  }

  function startLoop() {
    if (animationFrameId) {
      console.log('Cancelling existing RAF frame before starting new one.');
      cancelAnimationFrame(animationFrameId);
    }
    console.log('Starting RAF Loop...');
    animationFrameId = requestAnimationFrame(animationLoop);
  }

  function stopLoop() {
    if (animationFrameId) {
      console.log('Stopping RAF Loop via stopLoop().');
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // Helper function to parse duration string back to seconds
  function parseDurationString(durationStr) {
    const [minutes, seconds] = durationStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }

  playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    console.log(
      `Audio metadata loaded. HTMLAudioElement reports duration: ${audio.duration.toFixed(2)}s. Using pre-calculated duration: ${initialDuration}s`
    );

    // Only log a warning if the durations are significantly different
    const durationDiff = Math.abs(audio.duration - initialDuration);
    if (durationDiff > 1) {
      console.warn(
        `Duration discrepancy detected: HTMLAudioElement duration differs by ${durationDiff.toFixed(2)}s from calculated duration`
      );
    }

    updateProgress();
  });

  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    // Use initial duration for seeking calculations
    const newTime = percent * initialDuration;
    console.log(
      `Seeking to: ${newTime.toFixed(2)}s (${(percent * 100).toFixed(1)}%)`
    );
    audio.currentTime = newTime;
    updateProgress();
  });

  audio.addEventListener('play', () => {
    console.log('Play event triggered');
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    startLoop();
  });

  audio.addEventListener('pause', () => {
    console.log('Pause event triggered');
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    stopLoop();
  });

  audio.addEventListener('ended', () => {
    console.log(
      `Audio ended event. Final time: ${audio.currentTime.toFixed(2)}`
    );
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    stopLoop();
    progress.style.width = '0%';
    currentTimeDisplay.textContent = formatDuration(0);
    audio.currentTime = 0; // Reset to beginning for replay
  });

  // Initialize progress bar
  updateProgress();
}
