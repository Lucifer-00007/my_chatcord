// Import necessary modules and libraries
const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const helmet = require("helmet"); // Add helmet for security
const rateLimit = require("express-rate-limit"); // Add rate limiting
const Joi = require("joi"); // Add Joi for input validation
const formatMessage = require("./utils/messages");
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');  // Add this line
const { verifyToken } = require('./utils/jwt'); // Add this import
const User = require('./models/User'); // Add this import
const Message = require('./models/Message'); // Import Message model
const Channel = require('./models/Channel'); // Add Channel model import
const { initializeChannels } = require('./config/init'); // Add this import
const {
    PORT,
    HOST,
    RATE_LIMIT_WINDOW,
    RATE_LIMIT_MAX,
    BOT_NAME,
    CORS_CONFIG,
    MESSAGES
} = require('./config/constants');

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
  console.error("Missing required environment variables. Check .env file.");
  process.exit(1);
}

// Connect to MongoDB
connectDB();

// Initialize database
initializeChannels();

// Create an Express application
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: CORS_CONFIG
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Update CSP configuration
const cspConfig = {
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
        fontSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "*"],
        mediaSrc: ["'self'", "blob:", "data:"],
        connectSrc: ["'self'", "ws:", "wss:"]
    }
};

// Apply security middleware with updated CSP
app.use(helmet({
    contentSecurityPolicy: cspConfig
}));

// Apply rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX
});
app.use(limiter);

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
app.use('/api/channels', require('./routes/channels'));
app.use('/api/admin', authMiddleware, adminMiddleware, require('./routes/admin'));
app.use('/api/ai', authMiddleware, require('./routes/ai'));
app.use('/api/images', authMiddleware, require('./routes/images'));
app.use('/api/voice', authMiddleware, require('./routes/voice'));
app.use('/api/admin/users', authMiddleware, adminMiddleware, require('./routes/admin/users'));
app.use('/api/admin/logs', authMiddleware, adminMiddleware, require('./routes/admin/logs'));
app.use('/api/admin/settings', authMiddleware, adminMiddleware, require('./routes/admin/settings'));
app.use('/api/admin/voice', authMiddleware, adminMiddleware, require('./routes/admin/voice')); // Add this line

// Admin routes
app.use('/api/admin/stats', require('./routes/admin/stats'));
app.use('/api/admin/ai-apis', require('./routes/admin/ai-apis'));
app.use('/api/admin/voice', require('./routes/admin/voice'));
app.use('/api/admin/image-apis', require('./routes/admin/image-apis'));
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/logs', require('./routes/admin/logs'));
app.use('/api/admin/settings', require('./routes/admin/settings'));

// Apply admin middleware to all admin routes
app.use('/api/admin', require('./middleware/admin'));

const botName = BOT_NAME;

// Modified Redis connection setup with try-catch
(async () => {
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL });

    pubClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    await pubClient.connect();
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  } catch (error) {
    console.error("Redis connection failed:", error.message);
    console.error("Retrying in 5 seconds...");
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
    socket.emit("message", formatMessage(botName, MESSAGES.welcome));
    
    // Broadcast user joined
    socket.broadcast
      .to(socket.room)
      .emit("message", formatMessage(botName, MESSAGES.userJoined(socket.username)));
    
    // Send users and room info to all clients in the room
    io.to(socket.room).emit("roomUsers", {
      room: socket.room,
      users: roomUsers
    });

    // Handle chat messages
    socket.on("chatMessage", async (msg) => {
      try {
        const user = getCurrentUser(socket.id);
        if (user) {
          // Find or create channel
          let channel = await Channel.findOne({ name: socket.room });
          if (!channel) {
            channel = new Channel({
              name: socket.room,
              topic: socket.room,
              createdBy: socket.userId
            });
            await channel.save();
          }

          // Create and save message with channel reference
          const message = new Message({
            content: msg,
            user: socket.userId,
            channel: channel._id  // Use channel ObjectId
          });
          await message.save();

          // Send message to room
          io.to(user.room).emit("message", formatMessage(user.username, msg));
        }
      } catch (err) {
        console.error('Message error:', err);
        socket.emit("error", MESSAGES.sendError);
      }
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
      const user = userLeave(socket.id);
      if (user) {
        io.to(user.room).emit(
          "message",
          formatMessage(botName, MESSAGES.userLeft(user.username))
        );

        io.to(user.room).emit("roomUsers", {
          room: user.room,
          users: getRoomUsers(user.room)
        });
      }
    });
  } catch (err) {
    console.error("Error in connection handler:", err);
  }
});

// Start the server and listen on the specified port
server.listen(PORT, process.env.HOST, () => console.log(`Server running on port ${PORT}`));