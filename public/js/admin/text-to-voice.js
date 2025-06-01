async function initializeVoiceForm() {
  const voiceElements = {
    form: document.getElementById('voice-api-form'),
    addButton: document.getElementById('add-voice-api-btn'),
    closeButton: document.getElementById('close-voice-form'),
    apiTypeSelect: document.getElementById('voice-api-type'),
    authSection: document.getElementById('auth-section'),
    testButton: document.getElementById('test-voice-api'),
  };

  if (!voiceElements.form || !voiceElements.addButton) return;

  // Log found elements
  console.log('Voice form elements:', {
    hasForm: !!voiceElements.form,
    hasAddButton: !!voiceElements.addButton,
    hasCloseButton: !!voiceElements.closeButton,
    hasApiTypeSelect: !!voiceElements.apiTypeSelect,
    hasAuthSection: !!voiceElements.authSection,
    hasTestButton: !!voiceElements.testButton,
  });

  // Add initial load of voice settings
  await Promise.all([
    loadVoiceSettings('speed'),
    loadVoiceSettings('pitch'),
    loadVoiceApiList(),
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
        Array.from(
          voiceElements.form.querySelectorAll('input, textarea, select')
        ).forEach((input) => {
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
    voiceApiList.innerHTML =
      '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading Voice APIs...</div>';

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

    voiceApiList.innerHTML = '';
    apis.forEach(api => {
      const wrapper = document.createElement('div');
      wrapper.className = 'api-item';
      wrapper.dataset.id = api._id;
      wrapper.dataset.name = api.name;

      // Build API details section
      const details = document.createElement('div');
      details.className = 'api-details';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'api-name';
      const statusSpan = document.createElement('span');
      statusSpan.className = `api-status ${api.isActive ? 'active' : 'inactive'}`;
      nameDiv.appendChild(statusSpan);
      // Use textContent to prevent XSS
      nameDiv.appendChild(document.createTextNode(api.name));
      details.appendChild(nameDiv);

      const pathsDiv = document.createElement('div');
      pathsDiv.className = 'api-paths';
      const typeSmall = document.createElement('small');
      typeSmall.textContent = `Type: ${api.apiType}`;
      const voicesSmall = document.createElement('small');
      voicesSmall.textContent = `Voices: ${api.supportedVoices?.length || 0}`;
      pathsDiv.appendChild(typeSmall);
      pathsDiv.appendChild(document.createTextNode(' | '));
      pathsDiv.appendChild(voicesSmall);
      details.appendChild(pathsDiv);

      // Build controls section (edit, delete, toggle)
      const controls = document.createElement('div');
      controls.className = 'api-controls';
      // Toggle
      const label = document.createElement('label');
      label.className = 'toggle-switch';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'api-toggle';
      input.dataset.id = api._id;
      input.checked = !!api.isActive;
      input.onclick = () => toggleVoiceApi(api._id, input.checked);
      const slider = document.createElement('span');
      slider.className = 'toggle-slider';
      label.appendChild(input);
      label.appendChild(slider);
      controls.appendChild(label);
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-icon edit-api';
      editBtn.dataset.id = api._id;
      editBtn.onclick = () => editVoiceApi(api._id, api.name);
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      controls.appendChild(editBtn);
      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-icon btn-danger delete-api';
      delBtn.dataset.id = api._id;
      delBtn.onclick = () => deleteVoiceApi(api._id, api.name);
      delBtn.innerHTML = '<i class="fas fa-trash"></i>';
      controls.appendChild(delBtn);

      wrapper.appendChild(details);
      wrapper.appendChild(controls);
      voiceApiList.appendChild(wrapper);
    });
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

  // Get form state from hidden inputs using getElementById instead of querySelector
  const modeInput = document.getElementById('form-mode');
  const apiIdInput = document.getElementById('form-api-id');
  const isEditing = modeInput && modeInput.value === 'edit';
  const apiId = apiIdInput?.value;

  console.log('Form submission started:', {
    isEditing,
    apiId,
    formState: {
      mode: modeInput?.value,
      apiId: apiIdInput?.value,
      hasMode: !!modeInput,
      hasId: !!apiIdInput,
    },
  });

  try {
    // Validate form state for editing
    if (isEditing && !apiId) {
      throw new Error('Invalid form state: missing API ID for edit mode');
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    // Build form data
    const formData = {
      apiType: document.getElementById('voice-api-type').value,
      responseType: document.getElementById('voice-response-type').value,
      curlCommand: document.getElementById('voice-curl-command').value,
      requestPath: document.getElementById('voice-request-path').value,
      responsePath: document.getElementById('voice-response-path').value,
      supportedVoices: collectVoices(),
    };

    // Only include name for new APIs
    if (!isEditing) {
      const name = document.getElementById('voice-api-name').value.trim();
      if (!name) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-save"></i> ${isEditing ? 'Update' : 'Save'} API`;
        throw new Error('API name is required for new entries');
      }
      formData.name = name;
    }

    // Add auth data if needed
    if (formData.apiType === 'hearing') {
      formData.auth = {
        loginEndpoint: document.getElementById('auth-endpoint').value,
        tokenPath: document.getElementById('token-path').value,
        credentials: {
          username: document.getElementById('auth-username').value,
          password: document.getElementById('auth-password').value,
        },
      };

      // Validate auth fields
      if (
        !formData.auth.loginEndpoint ||
        !formData.auth.tokenPath ||
        !formData.auth.credentials.username
      ) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-save"></i> ${isEditing ? 'Update' : 'Save'} API`;
        throw new Error(
          'Authentication fields (Endpoint, Token Path, Username) are required for Hearing API type.'
        );
      }
    }

    // Determine endpoint and method based on form attributes
    const endpoint = isEditing
      ? `/api/admin/voice/${apiId}`
      : '/api/admin/voice';
    const method = isEditing ? 'PUT' : 'POST';

    console.log('Making API request:', {
      endpoint,
      method,
      isEditing,
      apiId,
      formState: {
        mode: modeInput?.value,
        apiId: apiIdInput?.value,
      },
    });

    const res = await window.adminUtils.makeApiRequest(endpoint, {
      method,
      body: formData,
    });

    console.log('API response:', {
      success: true,
      isEditing,
      apiId: res?.api?._id || apiId,
    });

    showNotification(
      `Voice API ${isEditing ? 'updated' : 'added'} successfully`,
      'success'
    );
    resetVoiceForm();
    await loadVoiceApiList();
  } catch (err) {
    console.error('Error saving voice API:', {
      error: err.message,
      stack: err.stack,
      isEditingAttempted: isEditing,
      apiIdAttempted: apiId,
      formState: {
        mode: modeInput?.value,
        apiId: apiIdInput?.value,
      },
    });
    showNotification(
      err.message || 'Failed to save voice API. Check console for details.',
      'error'
    );
  } finally {
    submitBtn.disabled = false;
    const buttonTextMode = modeInput?.value === 'edit' ? 'Update' : 'Save';
    submitBtn.innerHTML = `<i class="fas fa-save"></i> ${buttonTextMode} API`;
  }
}

// Add this function to check form state
function validateFormState(form) {
  const isEditing = form.dataset.mode === 'edit';
  const { apiId } = form.dataset;

  if (isEditing && !apiId) {
    console.error('Invalid form state:', {
      mode: form.dataset.mode,
      apiId,
      formDataset: { ...form.dataset },
    });
    throw new Error('Invalid form state: missing API ID');
  }

  return { isEditing, apiId };
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
  return Array.from(entries)
    .map((entry) => ({
      id: entry.querySelector('.voice-id').value.trim(),
      name: entry.querySelector('.voice-name').value.trim(),
      gender: entry.querySelector('.voice-gender').value,
      language: entry.querySelector('.voice-language').value.trim(),
    }))
    .filter((voice) => voice.id && voice.name && voice.language);
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
    testSection: document.querySelector('.test-status-section'),
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
    elements.testBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Testing...';
    elements.testStatus.className = 'test-indicator running';
    elements.testStatus.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Testing API...';
    elements.testMessage.textContent = 'Making test request...';
    elements.testDetails.style.display = 'none';

    const testData = {
      curlCommand: elements.curlCommand.value,
      requestPath: elements.requestPath.value,
      responsePath: elements.responsePath?.value,
      apiType: elements.apiType.value,
      responseType: elements.responseType.value,
    };

    // Add auth data if needed
    if (elements.apiType.value === 'hearing') {
      testData.auth = {
        loginEndpoint: document.getElementById('auth-endpoint')?.value,
        tokenPath: document.getElementById('token-path')?.value,
        credentials: {
          username: document.getElementById('auth-username')?.value,
          password: document.getElementById('auth-password')?.value,
        },
      };
    }

    const response = await window.adminUtils.makeApiRequest(
      '/api/admin/voice/test',
      {
        method: 'POST',
        body: testData,
      }
    );

    // Update UI for success
    elements.testStatus.className = 'test-indicator success';
    elements.testStatus.innerHTML =
      '<i class="fas fa-check-circle"></i> Test Successful';
    elements.testMessage.textContent = 'API test completed successfully';

    // Show response details
    elements.testDetails.style.display = 'block';
    elements.testResponse.textContent = JSON.stringify(
      response.details,
      null,
      2
    );

    showNotification('API test successful', 'success');
  } catch (err) {
    // Update UI for error
    elements.testStatus.className = 'test-indicator error';
    elements.testStatus.innerHTML =
      '<i class="fas fa-exclamation-circle"></i> Test Failed';
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
  console.log('Starting edit operation:', { id, name });

  try {
    const form = document.getElementById('voice-api-form');

    // Create or update hidden inputs with specific IDs
    let modeInput = document.getElementById('form-mode');
    let apiIdInput = document.getElementById('form-api-id');

    if (!modeInput) {
      modeInput = document.createElement('input');
      modeInput.type = 'hidden';
      modeInput.id = 'form-mode'; // Use id instead of name
      modeInput.name = 'formMode';
      form.appendChild(modeInput);
    }
    if (!apiIdInput) {
      apiIdInput = document.createElement('input');
      apiIdInput.type = 'hidden';
      apiIdInput.id = 'form-api-id'; // Use id instead of name
      apiIdInput.name = 'apiId';
      form.appendChild(apiIdInput);
    }

    modeInput.value = 'edit';
    apiIdInput.value = id;

    console.log('Form state set:', {
      mode: modeInput.value,
      apiId: apiIdInput.value,
      hasMode: !!document.getElementById('form-mode'),
      hasId: !!document.getElementById('form-api-id'),
    });

    const response = await window.adminUtils.makeApiRequest(
      `/api/admin/voice/${id}`
    );
    console.log('Received API data for editing:', {
      id: response._id,
      name: response.name,
      hasVoices: response.supportedVoices?.length || 0,
    });

    const addButton = document.getElementById('add-voice-api-btn');
    const formHeader = form.querySelector('.form-header h3');
    const submitBtn = form.querySelector('button[type="submit"]');
    const nameInput = document.getElementById('voice-api-name');

    // Update form header and submit button
    formHeader.innerHTML = '<i class="fas fa-edit"></i> Update Voice API';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update API';

    // Make name field read-only for edit mode
    nameInput.value = response.name;
    nameInput.readOnly = true; // Set readonly in edit mode
    nameInput.classList.add('read-only');

    document.getElementById('voice-api-type').value =
      response.apiType || 'direct';
    document.getElementById('voice-response-type').value =
      response.responseType || 'binary';
    document.getElementById('voice-curl-command').value = response.curlCommand;
    document.getElementById('voice-request-path').value = response.requestPath;
    document.getElementById('voice-response-path').value =
      response.responsePath || '';

    // Handle auth section
    const authSection = document.getElementById('auth-section');
    if (response.apiType === 'hearing' && authSection) {
      authSection.style.display = 'block';
      if (response.auth) {
        document.getElementById('auth-endpoint').value =
          response.auth.loginEndpoint || '';
        document.getElementById('token-path').value =
          response.auth.tokenPath || '';
        document.getElementById('auth-username').value =
          response.auth.credentials?.username || '';
        document.getElementById('auth-password').value =
          response.auth.credentials?.password || '';
      }
    } else if (authSection) {
      authSection.style.display = 'none';
    }

    // Clear and populate voice entries
    const voicesContainer = document.getElementById('voice-entries-container');
    voicesContainer.innerHTML = '';
    response.supportedVoices?.forEach((voice) => {
      addVoiceEntry(voice);
    });

    // Add final state check before displaying form
    console.log('Form state before display:', {
      mode: modeInput.value,
      apiId: apiIdInput.value,
      formInputs: form.elements,
    });

    form.style.display = 'block';
    addButton.style.display = 'none';

    console.log('Form prepared for editing:', {
      formMode: modeInput.value,
      apiId: apiIdInput.value,
      nameReadOnly: nameInput.readOnly,
      submitButtonText: submitBtn.innerHTML,
    });
  } catch (err) {
    console.error('Error in edit operation:', err);
    showNotification(err.message, 'error');
  }
}

// Add delete API function
async function deleteVoiceApi(id, name) {
  if (!confirm(`Are you sure you want to delete voice API "${name}"?`)) return;

  try {
    await window.adminUtils.makeApiRequest(`/api/admin/voice/${id}`, {
      method: 'DELETE',
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
      body: { isActive },
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

// Update form reset handler
function resetVoiceForm() {
  console.trace('resetVoiceForm called');
  const form = document.getElementById('voice-api-form');
  if (!form) {
    console.error('Voice API form not found');
    return;
  }

  const formHeader = form.querySelector('.form-header h3');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Update UI elements
  if (formHeader) {
    formHeader.innerHTML = '<i class="fas fa-plus"></i> Add New Voice API';
  }
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save API';
  }

  // Remove state inputs using getElementById
  document.getElementById('form-mode')?.remove();
  document.getElementById('form-api-id')?.remove();

  console.log('Form state cleared:', {
    hasMode: !!document.getElementById('form-mode'),
    hasId: !!document.getElementById('form-api-id'),
  });

  // Reset form inputs manually
  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = false;
    } else {
      input.value = '';
    }
  });

  // Reset name input field state
  const nameInput = document.getElementById('voice-api-name');
  if (nameInput) {
    nameInput.readOnly = false; // Remove readonly for new API form
    nameInput.classList.remove('read-only');
    nameInput.value = '';
  }

  // Clear voice entries
  const voicesContainer = document.getElementById('voice-entries-container');
  if (voicesContainer) {
    voicesContainer.innerHTML = '';
  }

  // Reset auth section
  const authSection = document.getElementById('auth-section');
  if (authSection) {
    authSection.style.display = 'none';
  }

  // Hide form and show add button
  form.style.display = 'none';
  const addButton = document.getElementById('add-voice-api-btn');
  if (addButton) {
    addButton.style.display = 'block';
  }

  // Log state after reset
  console.log('Form state after reset:', {
    mode: document.getElementById('form-mode')?.value,
    apiId: document.getElementById('form-api-id')?.value,
  });
}

// Add saveVoiceSettings function
async function saveVoiceSettings(type) {
  try {
    const range = {
      min: parseFloat(document.getElementById(`${type}-min`).value),
      max: parseFloat(document.getElementById(`${type}-max`).value),
      default: parseFloat(document.getElementById(`${type}-default`).value),
      step: parseFloat(document.getElementById(`${type}-step`).value),
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

    const response = await window.adminUtils.makeApiRequest(
      `/api/admin/voice-settings/${type}`,
      {
        method: 'PUT',
        body: { range },
      }
    );

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
    const response = await window.adminUtils.makeApiRequest(
      `/api/admin/voice-settings/${type}`
    );

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
    showNotification(
      `Failed to load ${type} settings: ${err.message}`,
      'error'
    );
  }
}

// Export functions
window.initializeVoiceForm = initializeVoiceForm;
window.addVoiceEntry = addVoiceEntry;
window.removeVoiceEntry = function (button) {
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
