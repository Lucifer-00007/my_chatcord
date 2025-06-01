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

    // Clear previous logs
    logsContainer.innerHTML = '';
    logs.forEach((log) => {
      const entry = document.createElement('div');
      entry.className = `log-entry ${log.level}`;

      const timestampDiv = document.createElement('div');
      timestampDiv.className = 'log-timestamp';
      timestampDiv.textContent = new Date(log.timestamp).toLocaleString();

      const levelDiv = document.createElement('div');
      levelDiv.className = 'log-level';
      levelDiv.textContent = log.level;

      const messageDiv = document.createElement('div');
      messageDiv.className = 'log-message';
      messageDiv.textContent = log.message;

      entry.appendChild(timestampDiv);
      entry.appendChild(levelDiv);
      entry.appendChild(messageDiv);
      logsContainer.appendChild(entry);
    });
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

window.initSystemLogs = initSystemLogs;
