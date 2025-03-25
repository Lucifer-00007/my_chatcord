// Make downloadImage globally available
function downloadImage(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.addEventListener('DOMContentLoaded', () => {
    const styleSelect = document.getElementById('image-style');
    const sizeSelect = document.getElementById('image-size');
    const generateBtn = document.getElementById('generate-btn');
    const modelSelect = document.getElementById('model-select');

    async function loadActiveImageApis() {
        try {
            const res = await fetch('/api/admin/image-apis', {
                headers: {
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                }
            });
            const apis = await res.json();
            
            // Filter active APIs
            const activeApis = apis.filter(api => api.isActive);

            if (activeApis.length > 0) {
                modelSelect.innerHTML = `
                    <option value="">Select Model</option>
                    ${activeApis.map(api => `
                        <option value="${api._id}">${api.name}</option>
                    `).join('')}
                `;
                generateBtn.disabled = !modelSelect.value;
            } else {
                modelSelect.innerHTML = '<option value="">No Active APIs</option>';
                generateBtn.disabled = true;
            }
        } catch (err) {
            console.error('Error loading image APIs:', err);
            showNotification('Failed to load image APIs', 'error');
        }
    }

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

            // Enable/disable generate button based on available options
            generateBtn.disabled = !styleSelect.options.length || !sizeSelect.options.length;
        } catch (err) {
            console.error('Error loading settings:', err);
            showNotification('Failed to load image settings', 'error');
        }
    }

    // Add model selection handler
    modelSelect.addEventListener('change', () => {
        generateBtn.disabled = !modelSelect.value;
        // Add visual feedback
        modelSelect.parentElement.classList.toggle('has-value', !!modelSelect.value);
    });

    // Add image generation handler
    generateBtn.addEventListener('click', async () => {
        const prompt = document.getElementById('image-prompt').value.trim();
        const style = styleSelect.value;
        const size = sizeSelect.value;
        const apiId = modelSelect.value;
        const loadingIndicator = document.getElementById('loading-indicator');
        const imageResult = document.getElementById('image-result');

        // Enhanced validation with specific error messages
        if (!apiId) {
            showNotification('Please select an AI model first', 'error');
            modelSelect.parentElement.classList.add('error');
            modelSelect.focus();
            return;
        }

        if (!prompt) {
            showNotification('Input prompt is blank!', 'error');
            document.getElementById('image-prompt').focus();
            return;
        }

        if (!style || !size) {
            showNotification('Please select both style and size', 'error');
            return;
        }

        try {
            // Show loading state
            generateBtn.disabled = true;
            loadingIndicator.style.display = 'flex';
            loadingIndicator.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                <span>Generating your image...</span>
            `;
            imageResult.innerHTML = '';

            console.log('Generating image:', { prompt, apiId, size, style });

            const res = await fetch('/api/images/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify({
                    prompt,
                    apiId,
                    size,
                    style
                })
            });

            // Check content type to determine response format
            const contentType = res.headers.get('content-type');
            console.log('Response content type:', contentType);

            let imageUrl;
            
            if (contentType?.includes('image/')) {
                // Handle binary image response (both direct binary and decoded base64)
                const blob = await res.blob();
                imageUrl = URL.createObjectURL(blob);
            } else {
                // Handle JSON response with URL
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Failed to generate image');
                
                if (!data.imageUrl) {
                    throw new Error('No image URL received');
                }
                imageUrl = data.imageUrl;
            }

            // Display the image
            imageResult.innerHTML = `
                <div class="generated-image">
                    <img src="${imageUrl}" alt="Generated image" loading="lazy">
                    <div class="image-actions">
                        <button onclick="downloadImage('${imageUrl}')" class="btn">
                            <i class="fas fa-download"></i> Download Original
                        </button>
                    </div>
                </div>
            `;

        } catch (err) {
            // Update error display
            console.error('Image generation error:', err);
            showNotification(err.message || 'Failed to generate image', 'error');
            imageResult.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to generate image</p>
                    <p class="error-details">${err.message || 'Unknown error occurred'}</p>
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
            loadingIndicator.style.display = 'none';
        }
    });

    // Initialize
    loadActiveImageApis();
    loadGlobalSettings();
});

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
