document.addEventListener('DOMContentLoaded', async () => {
    const user = AuthGuard.getUser();
    const usernameInput = document.getElementById('username');
    const roomSelect = document.getElementById('room');
    
    console.log('SelectRoom init:', { user, usernameInput: !!usernameInput });

    if (!user) {
        window.location.href = '/login';
        return;
    }

    if (usernameInput) {
        usernameInput.value = user.username;
        usernameInput.setAttribute('readonly', true);
    }

    // Load rooms from server
    if (roomSelect) {
        try {
            const response = await fetch('/api/rooms', {
                headers: {
                    'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                }
            });
            const rooms = await response.json();
            
            roomSelect.innerHTML = rooms.map(room => `
                <option value="${room.name}">${room.name} - ${room.topic}</option>
            `).join('');
        } catch (err) {
            console.error('Error loading rooms:', err);
            // Add a default option if loading fails
            roomSelect.innerHTML = '<option value="">Failed to load rooms</option>';
        }
    }

    // Handle admin link visibility
    const adminLink = document.querySelector('a[href="/admin-settings"]');
    if (adminLink && !user?.isAdmin) {
        adminLink.classList.add('disabled');
    }

    // Handle form submission
    const joinForm = document.getElementById('join-form');
    if (joinForm) {
        joinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = joinForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            const room = roomSelect?.value;
            if (!room) {
                console.error('Room not selected');
                submitButton.disabled = false;
                return;
            }
            
            try {
                const res = await fetch('/api/rooms/join', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AuthGuard.getAuthToken()}`
                    },
                    body: JSON.stringify({ room: encodeURIComponent(room) })
                });

                const data = await res.json();
                if (res.ok) {
                    sessionStorage.setItem('roomToken', data.roomToken);
                    window.location.href = '/chat';
                } else {
                    // Show error message
                    const infoMsg = document.querySelector('.info-msg');
                    if (infoMsg) {
                        if (res.status === 403 && data.blockEndDate) {
                            const endDate = new Date(data.blockEndDate).toLocaleDateString();
                            infoMsg.textContent = `${data.message} until ${endDate} !`;
                        } else {
                            infoMsg.textContent = data.message || 'Failed to join room';
                        }
                        infoMsg.style.color = 'var(--warning-color)';
                    }
                }
            } catch (err) {
                console.error('Error joining room:', err);
                const infoMsg = document.querySelector('.info-msg');
                if (infoMsg) {
                    infoMsg.textContent = 'Failed to join room. Please try again.';
                    infoMsg.style.color = 'var(--warning-color)';
                }
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AuthGuard.logout();
        });
    }
});
