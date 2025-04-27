async function initSystemSettings() {
    const form = document.getElementById('systemSettingsForm');
    const message = document.getElementById('message');
    const resetButton = document.getElementById('resetButton');

    if (!form) {
        console.error('System settings form not found');
        return;
    }

    // Load current settings
    async function loadSettings() {
        try {
            const response = await fetch('/api/admin/settings', {
                headers: {
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                }
            });
            const data = await response.json();
            
            if (response.ok) {
                // Populate form with current settings
                form.maxUsersPerRoom.value = data.maxUsersPerRoom;
                form.maxRoomsPerUser.value = data.maxRoomsPerUser;
                form.maxMessageLength.value = data.maxMessageLength;
                form.messageRateLimit.value = data.messageRateLimit;
                form.requireEmailVerification.checked = data.requireEmailVerification;
                form.allowGuestAccess.checked = data.allowGuestAccess;
                form.enableProfanityFilter.checked = data.enableProfanityFilter;
            } else {
                showMessage('Error loading settings', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error loading settings', 'error');
        }
    }

    // Save settings
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const settings = {
            maxUsersPerRoom: parseInt(form.maxUsersPerRoom.value),
            maxRoomsPerUser: parseInt(form.maxRoomsPerUser.value),
            maxMessageLength: parseInt(form.maxMessageLength.value),
            messageRateLimit: parseInt(form.messageRateLimit.value),
            requireEmailVerification: form.requireEmailVerification.checked,
            allowGuestAccess: form.allowGuestAccess.checked,
            enableProfanityFilter: form.enableProfanityFilter.checked
        };

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify(settings)
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Settings updated successfully', 'success');
            } else {
                showMessage(data.message || 'Error updating settings', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error updating settings', 'error');
        }
    });

    // Reset to defaults
    if (resetButton) {
        resetButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset all settings to their default values?')) {
                const settings = {
                    maxUsersPerRoom: 50,
                    maxRoomsPerUser: 5,
                    maxMessageLength: 500,
                    messageRateLimit: 60,
                    requireEmailVerification: false,
                    allowGuestAccess: true,
                    enableProfanityFilter: true
                };

                try {
                    const response = await fetch('/api/admin/settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                        },
                        body: JSON.stringify(settings)
                    });

                    if (response.ok) {
                        await loadSettings(); // Reload form with default values
                        showMessage('Settings reset to defaults', 'success');
                    } else {
                        showMessage('Error resetting settings', 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showMessage('Error resetting settings', 'error');
                }
            }
        });
    }

    // Show message helper
    function showMessage(text, type = 'info') {
        if (!message) return;
        message.textContent = text;
        message.className = `alert alert-${type}`;
        message.style.display = 'block';
        setTimeout(() => {
            message.style.display = 'none';
        }, 5000);
    }

    // Load settings when initialized
    await loadSettings();
}

// Export for use in admin.js
window.initSystemSettings = initSystemSettings;
