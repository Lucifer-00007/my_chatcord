document.addEventListener('DOMContentLoaded', () => {
    const user = AuthGuard.getUser();
    const usernameInput = document.getElementById('username');
    
    console.log('SelectRoom init:', { user, usernameInput: !!usernameInput });

    if (!user) {
        window.location.href = '/login';
        return;
    }

    if (usernameInput) {
        usernameInput.value = user.username;
        usernameInput.setAttribute('readonly', true);
    }

    // Remove section handling since it's now handled by separate pages
    const adminLink = document.querySelector('a[href="/admin-settings"]');
    if (adminLink && !user?.isAdmin) {
        adminLink.classList.add('disabled');
    }

    // Handle form submission
    const joinForm = document.getElementById('join-form');
    if (joinForm) {
        joinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const room = document.getElementById('room')?.value;
            if (!room) {
                console.error('Room not selected');
                return;
            }
            
            try {
                const res = await fetch('/api/channels/join', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${document.cookie.split('=')[1]}`
                    },
                    body: JSON.stringify({ room })
                });

                const data = await res.json();
                if (res.ok) {
                    sessionStorage.setItem('roomToken', data.roomToken);
                    window.location.href = '/chat';
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error('Error joining room:', err);
                alert('Failed to join room');
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
