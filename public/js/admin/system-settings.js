async function initSystemSettings() {
    const form = document.getElementById('system-settings-form');
    if (!form) return;

    await loadSystemSettings();
    form.addEventListener('submit', handleSettingsSubmit);
}

async function loadSystemSettings() {
    const form = document.getElementById('system-settings-form');
    
    try {
        const settings = await window.adminUtils.makeApiRequest('/api/admin/settings');
        
        form.innerHTML = `
            <div class="settings-group">
                <h4>Chat Settings</h4>
                <div class="form-group">
                    <label for="max-messages">Maximum Messages per Channel</label>
                    <input type="number" id="max-messages" class="form-input" 
                           value="${settings.maxMessages}" min="10" max="1000">
                </div>
                <div class="form-group">
                    <label for="message-timeout">Message Timeout (seconds)</label>
                    <input type="number" id="message-timeout" class="form-input" 
                           value="${settings.messageTimeout}" min="0" max="3600">
                </div>
            </div>

            <div class="settings-group">
                <h4>Security Settings</h4>
                <div class="form-group">
                    <label for="session-timeout">Session Timeout (minutes)</label>
                    <input type="number" id="session-timeout" class="form-input" 
                           value="${settings.sessionTimeout}" min="5" max="1440">
                </div>
                <div class="form-group">
                    <label for="max-login-attempts">Maximum Login Attempts</label>
                    <input type="number" id="max-login-attempts" class="form-input" 
                           value="${settings.maxLoginAttempts}" min="1" max="10">
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn">
                    <i class="fas fa-save"></i> Save Settings
                </button>
            </div>
        `;
    } catch (err) {
        showNotification('Failed to load settings', 'error');
    }
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        const formData = window.adminUtils.getFormData(e.target, [
            'max-messages',
            'message-timeout',
            'session-timeout',
            'max-login-attempts'
        ]);

        window.adminUtils.setLoadingState(submitBtn, true);
        
        await window.adminUtils.makeApiRequest('/api/admin/settings', {
            method: 'PUT',
            body: formData
        });

        showNotification('Settings saved successfully', 'success');
    } catch (err) {
        showNotification(err.message, 'error');
    } finally {
        window.adminUtils.setLoadingState(submitBtn, false);
    }
}

window.initSystemSettings = initSystemSettings;
