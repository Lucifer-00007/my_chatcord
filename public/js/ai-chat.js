document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatMessages = document.querySelector('.chat-messages');
    const modelName = document.getElementById('model-name');
    const aiSettings = document.getElementById('ai-settings');

    // Load AI settings from server
    async function loadAISettings() {
        try {
            const res = await fetch('/api/ai/settings', {
                headers: {
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                }
            });
            const settings = await res.json();
            updateSettingsDisplay(settings);
        } catch (err) {
            console.error('Error loading AI settings:', err);
        }
    }

    function updateSettingsDisplay(settings) {
        modelName.textContent = settings.model;
        aiSettings.innerHTML = `
            <li>Temperature: ${settings.temperature}</li>
            <li>Max Tokens: ${settings.maxTokens}</li>
            <li>Context: Previous ${settings.contextMessages} messages</li>
        `;
    }

    // Handle chat form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const msg = e.target.elements.msg.value.trim();
        if (!msg) return;

        // Add user message to chat
        addMessageToChat('You', msg);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify({ message: msg })
            });

            const data = await res.json();
            if (res.ok) {
                // Add AI response to chat
                addMessageToChat('AI', data.response);
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            console.error('AI chat error:', err);
            addMessageToChat('System', 'Failed to get AI response. Please try again.');
        }

        // Clear input and scroll to bottom
        e.target.elements.msg.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
    }

    // Load initial settings
    loadAISettings();
});
