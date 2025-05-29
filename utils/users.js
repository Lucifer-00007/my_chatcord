const users = [];
const UserActivity = require('../models/UserActivity');

// Join user to chat
function userJoin(id, username, room) {
  if (!id || !username || !room) {
    throw new Error("Invalid user data provided.");
  }

  const user = { id, username, room };
  users.push(user);

  return user;
}

// Get current user
function getCurrentUser(id) {
  if (!id) {
    throw new Error("User ID is required.");
  }

  return users.find((user) => user.id === id);
}

// User leaves chat
function userLeave(id) {
  if (!id) {
    throw new Error("User ID is required.");
  }

  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

// Get room users
function getRoomUsers(room) {
  if (!room) {
    throw new Error("Room name is required.");
  }

  return users.filter((user) => user.room === room);
}

// Log user activity for each message sent (for heatmap, histogram, etc.)
async function logUserMessageActivity(userId, ip, userAgent, metadata = {}) {
  try {
    await UserActivity.create({
      user: userId,
      action: 'message',
      ip,
      userAgent,
      metadata
    });
  } catch (err) {
    // Optionally log error
  }
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  logUserMessageActivity
};
