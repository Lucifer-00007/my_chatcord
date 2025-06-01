// Import necessary modules and libraries
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const helmet = require('helmet'); // Add helmet for security
const rateLimit = require('express-rate-limit'); // Add rate limiting
const cookieParser = require('cookie-parser');
const csrf = require('csurf'); // Import csurf
const { createAdapter } = require('@socket.io/redis-adapter');
const redis = require('redis');
const formatMessage = require('./utils/messages');
const connectDB = require('./config/db');
const authMiddleware = require('./middleware/auth');
const { adminAuth } = require('./middleware/admin'); // Fixed admin middleware import
const { verifyToken } = require('./utils/jwt'); // Add this import
const User = require('./models/User'); // Add this import
const Room = require('./models/Room'); // Changed from Channel
const RoomBlock = require('./models/RoomBlock'); // Add RoomBlock model import
const RoomChat = require('./models/RoomChat'); // Add this import
const { initialize } = require('./config/init');
const { env, security, chat, cors } = require('./config/constants');
const logger = require('./logger'); // Add logger import
const { logUserMessageActivity } = require('./utils/users');

// Import additional libraries and set up Redis for Socket.io adapter
require('dotenv').config();

const { createClient } = redis;

// Import utility functions for managing users in the chat
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require('./utils/users');

// Validate environment variables
if (!process.env.REDIS_URL || !process.env.PORT) {
  logger.error('Missing required environment variables. Check .env file.', { source: 'startup' });
  process.exit(1);
}

// Connect to MongoDB and initialize the database
(async () => {
  try {
    await connectDB();
    await initialize();
    logger.info('Database connected and initialized', { source: 'startup' });
  } catch (err) {
    logger.error('Failed to initialize application', {
      error: err.message,
      stack: err.stack,
      source: 'startup',
    });
    process.exit(1);
  }
})();

// Create an Express application
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors,
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Update CSP configuration
const cspConfig = {
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
        imgSrc: [
            "'self'", "data:", "blob:", "https:", "*"
        ],
        mediaSrc: ["'self'", "blob:", "data:"],
        connectSrc: ["'self'", "ws:", "wss:"]
    }
};

// Apply security middleware with updated CSP
app.use(
  helmet({
    contentSecurityPolicy: cspConfig,
  })
);

// Apply rate limiting with different rules for static and API routes
const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute for admin routes
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests, please try again later.',
      code: 429,
    });
  },
});

const apiLimiter = rateLimit({
  windowMs: security.RATE_LIMIT_WINDOW,
  max: security.RATE_LIMIT_MAX,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests, please try again later.',
      code: 429,
    });
  },
});

const staticLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute for static assets
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests, please try again later.',
      code: 429,
    });
  },
});

// Apply rate limiting middleware
app.use('/api/admin', adminApiLimiter); // More permissive rate limiting for admin routes
app.use('/api', apiLimiter); // Standard rate limiting for other API routes

// Apply more permissive rate limiting to static assets
app.use(
  express.static(path.join(__dirname, 'public'), { maxAge: '1d' })
);

// Apply default rate limiting to other routes
app.use(staticLimiter);

// Add JSON and cookie parsing middleware
app.use(express.json());
app.use(cookieParser());

// Initialize CSRF protection
// IMPORTANT: This must come after cookieParser and any body parsers (like express.json)
// and before your routes that you want to protect.
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// CSRF Error Handling Middleware
// This should be placed after the CSRF middleware and your routers,
// but before other generic error handlers.
// Note: If your routers are added *after* this, it won't catch errors from them.
// For now, placing it here. If issues arise, it might need to be the last app.use() before server.listen()
// or just before the generic error handlers if any.
// However, for specific CSRF error handling, it's often best right after the routes.
// Let's adjust this placement later if needed, for now, after csrfProtection.

// View Routes
app.get('/', (req, res) => {
  res.redirect('/selectRoom');
});

app.get('/selectRoom', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'selectRoom.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/ai-chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ai-chat.html'));
});

app.get('/text-to-image', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'text-to-image.html'));
});

app.get('/text-to-voice', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'text-to-voice.html'));
});

app.get('/admin-settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-settings.html'));
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/ai', authMiddleware, require('./routes/ai'));
app.use('/api/images', authMiddleware, require('./routes/images'));

// Public or authenticated GET endpoints for APIs (no admin required)
const aiApisRouter = require('./routes/admin/ai-apis');
const imageApisRouter = require('./routes/admin/image-apis');
const imageSettingsRouter = require('./routes/admin/image-settings');
const voiceRouter = require('./routes/admin/voice');

// AI APIs
app.use('/api/ai-apis', aiApisRouter);
// Image APIs
app.use('/api/image-apis', imageApisRouter);
app.use('/api/image-settings', imageSettingsRouter);
// Voice APIs
app.use('/api/voice', voiceRouter);

// Admin routes with auth middleware
app.use('/api/admin', [authMiddleware, adminAuth], require('./routes/admin'));

// CSRF error handler - Placed after API routes and before serving files/final error handlers
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', { path: req.path, error: err.message });
    res.status(403).json({ message: 'Invalid or missing CSRF token. Please refresh and try again.' });
  } else {
    next(err);
  }
});

// Serve admin HTML files
app.get('/admin/:section/:page', [authMiddleware, adminAuth], (req, res) => {
  const { section, page } = req.params;
  res.sendFile(
    path.join(__dirname, 'public', 'admin', section, `${page}.html`)
  );
});

const botName = chat.BOT_NAME;

// Modified Redis connection setup with try-catch
(async () => {
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL });

    pubClient.on('error', (err) => {
      logger.error('Redis Client Error', {
        error: err.message,
        stack: err.stack,
        source: 'redis',
      });
    });

    await pubClient.connect();
    logger.info('Redis pubClient connected', { source: 'redis' });
    const subClient = pubClient.duplicate();
    logger.info('Redis subClient duplicated', { source: 'redis' });
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter configured', { source: 'redis' });
  } catch (error) {
    logger.error('Redis connection setup failed', {
      error: error.message,
      stack: error.stack,
      source: 'redis',
    });
    logger.warn('Redis connection failed. Retrying in 5 seconds...', { source: 'redis' }); // Changed to warn
    setTimeout(() => {
      logger.error('Exiting application after Redis connection retry timeout.', { source: 'redis' });
      process.exit(1); // Exit process if retry fails
    }, 5000);
  }
})();

// Update socket connection handling
io.use(async (socket, next) => {
  try {
    const { token } = socket.handshake.auth;
    const { roomToken } = socket.handshake.auth;

    if (!token || !roomToken) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = verifyToken(token);
      const roomData = verifyToken(roomToken);

      if (!decoded || !roomData) {
        logger.warn('Invalid tokens during socket auth', { tokenProvided: !!token, roomTokenProvided: !!roomToken });
        return next(new Error('Invalid tokens'));
      }

      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        logger.warn('User not found during socket auth', { userId: decoded.userId });
        return next(new Error('User not found'));
      }

      // Check for active room block
      const activeBlock = await RoomBlock.findOne({
        user: decoded.userId,
        room: roomData.room,
        isActive: true,
        endDate: { $gt: new Date() },
      });

      if (activeBlock) {
        logger.info('User blocked from room during socket auth', { userId: decoded.userId, roomId: roomData.room, blockEndDate: activeBlock.endDate });
        return next(
          new Error(
            `You are blocked from this room until ${activeBlock.endDate.toLocaleDateString()}`
          )
        );
      }

      // Attach all necessary data to socket
      socket.userId = decoded.userId;
      socket.username = user.username;
      socket.room = roomData.room;

      // Join the room immediately
      socket.join(roomData.room);
      logger.debug(`User ${user.username} joined room ${roomData.room}`, { userId: user.id, roomId: roomData.room, socketId: socket.id, source: 'socket.io' });


      // Add user to users array
      userJoin(socket.id, user.username, roomData.room);

      next();
    } catch (err) {
      logger.error('Token verification failed during socket auth', { error: err.message, stack: err.stack, source: 'socket.io' });
      return next(new Error('Token verification failed'));
    }
  } catch (err) {
    logger.error('Socket authentication failed', { error: err.message, stack: err.stack, source: 'socket.io' });
    next(new Error('Socket authentication failed'));
  }
});

io.on('connection', (socket) => {
  try {
    logger.info(`User connected: ${socket.username} to room ${socket.room}`, { userId: socket.userId, roomId: socket.room, socketId: socket.id, source: 'socket.io' });
    // Send initial room data
    const roomUsers = getRoomUsers(socket.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, chat.MESSAGES.welcome));
    logger.debug(`Sent welcome message to ${socket.username} in room ${socket.room}`, { userId: socket.userId, roomId: socket.room, source: 'socket.io' });


    // Broadcast user joined
    socket.broadcast
      .to(socket.room)
      .emit(
        'message',
        formatMessage(botName, chat.MESSAGES.userJoined(socket.username))
      );
    logger.debug(`Broadcasted user join: ${socket.username} in room ${socket.room}`, { roomId: socket.room, source: 'socket.io' });


    // Send users and room info to all clients in the room
    io.to(socket.room).emit('roomUsers', {
      room: socket.room,
      users: roomUsers,
    });
    logger.debug(`Sent room users list to room ${socket.room}`, { roomId: socket.room, userCount: roomUsers.length, source: 'socket.io' });


    // Handle chat messages
    socket.on('chatMessage', async (data) => {
      try {
        const user = getCurrentUser(socket.id);
        if (user) {
          const messageText = typeof data === 'string' ? data : data.msg;
          const roomId = typeof data === 'string' ? socket.room : data.roomId || socket.room;

          logger.debug(`Received chat message from ${user.username} in room ${roomId}`, { userId: user.id, roomId, messageLength: messageText.length, source: 'socket.io' });

          const room = await Room.findById(roomId);
          if (!room) {
            logger.warn(`Room not found for chat message: ${roomId}`, { userId: user.id, source: 'socket.io' });
            return; // If room not found, do not proceed
          }

          // --- RoomChat logic ---
          let roomChat = await RoomChat.findOne({ room: room._id });
          const messageObj = {
            content: messageText,
            user: socket.userId,
            username: socket.username,
            createdAt: new Date(),
            roomId: room._id,
            roomName: room.name,
          };
          if (!roomChat) {
            roomChat = new RoomChat({
              room: room._id,
              messages: [messageObj],
              roomName: room.name,
            });
            logger.debug(`Creating new RoomChat for room ${roomId}`, { roomId, source: 'socket.io' });
          } else {
            roomChat.messages.push(messageObj);
            roomChat.roomName = room.name; // Optionally update roomName
          }
          await roomChat.save();
          // Log user message activity for analytics (IP, userAgent from handshake)
          const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
          const userAgent = socket.handshake.headers['user-agent'];
          await logUserMessageActivity(socket.userId, ip, userAgent, { room: room._id });
          // --- End RoomChat logic ---

          // Send message to room
          io.to(user.room).emit(
            'message',
            formatMessage(user.username, messageText)
          );
          logger.debug(`Emitted chat message to room ${user.room}`, { fromUser: user.username, source: 'socket.io' });
        } else {
          logger.warn(`User not found for socket ID ${socket.id} during chatMessage`, { socketId: socket.id, source: 'socket.io' });
        }
      } catch (err) {
        logger.error('Error handling chatMessage:', {
          error: err.message,
          stack: err.stack,
          socketId: socket.id,
          userId: socket.userId,
          roomId: socket.room,
          source: 'socket.io',
        });
        socket.emit('error', chat.MESSAGES.sendError);
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      const user = userLeave(socket.id);
      if (user) {
        logger.info(`User disconnected: ${user.username} from room ${user.room}`, { userId: user.id, roomId: user.room, socketId: socket.id, source: 'socket.io' });
        io.to(user.room).emit(
          'message',
          formatMessage(botName, chat.MESSAGES.userLeft(user.username))
        );
        logger.debug(`Broadcasted user left: ${user.username} in room ${user.room}`, { roomId: user.room, source: 'socket.io' });

        io.to(user.room).emit('roomUsers', {
          room: user.room,
          users: getRoomUsers(user.room),
        });
        logger.debug(`Sent updated room users list to room ${user.room} after disconnect`, { roomId: user.room, source: 'socket.io' });
      } else {
        logger.warn(`User not found for socket ID ${socket.id} during disconnect`, { socketId: socket.id, source: 'socket.io' });
      }
    });
  } catch (err) {
    logger.error('Error in socket connection handler:', {
      error: err.message,
      stack: err.stack,
      socketId: socket.id,
      userId: socket.userId, // May be undefined if error is very early
      source: 'socket.io',
    });
  }
});

// Start the server and listen on the specified port
server.listen(env.PORT, process.env.HOST, () =>
  logger.info(`Server running on port ${env.PORT}`, { source: 'startup' })
);

// Centralized Error Handler
// IMPORTANT: This must be the last middleware, after all other app.use() and route handlers.
const AppError = require('./utils/AppError'); // Import AppError

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log all errors
  logger.error(`[ERROR] ${err.statusCode} - ${err.message}`, {
    path: req.path,
    method: req.method,
    // Include stack for non-operational errors or if in development
    stack: process.env.NODE_ENV === 'development' || !err.isOperational ? err.stack : undefined,
    details: err.details,
    errorCode: err.errorCode,
  });

  if (process.env.NODE_ENV === 'development') {
    // Send detailed error in development
    return res.status(err.statusCode).json({
      status: err.status,
      statusCode: err.statusCode,
      message: err.message,
      errorCode: err.errorCode,
      details: err.details,
      stack: err.stack, // Include stack in dev for easier debugging
    });
  }

  // For production:
  if (err.isOperational) {
    // Operational, trusted error: send message to client
    return res.status(err.statusCode).json({
      status: err.status,
      statusCode: err.statusCode,
      message: err.message,
      errorCode: err.errorCode,
      details: err.details,
    });
  }
  // Programming or other unknown error: don't leak error details
  // 1) Log error (already done above)
  // 2) Send generic message
  return res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'Something went very wrong!',
  });
});
