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
  const generateBtn = document.getElementById('generate-image-btn');
  const modelSelect = document.getElementById('model-select');

  async function loadActiveImageApis() {
    try {
      const res = await fetch('/api/image-apis/public-active', {
        headers: {
          Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
        },
      });
      if (res.status === 403) {
        modelSelect.innerHTML =
          '<option value="">No Active APIs (access denied)</option>';
        generateBtn.disabled = true;
        return;
      }
      const apis = await res.json();
      // Only id and name are available from the public endpoint
      if (apis.length > 0) {
        modelSelect.innerHTML = `
                    <option value="">Select Model</option>
                    ${apis
                      .map(
                        (api) => `
                        <option value="${api._id}">${api.name}</option>
                    `
                      )
                      .join('')}
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
      const sizesRes = await fetch('/api/image-settings/sizes', {
        headers: { Authorization: `Bearer ${AuthGuard.getAuthToken()}` },
      });
      let sizesData = { values: [] };
      if (sizesRes.status === 403) {
        showNotification(
          'Image sizes are not available for your account',
          'warning'
        );
      } else {
        sizesData = await sizesRes.json();
      }

      // Load styles
      const stylesRes = await fetch('/api/image-settings/styles', {
        headers: { Authorization: `Bearer ${AuthGuard.getAuthToken()}` },
      });
      let stylesData = { values: [] };
      if (stylesRes.status === 403) {
        showNotification(
          'Image styles are not available for your account',
          'warning'
        );
      } else {
        stylesData = await stylesRes.json();
      }

      // Update dropdowns
      styleSelect.innerHTML = stylesData.values
        .filter((style) => style.isActive)
        .map(
          (style) => `
                    <option value="${style.id}">${style.name}</option>
                `
        )
        .join('');

      sizeSelect.innerHTML = sizesData.values
        .filter((size) => size.isActive)
        .map((size) => {
          // Fallback if size.value is missing
          const value = size.id ? size.id : '';
          const label = size.label ? size.label : '';
          return `<option value="${value}">${label}</option>`;
        })
        .join('');

      // Enable/disable generate button based on available options
      generateBtn.disabled =
        !styleSelect.options.length || !sizeSelect.options.length;
    } catch (err) {
      console.error('Error loading settings:', err);
      (typeof showNotification === 'function'
        ? showNotification
        : function (msg, type) {
            alert(msg);
          })('Failed to load image settings', 'error');
    }
  }

  // Add model selection handler
  modelSelect.addEventListener('change', () => {
    generateBtn.disabled = !modelSelect.value;
    // Add visual feedback
    modelSelect.parentElement.classList.toggle(
      'has-value',
      !!modelSelect.value
    );
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
          Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
        },
        body: JSON.stringify({
          prompt,
          apiId,
          size,
          style,
        }),
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
        if (!res.ok)
          throw new Error(data.message || 'Failed to generate image');

        if (!data.imageUrl) {
          throw new Error('No image URL received');
        }
        imageUrl = data.imageUrl;
      }

      // Display the image
      imageResult.innerHTML = `
                <div class="image-result-box">
                    <div class="generated-image">
                        <img src="${imageUrl}" alt="Generated image" loading="lazy">
                    </div>
                </div>
                <div class="image-actions">
                    <button onclick="downloadImage('${imageUrl}')" class="btn btn-download">
                        <i class="fas fa-download"></i> Download Image
                    </button>
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

// Ensure showNotification is defined for this file
if (typeof showNotification !== 'function') {
  function showNotification(message, type = 'info') {
    alert(message);
  }
}
