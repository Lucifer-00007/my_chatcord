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
const { verifyToken } = require('./utils/jwt'); // Add this import
const User = require('./models/User'); // Add this import

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

// Create an Express application
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Apply security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "/assets/favicon.ico"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
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

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/channels', require('./routes/channels'));

const botName = "ChatCord Bot";

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
    socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));
    
    // Broadcast user joined
    socket.broadcast
      .to(socket.room)
      .emit("message", formatMessage(botName, `${socket.username} has joined the chat`));
    
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
          io.to(user.room).emit("message", formatMessage(user.username, msg));
        }
      } catch (err) {
        socket.emit("error", "Failed to send message");
      }
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
      const user = userLeave(socket.id);
      if (user) {
        io.to(user.room).emit(
          "message",
          formatMessage(botName, `${user.username} has left the chat`)
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

const PORT = process.env.PORT;

// Start the server and listen on the specified port
server.listen(PORT, process.env.HOST, () => console.log(`Server running on port ${PORT}`));