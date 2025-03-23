const AuthGuard = {
    getUser() {
        return JSON.parse(localStorage.getItem('user'));
    },

    getAuthToken() {
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('clientToken='));
        return tokenCookie ? tokenCookie.split('=')[1].trim() : null;
    },

    getRoomToken() {
        return sessionStorage.getItem('roomToken');
    },

    isAuthenticated() {
        return !!this.getUser() && !!this.getAuthToken();
    },

    isInRoom() {
        return !!this.getRoomToken();
    },

    checkAuth() {
        const user = this.getUser();
        const publicPages = ['/login', '/register'];
        const currentPage = window.location.pathname;
        const isChatPage = currentPage === '/chat';

        if (isChatPage && (!user || !this.isInRoom())) {
            window.location.href = '/login';
            return false;
        }

        if (!user && !publicPages.includes(currentPage)) {
            window.location.href = '/login';
            return false;
        }

        if (user && publicPages.includes(currentPage)) {
            window.location.href = '/selectRoom';
            return false;
        }

        return true;
    },

    checkAdminElements() {
        const user = this.getUser();
        const adminElements = document.querySelectorAll('.nav-item.admin');
        
        console.log('Checking admin status:', { 
            user, 
            isAdmin: user?.isAdmin,
            elements: adminElements.length 
        });
        
        adminElements.forEach(element => {
            if (user?.isAdmin) {
                element.style.display = 'inline-block';
                console.log('Admin element shown');
            } else {
                element.style.display = 'none';
                console.log('Admin element hidden');
            }
        });
    },

    logout() {
        localStorage.removeItem('user');
        sessionStorage.removeItem('roomToken');
        window.location.href = '/login';
    }
};

// Check authentication and admin status on page load
document.addEventListener('DOMContentLoaded', () => {
    AuthGuard.checkAuth();
    AuthGuard.checkAdminElements();
});

window.AuthGuard = AuthGuard; // Make it globally available
