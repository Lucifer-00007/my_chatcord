document.addEventListener('DOMContentLoaded', () => {
    const user = AuthGuard.getUser();
    if (user?.username) {
        const usernameInput = document.getElementById('username');
        usernameInput.value = user.username;
        usernameInput.setAttribute('readonly', true);
    } else {
        window.location.href = '/login';
    }

    // Handle form submission
    const joinForm = document.getElementById('join-form');
    joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const room = document.getElementById('room').value;
        
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
                // Store room token in sessionStorage
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

    // Handle logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        AuthGuard.logout();
    });
});
