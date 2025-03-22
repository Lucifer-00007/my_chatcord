const dayjs = require("dayjs"); // Replace moment with dayjs

function formatMessage(username, text) {
  if (!username || !text) {
    throw new Error("Invalid message data provided.");
  }

  return {
    username,
    text,
    time: dayjs().format("h:mm a"), // Use dayjs for formatting
  };
}

module.exports = formatMessage;
