// Ensure utils.js is loaded before this script, or ensure functions are available (e.g., via window scope)
// For example, if utils.js defines window.initCsrfProtectionForForm

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

if (loginForm) {
  // Initialize CSRF protection for the login form when the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (window.initCsrfProtectionForForm) {
      window.initCsrfProtectionForForm('login-form');
    } else {
      console.error('CSRF utility functions not found. Ensure utils.js is loaded correctly.');
      // Optionally disable the form or show a general error
      const submitButton = loginForm.querySelector('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        submitButton.setAttribute('disabled', 'true');
        const errorMsgElement = document.createElement('p');
        errorMsgElement.style.color = 'red';
        errorMsgElement.textContent = 'Security features could not be loaded. Please refresh the page.';
        submitButton.parentNode.insertBefore(errorMsgElement, submitButton.nextSibling);
      }
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.elements.email.value;
    const password = e.target.elements.password.value;
    const csrfToken = e.target.elements._csrf ? e.target.elements._csrf.value : null;

    if (!csrfToken) {
      alert('Security token is missing. Please refresh the page.');
      // console.error('CSRF token missing in form submission.');
      return;
    }

    try {
      // Using postWithCsrf from utils.js (assuming it's globally available or imported)
      const res = await window.postWithCsrf('/api/auth/login', { email, password }, csrfToken);
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/selectRoom';
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      // console.error('Login error:', err);
      alert(err.message || 'An error occurred during login. Please try again.');
    }
  });
}

if (registerForm) {
  // Initialize CSRF protection for the registration form
  document.addEventListener('DOMContentLoaded', () => {
    if (window.initCsrfProtectionForForm) {
      window.initCsrfProtectionForForm('register-form');
    } else {
      console.error('CSRF utility functions not found. Ensure utils.js is loaded correctly.');
      const submitButton = registerForm.querySelector('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        submitButton.setAttribute('disabled', 'true');
        const errorMsgElement = document.createElement('p');
        errorMsgElement.style.color = 'red';
        errorMsgElement.textContent = 'Security features could not be loaded. Please refresh the page.';
        submitButton.parentNode.insertBefore(errorMsgElement, submitButton.nextSibling);
      }
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = e.target.elements.username.value;
    const email = e.target.elements.email.value;
    const password = e.target.elements.password.value;
    const csrfToken = e.target.elements._csrf ? e.target.elements._csrf.value : null;

    if (!csrfToken) {
      alert('Security token is missing. Please refresh the page.');
      // console.error('CSRF token missing in form submission.');
      return;
    }

    try {
      const res = await window.postWithCsrf('/api/auth/register', { username, email, password }, csrfToken);
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/selectRoom';
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      // console.error('Registration error:', err);
      alert(err.message || 'An error occurred during registration. Please try again.');
    }
  });
}

// Password visibility toggle - remains unchanged
document.querySelectorAll('.password-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const input = button.parentElement.querySelector('input');
    const icon = button.querySelector('i');

    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
});
