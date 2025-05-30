/**
 * Initializes the System Settings page.
 * - Fetches and stores a CSRF token for secure form submissions.
 * - Loads current system settings and populates the form.
 * - Sets up event listeners for saving settings and resetting to defaults.
 * - Handles client-side validation and UX feedback (loading states, messages).
 */
async function initSystemSettings() {
  const form = document.getElementById('systemSettingsForm');
  const message = document.getElementById('message');
  const resetButton = document.getElementById('resetButton');
  const saveButton = form ? form.querySelector('button[type="submit"]') : null; // Get reference to save button
  let csrfToken = null;

  if (!form || !saveButton) {
    console.error('System settings form or save button not found'); // Logging for dev; consider a more user-friendly approach for production.
    return;
  }

  /**
   * Displays a message to the user.
   * @param {string} text - The message text to display.
   * @param {string} [type='info'] - The type of message ('info', 'success', 'error').
   */
  function showMessage(text, type = 'info') {
    if (!message) return;
    // Using textContent is safer than innerHTML if 'text' might contain user-supplied content.
    // However, for multi-line validation errors, innerHTML was used with <br>.
    // For general messages, textContent is fine.
    message.textContent = text;
    message.className = `alert alert-${type}`; // Ensure alert class is always present for styling
    message.style.display = 'block';
    setTimeout(() => {
      message.style.display = 'none';
    }, 5000);
  }

  /**
   * Initializes the page by fetching a CSRF token and then loading system settings.
   * Handles errors during CSRF token fetching by disabling form interactions.
   */
  async function initializePage() {
    // CSRF token is crucial for POST requests (save/reset).
    // It's fetched from an endpoint provided by `csurf` middleware on the backend.
    if (window.getCsrfToken) { // Relies on getCsrfToken from utils.js
      try {
        csrfToken = await window.getCsrfToken();
        if (!csrfToken) {
          throw new Error('CSRF token was not received from the server.');
        }
        // Token successfully fetched. Proceed to load settings.
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error.message);
        showMessage('Failed to load security token. Please refresh and try again.', 'error');
        // Disable form interactions if the CSRF token cannot be obtained.
        if (saveButton) saveButton.disabled = true;
        if (resetButton) resetButton.disabled = true;
        return; // Stop further initialization.
      }
    } else {
      // This indicates a critical issue, likely utils.js not being loaded.
      console.error('getCsrfToken function not found. Ensure utils.js is loaded before this script.');
      showMessage('A critical security component is missing. Please contact support or refresh the page.', 'error');
      if (saveButton) saveButton.disabled = true;
      if (resetButton) resetButton.disabled = true;
      return; // Stop further initialization.
    }

    await loadSettings(); // Load current settings after CSRF token is available.
  }


  /**
   * Validates the system settings form fields.
   * Checks for required fields, correct data types, and minimum values.
   * Displays a summary of errors if any are found.
   * @returns {boolean} True if the form is valid, false otherwise.
   */
  function validateSettingsForm() {
    const errors = [];
    if (message) message.style.display = 'none'; // Clear previous validation/server messages.

    const maxUsersPerRoom = form.maxUsersPerRoom.value.trim();
    const maxRoomsPerUser = form.maxRoomsPerUser.value.trim();
    const maxMessageLength = form.maxMessageLength.value.trim();
    const messageRateLimit = form.messageRateLimit.value.trim();

    // Validation checks
    if (!maxUsersPerRoom) errors.push('Maximum Users per Room is required.');
    else if (isNaN(parseInt(maxUsersPerRoom, 10))) errors.push('Maximum Users per Room must be a number.');
    else if (parseInt(maxUsersPerRoom, 10) < 2) errors.push('Maximum Users per Room must be at least 2.');

    if (!maxRoomsPerUser) errors.push('Maximum Rooms per User is required.');
    else if (isNaN(parseInt(maxRoomsPerUser, 10))) errors.push('Maximum Rooms per User must be a number.');
    else if (parseInt(maxRoomsPerUser, 10) < 1) errors.push('Maximum Rooms per User must be at least 1.');

    if (!maxMessageLength) errors.push('Maximum Message Length is required.');
    else if (isNaN(parseInt(maxMessageLength, 10))) errors.push('Maximum Message Length must be a number.');
    else if (parseInt(maxMessageLength, 10) < 10) errors.push('Maximum Message Length must be at least 10.'); // Assuming min 10 from schema

    if (!messageRateLimit) errors.push('Message Rate Limit is required.');
    else if (isNaN(parseInt(messageRateLimit, 10))) errors.push('Message Rate Limit must be a number.');
    else if (parseInt(messageRateLimit, 10) < 0) errors.push('Message Rate Limit must be 0 or greater (0 for no limit).');


    if (errors.length > 0) {
      // Use innerHTML to render <br> tags for multiple errors
      const errorHtml = errors.join('<br>');
      if (message) { // Check if message element exists
        message.innerHTML = errorHtml;
        message.className = 'alert alert-error';
        message.style.display = 'block';
        // No timeout for validation errors, user should correct them
      } else {
        // Fallback if message element is not found (though it should be)
        alert(errors.join('\n'));
      }
      return false;
    }
    return true;
  }

  /**
   * Fetches current system settings from the backend and populates the form.
   * Manages button loading states during the fetch operation.
   */
  async function loadSettings() {
    // Disable buttons during the fetch operation to prevent concurrent actions.
    if (saveButton) saveButton.disabled = true;
    if (resetButton) resetButton.disabled = true;
    if (message) message.style.display = 'none'; // Clear previous messages.
    // Consider adding a visual loading indicator here (e.g., spinner).

    try {
      const response = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        form.maxUsersPerRoom.value = data.maxUsersPerRoom;
        form.maxRoomsPerUser.value = data.maxRoomsPerUser;
        form.maxMessageLength.value = data.maxMessageLength;
        form.messageRateLimit.value = data.messageRateLimit;
        form.requireEmailVerification.checked = data.requireEmailVerification;
        form.allowGuestAccess.checked = data.allowGuestAccess;
        form.enableProfanityFilter.checked = data.enableProfanityFilter;
      } else {
        showMessage(data.message || 'Error loading settings', 'error');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('Error loading settings', 'error');
    } finally {
      // Re-enable buttons only if CSRF token was successfully fetched
      if (csrfToken) {
        if (saveButton) saveButton.disabled = false;
        if (resetButton) resetButton.disabled = false;
      }
      // Optionally: clear loading message if one was shown explicitly and not auto-hiding
    }
  }

  /**
   * Handles the form submission for saving system settings.
   * Performs client-side validation, then sends data to the backend.
   * Manages button loading states and displays success/error messages.
   * Includes the CSRF token in the request headers for security.
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (message) message.style.display = 'none'; // Clear previous messages.

    // Perform client-side validation before submitting.
    if (!validateSettingsForm()) {
      return; // Stop if validation fails.
    }

    // Ensure CSRF token is available.
    if (!csrfToken) {
      showMessage('Security token missing. Please refresh the page and try again.', 'error');
      console.error('CSRF token is not available for saving settings.');
      return;
    }

    // Manage button states and text for loading indication.
    const originalSaveButtonText = saveButton.textContent;
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
    }
    if (resetButton) resetButton.disabled = true;

    const settings = {
      maxUsersPerRoom: parseInt(form.maxUsersPerRoom.value, 10),
      maxRoomsPerUser: parseInt(form.maxRoomsPerUser.value, 10),
      maxMessageLength: parseInt(form.maxMessageLength.value, 10),
      messageRateLimit: parseInt(form.messageRateLimit.value, 10),
      requireEmailVerification: form.requireEmailVerification.checked,
      allowGuestAccess: form.allowGuestAccess.checked,
      enableProfanityFilter: form.enableProfanityFilter.checked,
    };

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Settings updated successfully', 'success');
      } else {
        showMessage(data.message || 'Error updating settings', 'error');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      showMessage('Error updating settings', 'error');
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = originalSaveButtonText;
      }
      if (resetButton) resetButton.disabled = false;
    }
  });

  /**
   * Handles the "Reset to Defaults" button click.
   * Confirms the action with the user, then sends a request to the backend endpoint.
   * Manages button loading states and displays success/error messages.
   * Includes the CSRF token in the request headers.
   * The backend now determines the default values based on the Mongoose schema.
   */
  if (resetButton) {
    resetButton.addEventListener('click', async () => {
      // Ensure CSRF token is available.
      if (!csrfToken) {
        showMessage('Security token missing. Please refresh the page and try again.', 'error');
        console.error('CSRF token is not available for resetting settings.');
        return;
      }

      if (
        confirm( // Standard browser confirmation dialog.
          'Are you sure you want to reset all settings to their default values?'
        )
      ) {
        // Manage button states and text for loading indication.
        const originalResetButtonText = resetButton.textContent;
        if (saveButton) saveButton.disabled = true;
        if (resetButton) {
            resetButton.disabled = true;
            resetButton.textContent = 'Resetting...';
        }

        try {
          // Call the backend endpoint to reset settings.
          // The backend will now use schema defaults.
          const response = await fetch('/api/admin/settings/reset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', // Good practice, even for an empty body.
              Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
              'X-CSRF-Token': csrfToken, // CSRF token for security.
            },
            body: JSON.stringify({}), // Send an empty body as defaults are handled by backend.
          });

          const data = await response.json();

          if (response.ok) {
            // Repopulate the form with the default settings returned by the backend.
            if (data.settings) {
              form.maxUsersPerRoom.value = data.settings.maxUsersPerRoom;
              form.maxRoomsPerUser.value = data.settings.maxRoomsPerUser;
              form.maxMessageLength.value = data.settings.maxMessageLength;
              form.messageRateLimit.value = data.settings.messageRateLimit;
              form.requireEmailVerification.checked = data.settings.requireEmailVerification;
              form.allowGuestAccess.checked = data.settings.allowGuestAccess;
              form.enableProfanityFilter.checked = data.settings.enableProfanityFilter;
            } else {
              // Fallback if the settings object is not in the expected place in the response.
              await loadSettings(); // Reload all settings from the GET endpoint.
            }
            showMessage('Settings reset to defaults successfully.', 'success');
          } else {
            showMessage(data.message || 'Error resetting settings.', 'error');
          }
        } catch (error) {
          console.error('Error resetting settings:', error);
          showMessage('Error resetting settings', 'error');
        } finally {
            if (saveButton) saveButton.disabled = false;
            if (resetButton) {
                resetButton.disabled = false;
                resetButton.textContent = originalResetButtonText;
            }
        }
      }
    });
  }

  // Load initial data
  await initializePage();
}

// Export for use in admin.js
window.initSystemSettings = initSystemSettings;
