document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatMessages = document.querySelector('.chat-messages');
    const modelSelect = document.getElementById('model-select');
    const submitBtn = chatForm ? chatForm.querySelector('button') : null; // Changed from button[type="submit"] to button

    // Ensure the form and button exist
    if (!chatForm || !submitBtn) {
        console.error('Required elements not found:', { 
            form: !!chatForm, 
            button: !!submitBtn,
            formButtons: chatForm ? chatForm.querySelectorAll('button').length : 0
        });
        return;
    }

    // Load available AI models
    async function loadAvailableModels() {
        try {
            console.log('Fetching available AI models');
            const res = await fetch('/api/admin/ai-apis/active', {
                headers: {
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                }
            });

            const apis = await res.json();
            console.log('Available APIs:', apis);

            if (!apis.length) {
                modelSelect.innerHTML = '<option value="">No AI models available</option>';
                submitBtn.disabled = true;
                return;
            }

            modelSelect.innerHTML = `
                <option value="">Select AI Model</option>
                ${apis.map(api => `
                    <option value="${api._id}" data-endpoint="${api.endpoint}">
                        ${api.name}
                    </option>
                `).join('')}
            `;
        } catch (err) {
            console.error('Error loading AI models:', err);
            modelSelect.innerHTML = '<option value="">Error loading models</option>';
            if (submitBtn) submitBtn.disabled = true;
        }
    }

    // Handle chat form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const selectedApi = modelSelect.value;
        if (!selectedApi) {
            showNotification('Please select an AI model first', 'error');
            return;
        }

        const msgInput = e.target.elements.msg;
        const msg = msgInput.value.trim();
        if (!msg) return;

        // Add user message to chat
        addMessageToChat('You', msg);
        
        // Clear input immediately after sending
        msgInput.value = '';
        
        // Add thinking message
        const thinkingMessage = addThinkingMessage();

        try {
            // Disable input while processing
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify({ 
                    message: msg,
                    apiId: selectedApi
                })
            });

            const data = await res.json();
            console.log('AI Response:', data);

            // Remove thinking message
            thinkingMessage.remove();

            if (res.ok) {
                addMessageToChat('AI', data.response);
            } else {
                throw new Error(data.message || 'Failed to get AI response');
            }
        } catch (err) {
            console.error('AI chat error:', err);
            // Remove thinking message
            thinkingMessage.remove();
            addMessageToChat('System', 'Failed to get AI response. Please try again.');
        } finally {
            // Re-enable input
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
            }
            // Keep only the scroll
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });

    function addMessageToChat(sender, text) {
        const div = document.createElement('div');
        div.classList.add('message');
        if (sender === 'AI') div.classList.add('ai-message');
        
        div.innerHTML = `
            <p class="meta">${sender} <span>${new Date().toLocaleTimeString()}</span></p>
            <p class="text">${text}</p>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showNotification(message, type = 'info') {
        // Add your notification logic here
        alert(message); // Simple fallback
    }

    // Add new function to show thinking message
    function addThinkingMessage() {
        const div = document.createElement('div');
        div.className = 'message thinking';
        div.innerHTML = `
            <p class="meta">AI <span>${new Date().toLocaleTimeString()}</span></p>
            <p class="text">
                <i class="fas fa-circle-notch fa-spin"></i> Thinking...
            </p>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }

    // Load models when page loads
    loadAvailableModels();

    // Enhanced model selection handling
    modelSelect.addEventListener('focus', () => {
        modelSelect.parentElement.classList.add('focused');
    });

    modelSelect.addEventListener('blur', () => {
        modelSelect.parentElement.classList.remove('focused');
    });

    modelSelect.addEventListener('change', () => {
        if (submitBtn) {
            submitBtn.disabled = !modelSelect.value;
            // Add visual feedback
            modelSelect.parentElement.classList.toggle('has-value', !!modelSelect.value);
        }
    });
});
