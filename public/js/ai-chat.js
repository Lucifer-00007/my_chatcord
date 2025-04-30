document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatMessages = document.querySelector('.chat-messages');
    const modelSelect = document.getElementById('model-select');
    const submitBtn = chatForm ? chatForm.querySelector('button') : null; // Changed from button[type="submit"] to button

    // Redirect to login if not authenticated or token is invalid
    if (!window.AuthGuard || !AuthGuard.isAuthenticated() ||
        (typeof AuthGuard.isTokenValid === 'function' && !AuthGuard.isTokenValid())) {
        window.location.href = '/login';
        return;
    }

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
            const res = await fetch('/api/ai-apis/active', {
                headers: {
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                }
            });
            if (res.status === 403) {
                modelSelect.innerHTML = '<option value="">No AI models available (access denied)</option>';
                submitBtn.disabled = true;
                return;
            }

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

    let currentSession = null;

    // Add function to load chat history
    async function loadChatHistory() {
        try {
            const res = await fetch('/api/ai/sessions', {
                headers: {
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                }
            });
            const sessions = await res.json();
            
            const historyList = document.getElementById('chat-history');
            historyList.innerHTML = sessions.map(session => `
                <li class="chat-session ${currentSession?._id === session._id ? 'active' : ''}" 
                    data-id="${session._id}">
                    <i class="fas fa-comments"></i>
                    <span>${session.title}</span>
                </li>
            `).join('');

            // Add click handlers
            document.querySelectorAll('.chat-session').forEach(el => {
                el.addEventListener('click', () => loadSession(el.dataset.id));
            });
        } catch (err) {
            console.error('Error loading chat history:', err);
        }
    }

    // Add function to load specific session
    async function loadSession(sessionId) {
        try {
            const res = await fetch(`/api/ai/sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                }
            });
            const session = await res.json();
            
            currentSession = session;
            chatMessages.innerHTML = '';
            
            // Load messages
            session.messages.forEach(msg => {
                if (msg.role !== 'system') {
                    addMessageToChat(
                        msg.role === 'user' ? 'You' : 'AI',
                        msg.content,
                        msg.role === 'assistant' ? msg.model : null
                    );
                }
            });

            // Update UI
            document.querySelectorAll('.chat-session').forEach(el => {
                el.classList.toggle('active', el.dataset.id === sessionId);
            });
        } catch (err) {
            console.error('Error loading session:', err);
        }
    }

    // Add new chat button
    const newChatBtn = document.createElement('button');
    newChatBtn.className = 'btn btn-new-chat';
    newChatBtn.innerHTML = '<i class="fas fa-plus"></i> New Chat';
    document.querySelector('.chat-sidebar').insertBefore(
        newChatBtn,
        document.querySelector('.chat-sidebar h3')
    );

    newChatBtn.addEventListener('click', () => {
        currentSession = null;
        chatMessages.innerHTML = '';
        document.querySelectorAll('.chat-session').forEach(el => {
            el.classList.remove('active');
        });
    });

    // Handle chat form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const startTime = Date.now();
        
        const selectedApi = modelSelect.value;
        console.log('Form submitted:', {
            apiId: selectedApi,
            modelName: modelSelect.options[modelSelect.selectedIndex]?.text,
            sessionId: currentSession?._id
        });

        if (!selectedApi) {
            showNotification('Please select an AI model first', 'error');
            return;
        }

        const msgInput = e.target.elements.msg;
        const msg = msgInput.value.trim();
        if (!msg) return;

        // Add user message to chat
        addMessageToChat('You', msg);
        msgInput.value = '';
        msgInput.disabled = true;
        
        const thinkingMessage = addThinkingMessage();
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            console.log('Preparing request:', {
                message: msg,
                apiId: selectedApi,
                sessionId: currentSession?._id,
                timestamp: new Date().toISOString()
            });

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify({ 
                    message: msg,
                    apiId: selectedApi,
                    sessionId: currentSession?._id
                })
            });

            console.log('Response received:', {
                status: res.status,
                ok: res.ok,
                statusText: res.statusText,
                elapsed: `${Date.now() - startTime}ms`
            });

            const data = await res.json();
            console.log('Response data:', {
                hasResponse: !!data.response,
                responseLength: data.response?.length,
                model: data.model,
                sessionId: data.session?._id,
                elapsed: `${Date.now() - startTime}ms`
            });

            // Remove thinking message
            thinkingMessage.remove();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to get AI response');
            }

            // Add AI response message
            if (data.response) {
                addMessageToChat('AI', data.response, data.model);
            } else {
                throw new Error('No response received from AI');
            }

            // Update session and history
            currentSession = data.session;
            await loadChatHistory();

        } catch (err) {
            console.error('Chat request error:', {
                error: err.message,
                stack: err.stack,
                timings: {
                    totalElapsed: `${Date.now() - startTime}ms`
                }
            });
            
            thinkingMessage?.remove();
            showNotification(err.message || 'Failed to get AI response', 'error');
            addMessageToChat('System', 'Error: Failed to get AI response. Please try again.');
        } finally {
            msgInput.disabled = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
            msgInput.focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });

    function addMessageToChat(sender, text, model = null) {
        const div = document.createElement('div');
        div.classList.add('message');
        if (sender === 'AI') div.classList.add('ai-message');
        
        // Format the model name to be more user-friendly
        const modelDisplay = model ? ` (${model})` : '';
        
        let renderedText = text;
        if (sender === 'AI' && window.marked) {
            renderedText = marked.parse(text);
            console.log('[addMessageToChat] Marked parsed markdown:', renderedText);
        }
        
        div.innerHTML = `
            <p class="meta">${sender}${modelDisplay} <span>${new Date().toLocaleTimeString()}</span></p>
            <p class="text">${sender === 'AI' && window.marked ? `<div class="ai-markdown">${renderedText}</div>` : text}</p>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Highlight.js debug
        if (window.hljs) {
            console.log('[addMessageToChat] hljs found, highlighting blocks...');
            div.querySelectorAll('pre code').forEach((block, idx) => {
                console.log(`[addMessageToChat] Highlighting code block #${idx + 1}:`, block.textContent);
                hljs.highlightElement(block);
            });
        } else {
            console.warn('[addMessageToChat] highlight.js (hljs) not found on window!');
        }
        
        addCopyButtons();
    }

    function showNotification(message, type = 'info') {
        // Add your notification logic here
        alert(message); // Simple fallback
    }

    // Add new function to show thinking message
    function addThinkingMessage() {
        const div = document.createElement('div');
        div.className = 'message thinking';
        const selectedApi = document.querySelector('#model-select option:checked');
        const modelName = selectedApi ? selectedApi.textContent : 'AI';
        
        div.innerHTML = `
            <p class="meta">AI (${modelName}) <span>${new Date().toLocaleTimeString()}</span></p>
            <p class="text">
                <i class="fas fa-circle-notch fa-spin"></i> Thinking...
            </p>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }

    // Add new function to add copy buttons
    function addCopyButtons() {
        document.querySelectorAll('.ai-markdown pre code').forEach(block => {
            // Avoid duplicate buttons
            if (block.parentElement.querySelector('.copy-btn')) return;
            const btn = document.createElement('button');
            btn.className = 'copy-btn';
            btn.innerHTML = '<i class="far fa-clipboard"></i> Copy';
            btn.onclick = () => {
                navigator.clipboard.writeText(block.textContent);
                btn.innerHTML = '<i class="fa fa-check"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="far fa-clipboard"></i> Copy';
                }, 1500);
            };
            block.parentElement.style.position = 'relative';
            block.parentElement.appendChild(btn);
        });
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

    // Initial load
    loadChatHistory();
    
    if (window.marked && window.hljs) {
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            }
        });
    }
});
