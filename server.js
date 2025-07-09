require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const activityRoutes = require('./routes/activityRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

const allowedOrigins = [
  'http://localhost:5173', // For your local frontend development
  process.env.FRONTEND_URL // This will be your Vercel frontend URL from Render env vars
];

// Create HTTP server manually so Socket.IO can attach to it
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // --- ADD THESE CONSOLE.LOGS ---
      console.log("Socket.IO CORS Debug: Incoming Request Origin =", origin);
      console.log("Socket.IO CORS Debug: Allowed Origins Array =", allowedOrigins);
      // --- END ADDITIONS ---
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.use(cors({
  origin: (origin, callback) => {
    // --- ADD THESE CONSOLE.LOGS ---
    console.log("CORS Debug: Incoming Request Origin =", origin);
    console.log("CORS Debug: Allowed Origins Array =", allowedOrigins);
    // --- END ADDITIONS ---

    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      console.error("CORS Error: Origin NOT found in allowed list:", origin); // Log the specific origin that failed
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Pass `io` instance to route handlers
app.use((req, res, next) => {
    req.io = io; 
    next();
});

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Socket.IO Connection Handler (for initial connection events)
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


// Basic Route (for testing server)
app.get('/', (req, res) => {
  res.send('Collaborative To-Do Board Backend API with Sockets');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activity', activityRoutes);


// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL for CORS: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
