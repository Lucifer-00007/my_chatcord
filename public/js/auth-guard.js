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

    isTokenValid() {
        const token = this.getAuthToken();
        if (!token) return false;
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        try {
            const payload = JSON.parse(atob(parts[1]));
            if (!payload.exp) return false;
            // Check expiration (exp is in seconds)
            if (Date.now() >= payload.exp * 1000) return false;
            return true;
        } catch (e) {
            return false;
        }
    },

    checkAuth() {
        const user = this.getUser();
        const publicPages = ['/login', '/register'];
        const adminPages = ['/admin-settings', '/admin/dashboard', '/admin/user-management', '/admin/room-management', 
                           '/admin/system-settings', '/admin/system-logs', '/admin/ai-chat', '/admin/text-to-voice', 
                           '/admin/text-to-image'];
        const currentPage = window.location.pathname;
        const isChatPage = currentPage === '/chat';
        const isAdminPage = adminPages.some(page => currentPage.startsWith(page));

        // Check admin access
        if (isAdminPage) {
            if (!user || !user.isAdmin || !this.isTokenValid()) {
                this.logout();
                return false;
            }
        }

        if (isChatPage && (!user || !this.isInRoom() || !this.isTokenValid())) {
            this.logout();
            return false;
        }

        if ((!user || !this.isTokenValid()) && !publicPages.includes(currentPage)) {
            this.logout();
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
        
        adminElements.forEach(element => {
            if (user?.isAdmin) {
                element.style.display = 'inline-block';
            } else {
                element.style.display = 'none';
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
