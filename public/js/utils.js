/**
 * Fetches a CSRF token from the server.
 * @returns {Promise<string|null>} The CSRF token or null if an error occurs.
 */
async function getCsrfToken() {
  try {
    const response = await fetch('/api/auth/csrf-token');
    if (!response.ok) {
      // Log detailed error information if possible
      const errorData = await response.text(); // Get text to avoid JSON parse error if response is not JSON
      console.error(`Failed to fetch CSRF token. Status: ${response.status}, Body: ${errorData}`);
      throw new Error(`Failed to fetch CSRF token. Status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.csrfToken) {
      console.error('CSRF token not found in response:', data);
      throw new Error('CSRF token not found in response.');
    }
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error.message);
    // In a real application, you might want to display a user-friendly message here
    // or try to re-fetch, or disable forms that require it.
    // For now, just returning null.
    return null;
  }
}

/**
 * Injects a CSRF token into a given form.
 * @param {HTMLFormElement} form The form element.
 * @param {string} token The CSRF token.
 */
function injectCsrfTokenIntoForm(form, token) {
  if (!form || !(form instanceof HTMLFormElement)) {
    console.error('Invalid form element provided for CSRF token injection.');
    return;
  }
  if (!token) {
    console.error('Invalid CSRF token provided for form injection.');
    // Optionally, disable the form or show an error to the user
    // form.querySelector('button[type="submit"]')?.setAttribute('disabled', 'true');
    return;
  }
  let csrfInput = form.querySelector('input[name="_csrf"]');
  if (!csrfInput) {
    csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = '_csrf';
    form.appendChild(csrfInput);
  }
  csrfInput.value = token;
}

// Example usage for a generic AJAX POST request
/**
 * Makes a POST request with a CSRF token.
 * @param {string} url The URL to send the request to.
 * @param {object} body The request body.
 * @param {string} token The CSRF token.
 * @returns {Promise<Response>} The fetch response.
 */
async function postWithCsrf(url, body, token) {
  if (!token) {
    console.error('CSRF token is missing. Aborting POST request.');
    throw new Error('CSRF token is missing.');
    // Or, you could try to fetch it here:
    // token = await getCsrfToken();
    // if (!token) throw new Error('CSRF token is missing.');
  }
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token, // Standard header csurf checks by default
    },
    body: JSON.stringify(body),
  });
}

/**
 * Initializes CSRF protection for a specific form.
 * Fetches the CSRF token and injects it into the form.
 * Call this function for each form that needs CSRF protection on page load or before submission.
 * @param {string} formId The ID of the form to protect.
 */
async function initCsrfProtectionForForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const token = await getCsrfToken();
        if (token) {
            injectCsrfTokenIntoForm(form, token);
        } else {
            console.error(`Failed to initialize CSRF protection for form ${formId}: Token could not be fetched.`);
            // Optionally, display an error message to the user or disable the form
            const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                submitButton.setAttribute('disabled', 'true');
                // Add a message to the user if desired
                let errorMsgElement = form.querySelector('.csrf-error-message');
                if (!errorMsgElement) {
                    errorMsgElement = document.createElement('p');
                    errorMsgElement.className = 'csrf-error-message';
                    errorMsgElement.style.color = 'red';
                    submitButton.parentNode.insertBefore(errorMsgElement, submitButton);
                }
                errorMsgElement.textContent = 'Security token could not be loaded. Please refresh the page and try again.';
            }
        }
    } else {
        console.warn(`Form with ID "${formId}" not found for CSRF protection initialization.`);
    }
}

// Example of how you might call this for a specific form on a page:
// if (document.getElementById('loginForm')) { // Check if the form exists on the current page
//   initCsrfProtectionForForm('loginForm');
// }
// if (document.getElementById('registrationForm')) {
//   initCsrfProtectionForForm('registrationForm');
// }
// Add more for other forms as needed.
// This logic might be better placed in the specific JS files for each page/component.
// For now, keeping it here as a general utility.
// A more advanced approach might involve a global script that scans for all forms with a specific attribute.
// e.g. <form data-csrf-protect="true">
// document.addEventListener('DOMContentLoaded', () => {
//   document.querySelectorAll('form[data-csrf-protect="true"]').forEach(form => {
//     initCsrfProtectionForForm(form.id);
//   });
// });

// It's also good practice to refresh the token if the user's session might have changed
// or after a certain period. However, csurf tokens are typically per-session and valid
// for the duration of the session cookie.
// If a single-page application (SPA) makes many state-changing requests,
// fetching the token once on initial load is usually sufficient.
// For traditional multi-page apps, fetching on each page load containing a form is robust.

// Expose functions to global scope if needed, or use ES modules.
// For simplicity in this environment, they are global.
window.getCsrfToken = getCsrfToken;
window.injectCsrfTokenIntoForm = injectCsrfTokenIntoForm;
window.postWithCsrf = postWithCsrf;
window.initCsrfProtectionForForm = initCsrfProtectionForForm;
