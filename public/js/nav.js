// Ensure CSRF token helper is imported from utils.js
import { getCsrfToken } from './utils.js'; // adjust path as needed

document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');

  // Add logout handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AuthGuard.getAuthToken()}`,
            'X-CSRF-Token': await getCsrfToken(),
          },
        });
        if (res.ok) {
          AuthGuard.logout(); // This will clear storage and redirect to login
        } else {
          console.error('Logout failed:', res.status);
          // Fallback logout if server request fails
          AuthGuard.logout();
        }
      } catch (err) {
        console.error('Logout error:', err);
        // Fallback logout if request fails
        AuthGuard.logout();
      }
    });
  }

  if (navbar) {
    // Insert hamburger button if not exists
    if (!navbar.querySelector('.hamburger')) {
      const hamburgerBtn = document.createElement('button');
      hamburgerBtn.className = 'hamburger';
      hamburgerBtn.innerHTML = `
                <span></span>
                <span></span>
                <span></span>
            `;

      // Insert hamburger before the first child of navbar
      navbar.insertBefore(hamburgerBtn, navbar.firstChild);
    }

    const hamburger = navbar.querySelector('.hamburger');
    const navMenu = navbar.querySelector('.nav-menu');

    if (hamburger && navMenu) {
      const navLinks = document.querySelectorAll('.nav-item');

      function toggleMenu(force = null) {
        console.log('Toggle menu called with force:', force);
        const wasActive = navMenu.classList.contains('active');

        if (force !== null) {
          hamburger.classList.toggle('active', force);
          navMenu.classList.toggle('active', force);
        } else {
          hamburger.classList.toggle('active');
          navMenu.classList.toggle('active');
        }

        const isNowActive = navMenu.classList.contains('active');
        console.log('Menu state changed:', { wasActive, isNowActive });
      }

      // Toggle menu on hamburger click
      hamburger.addEventListener('click', (e) => {
        console.log('Hamburger clicked');
        e.stopPropagation();
        toggleMenu();
      });

      // Handle navigation and menu closing
      navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
          // Check admin access for admin page
          const path = new URL(link.href).pathname;
          if (path === '/admin-settings' && !AuthGuard.getUser()?.isAdmin) {
            e.preventDefault();
            alert('Admin access required');
            return;
          }

          // Close mobile menu if open
          toggleMenu(false);

          // Remove active class from all links and add to clicked one
          navLinks.forEach((nav) => nav.classList.remove('active'));
          link.classList.add('active');
        });
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        const shouldClose =
          navMenu.classList.contains('active') &&
          !hamburger.contains(e.target) &&
          !navMenu.contains(e.target);

        if (shouldClose) {
          console.log('Closing menu - clicked outside');
          toggleMenu(false);
        }
      });

      // Prevent menu close when clicking inside
      navMenu.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }
});
