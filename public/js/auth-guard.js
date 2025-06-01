const AuthGuard = {
  getUser() {
    return JSON.parse(localStorage.getItem('user'));
  },

  getAuthToken() {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find((cookie) =>
      cookie.trim().startsWith('clientToken=')
    );
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

  // Remove client-side JWT validation. Use server-side endpoint for validation.
  async isTokenValid() {
    const token = this.getAuthToken();
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.valid;
    } catch (e) {
      // Handle network or decoding errors gracefully
      return false;
    }
  },

  async checkAuth() {
    const user = this.getUser();
    const publicPages = ['/login', '/register'];
    const adminPages = [
      '/admin-settings',
      '/admin/dashboard',
      '/admin/user-management',
      '/admin/room-management',
      '/admin/system-settings',
      '/admin/system-logs',
      '/admin/ai-chat',
      '/admin/text-to-voice',
      '/admin/text-to-image',
    ];
    const currentPage = window.location.pathname;
    const isChatPage = currentPage === '/chat';
    const isAdminPage = adminPages.some((page) => currentPage.startsWith(page));

    // Allow non-admins to access admin pages if only using public GET endpoints
    const publicAdminPages = [
      '/admin-settings',
      '/admin/ai-chat',
      '/admin/text-to-image',
      '/admin/text-to-voice',
    ];
    if (isAdminPage && publicAdminPages.includes(currentPage)) {
      if (!user || !this.isTokenValid()) {
        this.logout();
        return false;
      }
      // Do not require isAdmin for these pages
    } else if (isAdminPage) {
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

    adminElements.forEach((element) => {
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
  },
};

// Check authentication and admin status on page load
document.addEventListener('DOMContentLoaded', () => {
  AuthGuard.checkAuth();
  AuthGuard.checkAdminElements();
});

window.AuthGuard = AuthGuard; // Make it globally available
