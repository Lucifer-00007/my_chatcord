// Remove duplicate auth checks and use AuthGuard
const user = AuthGuard.getUser();
const roomToken = AuthGuard.getRoomToken();
const authToken = AuthGuard.getAuthToken();

const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

if (!user || !roomToken || !authToken) {
    AuthGuard.logout();
}

// Add token refresh logic
const REFRESH_THRESHOLD = 50 * 60 * 1000; // 50 minutes

function checkTokenExpiration() {
    if (roomToken) {
        const payload = JSON.parse(atob(roomToken.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        const timeUntilExp = exp - Date.now();

        if (timeUntilExp < REFRESH_THRESHOLD) {
            // Refresh room token
            fetch('/api/rooms/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                },
                body: JSON.stringify({ room: encodeURIComponent(payload.room) })
            })
                .then(res => res.json())
                .then(data => {
                    sessionStorage.setItem('roomToken', data.roomToken);
                })
                .catch(err => {
                    console.error('Failed to refresh token:', err);
                    alert('Your session will expire soon. Please rejoin the room.');
                });
        }
    }
}

// Check token every 5 minutes
setInterval(checkTokenExpiration, 5 * 60 * 1000);

// Start first token check
checkTokenExpiration();

let roomId = null;
if (roomToken) {
    const payload = JSON.parse(atob(roomToken.split('.')[1]));
    roomId = payload.room; // This is the ObjectId of the room
}

try {
    const tokenData = JSON.parse(atob(roomToken.split('.')[1]));
    const { username, room } = tokenData;

    // Fetch and display the actual room name
    (async () => {
        try {
            const res = await fetch(`/api/rooms/${room}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (res.ok) {
                const roomObj = await res.json();
                if (roomObj && roomObj.name) {
                    outputRoomName(roomObj.name);
                } else {
                    outputRoomName('Unknown Room');
                }
            } else {
                outputRoomName('Unknown Room');
            }
        } catch (err) {
            outputRoomName('Unknown Room');
        }
    })();

    // Initialize socket with auth tokens
    const socket = io({
        auth: {
            token: authToken,
            roomToken
        },
        transports: ['websocket']
    });

    // Load message history using async IIFE
    (async () => {
        try {
            const res = await fetch(`/api/rooms/${encodeURIComponent(room)}/messages`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (res.ok) {
                const messages = await res.json();
                messages.forEach(msg => {
                    const time = new Date(msg.createdAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })
                    const date = new Date(msg.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    })
                    outputMessage({
                        username: msg.username,
                        text: msg.content,
                        dateTime: `${time}, ${date}`,
                    });
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    })();

    // Enhanced connection logging
    socket.on('connect', () => {
        socket.emit('joinRoom', { username, room });
    });

    // Enhanced error handling
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        if (error.message.includes('authentication')) {
            localStorage.removeItem('user');
            sessionStorage.removeItem('roomToken');
            alert('Session expired. Please login again.');
            window.location.href = '/login';
        } else if (error.message.includes('blocked')) {
            // Handle room block error
            alert(error.message);
            window.location.href = '/selectRoom';
        }
    });

    // Get room and users - moved outside joinRoom since room joining happens on authentication
    socket.on('roomUsers', ({ room, users }) => {
        outputUsers(users);
    });

    // Message from server
    socket.on('message', (message) => {
        console.log('Message received:', message);
        outputMessage(message);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error('Socket general error:', error);
        alert(error);
    });

    // Message submit
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get message text
        let msg = e.target.elements.msg.value;

        msg = msg.trim();

        if (!msg) {
            return false;
        }

        try {
            // Emit message to server
            socket.emit('chatMessage', { msg, roomId });

            // Clear input and focus
            e.target.elements.msg.value = '';
            e.target.elements.msg.focus();
            // Reset textarea height and overflow
            e.target.elements.msg.style.height = '';
            e.target.elements.msg.style.overflowY = 'hidden';
        } catch (err) {
            console.error('Error sending message:', err);
            // Show error to user
            const errorDiv = document.createElement('div');
            errorDiv.classList.add('error-message');
            errorDiv.textContent = 'Failed to send message. Please try again.';
            chatMessages.appendChild(errorDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });

    // Enable Shift+Enter for new line in input
    const msgInput = chatForm.elements.msg;
    if (msgInput) {
        msgInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Only submit if not Shift+Enter
                e.preventDefault();
                chatForm.requestSubmit();
                // Reset textarea height and overflow
                this.style.height = '';
                this.style.overflowY = 'hidden';
            } else if (e.key === 'Enter' && e.shiftKey) {
                // Let browser insert newline (default)
            }
        });

        // Auto-grow textarea height
        msgInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 160) + 'px'; // 160px = ~6 lines
            this.style.overflowY = this.scrollHeight > 160 ? 'auto' : 'hidden';
        });
    }

    // Clean up on leave
    document.getElementById('leave-btn').addEventListener('click', () => {
        const leaveRoom = confirm('Are you sure you want to leave the chatroom?');
        if (leaveRoom) {
            sessionStorage.removeItem('roomToken');
            window.location.href = '/selectRoom';
        }
    });
} catch (err) {
    console.error('Chat initialization error:', err);
    alert('Failed to initialize chat. Returning to room selection.');
    window.location.href = '/selectRoom';
}

// Output message to DOM
function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');
    const p = document.createElement('p');
    p.classList.add('meta');
    p.innerText = message.username;
    p.innerHTML += `<span class="msg-time"> ${message.dateTime}</span>`;
    div.appendChild(p);
    const para = document.createElement('p');
    para.classList.add('text');
    para.innerText = message.text;
    div.appendChild(para);
    document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
    roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
    if (!userList) return; // Prevent error if not on chat page
    userList.innerHTML = '';
    users.forEach((user) => {
        const li = document.createElement('li');
        li.innerText = user.username;
        userList.appendChild(li);
    });
}
