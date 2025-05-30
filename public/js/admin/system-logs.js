async function initSystemLogs() {
  const elements = {
    logLevel: document.getElementById('log-level'),
    logsContainer: document.getElementById('logs-container'),
  };

  if (!elements.logsContainer) return;

  elements.logLevel?.addEventListener('change', () =>
    loadLogs(elements.logLevel.value)
  );
  await loadLogs('all');
}

async function loadLogs(level = 'all') {
  const logsContainer = document.getElementById('logs-container');

  try {
    const logs = await window.adminUtils.makeApiRequest(
      `/api/admin/logs?level=${level}`
    );

    logsContainer.innerHTML = logs
      .map(
        (log) => `
            <div class="log-entry ${log.level}">
                <div class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</div>
                <div class="log-level">${log.level}</div>
                <div class="log-message">${log.message}</div>
            </div>
        `
      )
      .join('');
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

window.initSystemLogs = initSystemLogs;
