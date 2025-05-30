// Import necessary modules and libraries
const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const helmet = require("helmet"); // Add helmet for security
const rateLimit = require("express-rate-limit"); // Add rate limiting
const formatMessage = require("./utils/messages");
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const authMiddleware = require('./middleware/auth');
const { adminAuth } = require('./middleware/admin'); // Fixed admin middleware import
const { verifyToken } = require('./utils/jwt'); // Add this import
const User = require('./models/User'); // Add this import
const Room = require('./models/Room'); // Changed from Channel
const RoomBlock = require('./models/RoomBlock'); // Add RoomBlock model import
const RoomChat = require('./models/RoomChat'); // Add this import
const { initialize } = require('./config/init');
const {
    env,
    security,
    chat,
    cors
} = require('./config/constants');
const logger = require('./logger'); // Add logger import
const { logUserMessageActivity } = require('./utils/users');

// Import additional libraries and set up Redis for Socket.io adapter
const { createAdapter } = require("@socket.io/redis-adapter");
const redis = require("redis");
require("dotenv").config();
const { createClient } = redis;

// Import utility functions for managing users in the chat
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

// Validate environment variables
if (!process.env.REDIS_URL || !process.env.PORT) {
  logger.error("Missing required environment variables. Check .env file.");
  process.exit(1);
}

// Connect to MongoDB and initialize the database
(async () => {
    try {
        await connectDB();
        await initialize();
        logger.info('Database connected and initialized');
    } catch (err) {
        logger.error('Failed to initialize application', { error: err.message, stack: err.stack });
        process.exit(1);
    }
})();

// Create an Express application
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

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
app.use(helmet({
    contentSecurityPolicy: cspConfig
}));

// Apply rate limiting with different rules for static and API routes
const adminApiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 requests per minute for admin routes
    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many requests, please try again later.',
            code: 429
        });
    }
});

const apiLimiter = rateLimit({
    windowMs: security.RATE_LIMIT_WINDOW,
    max: security.RATE_LIMIT_MAX,
    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many requests, please try again later.',
            code: 429
        });
    }
});

const staticLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute for static assets
    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many requests, please try again later.',
            code: 429
        });
    }
});

// Apply rate limiting middleware
app.use('/api/admin', adminApiLimiter); // More permissive rate limiting for admin routes
app.use('/api', apiLimiter); // Standard rate limiting for other API routes

// Apply more permissive rate limiting to static assets
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d' // Cache static assets for 1 day
}));

// Apply default rate limiting to other routes
app.use(staticLimiter);

// Add JSON and cookie parsing middleware
app.use(express.json());
app.use(cookieParser());

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
app.use('/api/voice', authMiddleware, require('./routes/voice'));

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

// Serve admin HTML files
app.get('/admin/:section/:page', [authMiddleware, adminAuth], (req, res) => {
    const { section, page } = req.params;
    res.sendFile(path.join(__dirname, 'public', 'admin', section, `${page}.html`));
});

const botName = chat.BOT_NAME;

// Modified Redis connection setup with try-catch
(async () => {
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL });

    pubClient.on("error", (err) => {
      logger.error("Redis Client Error:", { error: err.message, stack: err.stack });
    });

    await pubClient.connect();
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  } catch (error) {
    logger.error("Redis connection failed:", { error: error.message, stack: error.stack });
    logger.error("Retrying in 5 seconds...");
    setTimeout(() => {
      process.exit(1); // Exit process if retry fails
    }, 5000);
  }
})();

// Update socket connection handling
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        const roomToken = socket.handshake.auth.roomToken;

        if (!token || !roomToken) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = verifyToken(token);
            const roomData = verifyToken(roomToken);
            
            if (!decoded || !roomData) {
                return next(new Error('Invalid tokens'));
            }

            const user = await User.findById(decoded.userId).select('-password');
            if (!user) {
                return next(new Error('User not found'));
            }

            // Check for active room block
            const activeBlock = await RoomBlock.findOne({
                user: decoded.userId,
                room: roomData.room,
                isActive: true,
                endDate: { $gt: new Date() }
            });

            if (activeBlock) {
                return next(new Error(`You are blocked from this room until ${activeBlock.endDate.toLocaleDateString()}`));
            }

            // Attach all necessary data to socket
            socket.userId = decoded.userId;
            socket.username = user.username;
            socket.room = roomData.room;
            
            // Join the room immediately
            socket.join(roomData.room);
            
            // Add user to users array
            userJoin(socket.id, user.username, roomData.room);
            
            next();
        } catch (err) {
            return next(new Error('Token verification failed'));
        }
    } catch (err) {
        next(new Error('Socket authentication failed'));
    }
});

io.on("connection", (socket) => {
  try {
    // Send initial room data
    const roomUsers = getRoomUsers(socket.room);
    
    // Welcome current user
    socket.emit("message", formatMessage(botName, chat.MESSAGES.welcome));
    
    // Broadcast user joined
    socket.broadcast
      .to(socket.room)
      .emit("message", formatMessage(botName, chat.MESSAGES.userJoined(socket.username)));
    
    // Send users and room info to all clients in the room
    io.to(socket.room).emit("roomUsers", {
      room: socket.room,
      users: roomUsers
    });

    // Handle chat messages
    socket.on("chatMessage", async (data) => {
      try {
        const user = getCurrentUser(socket.id);
        if (user) {
          // Support both old (string) and new (object) formats
          const messageText = typeof data === "string" ? data : data.msg;
          const roomId = typeof data === "string" ? socket.room : (data.roomId || socket.room);
          const room = await Room.findById(roomId);
          if (!room) {
            // If room not found, do not create a new one
            return;
          }

          // --- RoomChat logic ---
          let roomChat = await RoomChat.findOne({ room: room._id });
          const messageObj = {
            content: messageText,
            user: socket.userId,
            username: socket.username,
            createdAt: new Date(),
            roomId: room._id, // Add roomId to each message (optional, for clarity)
            roomName: room.name // Add roomName to each message (optional, for clarity)
          };
          if (!roomChat) {
            roomChat = new RoomChat({
              room: room._id,
              messages: [messageObj],
              roomName: room.name // Add roomName to RoomChat document
            });
          } else {
            roomChat.messages.push(messageObj);
            // Optionally update roomName in case it changed
            roomChat.roomName = room.name;
          }
          await roomChat.save();
          // Log user message activity for analytics (IP, userAgent from handshake)
          const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
          const userAgent = socket.handshake.headers['user-agent'];
          await logUserMessageActivity(socket.userId, ip, userAgent, { room: room._id });
          // --- End RoomChat logic ---

          // Send message to room
          io.to(user.room).emit("message", formatMessage(user.username, messageText));
        }
      } catch (err) {
        logger.error('Message error:', { error: err.message, stack: err.stack });
        socket.emit("error", chat.MESSAGES.sendError);
      }
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
      const user = userLeave(socket.id);
      if (user) {
        io.to(user.room).emit(
          "message",
          formatMessage(botName, chat.MESSAGES.userLeft(user.username))
        );

        io.to(user.room).emit("roomUsers", {
          room: user.room,
          users: getRoomUsers(user.room)
        });
      }
    });
  } catch (err) {
    logger.error("Error in connection handler:", { error: err.message, stack: err.stack });
  }
});

// Start the server and listen on the specified port
server.listen(env.PORT, process.env.HOST, () => logger.info(`Server running on port ${env.PORT}`));