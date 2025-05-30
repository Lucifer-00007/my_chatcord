const dayjs = require('dayjs'); // Replace moment with dayjs

function formatMessage(username, text) {
  if (!username || !text) {
    throw new Error('Invalid message data provided.');
  }

  return {
    username,
    text,
    dateTime: dayjs().format('h:mm a, DD/MM/YYYY'), // Use dayjs for formatting
  };
}

module.exports = formatMessage;
