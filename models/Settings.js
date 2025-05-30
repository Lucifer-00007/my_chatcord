const mongoose = require('mongoose');

// Defines the schema for application-wide system settings.
// This application is designed to have only one settings document in the database.
const settingsSchema = new mongoose.Schema({
  // Maximum number of users allowed in a single chat room.
  maxUsersPerRoom: {
    type: Number,
    required: [true, 'Maximum users per room is required.'],
    default: 50,
    min: [2, 'Maximum users per room must be at least 2.'],
  },
  // Maximum number of rooms a single user can create or be part of (if there's such a limit).
  maxRoomsPerUser: {
    type: Number,
    required: [true, 'Maximum rooms per user is required.'],
    default: 5,
    min: [1, 'Maximum rooms per user must be at least 1.'],
  },
  // Maximum length of a single chat message.
  maxMessageLength: {
    type: Number,
    required: [true, 'Maximum message length is required.'],
    default: 500,
    min: [1, 'Maximum message length must be at least 1 character.'],
  },
  // Minimum time interval (in seconds) between messages from a single user to prevent spam.
  // A value of 0 could indicate no rate limiting, but current schema min is 1.
  messageRateLimit: {
    type: Number,
    required: [true, 'Message rate limit is required.'],
    default: 60, // Default to 1 message per 60 seconds, adjust as needed
    min: [1, 'Message rate limit must be at least 1 second.'], // Or 0 if no limit is allowed
  },
  // If true, new users must verify their email address before they can fully use the application.
  requireEmailVerification: {
    type: Boolean,
    required: true,
    default: false,
  },
  // If true, users who are not logged in (guests) can access certain parts of the application (e.g., view rooms).
  allowGuestAccess: {
    type: Boolean,
    required: true,
    default: true,
  },
  // If true, a profanity filter will be applied to chat messages.
  enableProfanityFilter: {
    type: Boolean,
    required: true,
    default: true,
  },
  // Timestamp of the last update to the settings document. Automatically managed.
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  // Note: Other potential settings fields (siteName, default APIs, etc.) are currently defined
  // in Joi validation (validators/admin/settingsSchemas.js) but not here.
  // To store them, they must be added to this Mongoose schema.
});

// Middleware to automatically update the `lastUpdated` field on each save.
settingsSchema.pre('save', function (next) {
  if (this.isModified()) { // Only update if any field is modified, though findOneAndUpdate might bypass this for direct updates.
    this.lastUpdated = new Date();
  }
  next();
});

// Middleware to ensure that only one settings document can exist in the database.
// This hook runs before saving a new document (not on findOneAndUpdate by default).
// The `upsert: true` option in `findOneAndUpdate` (used in controller) handles creation if no doc exists.
// This pre-save hook is an additional safeguard, primarily for direct `new Settings().save()` attempts.
settingsSchema.pre('save', async function (next) {
  // `this.isNew` is true if the document is new (being created).
  // We only want to enforce the single-document rule when trying to create a *new* document
  // if one *already* exists.
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    if (count > 0) {
      // If a document already exists and we are trying to save a new one, prevent it.
      return next(new Error('Only one settings document can exist. Use update instead of creating a new one.'));
    }
  }
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
