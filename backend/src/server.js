require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const analyticsRoutes = require('./routes/analytics');
const trackingRoutes = require('./routes/tracking');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const { initCronJobs } = require('./utils/cronJobs');
const projectUsersRoutes = require('./routes/projectUsers');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [process.env.CLIENT_URL, process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS]
  .filter(Boolean)
  .flatMap((value) => value.split(',').map((item) => item.trim()).filter(Boolean));

const socketOrigins = [...new Set([
  ...(allowedOrigins.length ? allowedOrigins : ['http://localhost:5173', 'http://localhost:3000']),
])];

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: socketOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in routes/controllers
app.set('io', io);

// Socket connection handler
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User joins their own room using their userId
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Init cron jobs
initCronJobs(io);

app.set('trust proxy', true);

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

// Middleware — allow all origins so tracking script works from any deployed domain
app.use(cors({
  origin: function (origin, callback) { callback(null, true); },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects/:id', projectUsersRoutes);
app.use('/tracking.js', trackingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 DeployWatch API is running!',
    timestamp: new Date().toISOString(),
  });
});

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath, { index: false }));

  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/tracking.js' || req.path.startsWith('/socket.io')) {
      return next();
    }

    if (req.accepts('html')) {
      return res.sendFile(frontendIndexPath);
    }

    next();
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 DeployWatch Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, io };
