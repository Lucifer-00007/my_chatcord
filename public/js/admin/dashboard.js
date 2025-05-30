async function initDashboard() {
  // Wait for adminUtils to be initialized
  await waitForAdminUtils();

  await loadStats();
  // Update stats every 5 minutes
  setInterval(loadStats, 5 * 60 * 1000);
}

// Helper function to wait for adminUtils initialization
function waitForAdminUtils() {
  return new Promise((resolve) => {
    if (window.adminUtils) {
      resolve();
      return;
    }

    const checkInterval = setInterval(() => {
      if (window.adminUtils) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}

let retryAttempt = 0;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 5000; // 5 seconds

async function loadStats() {
  try {
    const stats = await window.adminUtils.makeApiRequest('/api/admin/stats');

    // Reset retry attempt on success
    retryAttempt = 0;

    // Match the property names from the API response with HTML titles
    const statMappings = {
      'Total Users': stats?.users || 0,
      'Active Rooms': stats?.rooms || 0,
      'Total Messages': stats?.messages || 0,
      'Active APIs': stats?.apis || 0,
    };

    // Update each stat card
    for (const [title, value] of Object.entries(statMappings)) {
      updateStatCard(title, value);
    }
  } catch (err) {
    // Handle rate limiting with exponential backoff
    if (err.status === 429 && retryAttempt < MAX_RETRY_ATTEMPTS) {
      retryAttempt++;
      const retryDelay = BASE_RETRY_DELAY * 2 ** (retryAttempt - 1);
      console.log(`Rate limited. Retrying in ${retryDelay / 1000} seconds...`);

      setTimeout(() => {
        loadStats();
      }, retryDelay);
    } else {
      // Show error in UI only if we've exhausted retries or it's not a rate limit error
      const errorMessage =
        err.status === 429
          ? 'Too many requests. Please try again later.'
          : 'Failed to load dashboard statistics';
      showNotification(errorMessage, 'error');
    }
  }
}

function updateStatCard(title, value) {
  try {
    // Find the stat card by title
    const cards = document.querySelectorAll('.stat-card');
    const card = Array.from(cards).find(
      (card) => card.querySelector('.stat-title')?.textContent.trim() === title
    );

    if (!card) {
      console.warn(`Stat card not found for title: ${title}`);
      return;
    }

    const valueElement = card.querySelector('.stat-value');
    if (valueElement) {
      valueElement.textContent = Number(value).toLocaleString();
    } else {
      console.warn(`Value element not found in card: ${title}`);
    }
  } catch (err) {
    console.error(`Error updating stat card ${title}:`, err);
  }
}

window.initDashboard = initDashboard;
