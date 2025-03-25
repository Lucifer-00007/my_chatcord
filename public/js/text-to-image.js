document.addEventListener('DOMContentLoaded', () => {
    const styleSelect = document.getElementById('image-style');
    const sizeSelect = document.getElementById('image-size');
    const generateBtn = document.getElementById('generate-btn');

    async function loadGlobalSettings() {
        try {
            // Load sizes
            const sizesRes = await fetch('/api/admin/image-settings/sizes', {
                headers: { 'Authorization': `Bearer ${AuthGuard.getAuthToken()}` }
            });
            const sizesData = await sizesRes.json();
            
            // Load styles
            const stylesRes = await fetch('/api/admin/image-settings/styles', {
                headers: { 'Authorization': `Bearer ${AuthGuard.getAuthToken()}` }
            });
            const stylesData = await stylesRes.json();

            // Update dropdowns
            styleSelect.innerHTML = stylesData.values
                .filter(style => style.isActive)
                .map(style => `
                    <option value="${style.id}">${style.name}</option>
                `).join('');

            sizeSelect.innerHTML = sizesData.values
                .filter(size => size.isActive)
                .map(size => `
                    <option value="${size.value.width}">${size.name}</option>
                `).join('');
        } catch (err) {
            console.error('Error loading settings:', err);
            showNotification('Failed to load image settings', 'error');
        }
    }

    // Load global settings instead of API-specific settings
    loadGlobalSettings();
});
