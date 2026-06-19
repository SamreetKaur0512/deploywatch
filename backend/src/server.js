require('dotenv').config();
const express = require('express');
const http = require('http');
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

// 1. Updated CORS configuration: Apne Vercel app ka actual URL yahan daalein
const allowedOrigins = [
  'http://localhost:5173', 
  'https://deploywatch.vercel.app' 
];

// Socket.io setup with strict CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

// Socket connection handler
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);
  socket.on('join', (userId) => {
    socket.join(userId);
  });
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

initCronJobs(io);

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// 2. Updated API CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // !origin check mobile apps/server-to-server requests ke liye zaroori hai
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: '🚀 DeployWatch API is running!' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 DeployWatch Server running on port ${PORT}`);
});

module.exports = { app, io };