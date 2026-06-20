require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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

connectDB();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) { callback(null, true); },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join', (userId) => { socket.join(userId); });
  socket.on('disconnect', () => {});
});

initCronJobs(io);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.path === '/api/analytics/track',
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (req.path === '/api/analytics/track' || req.path.startsWith('/tracking')) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    return next();
  }
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api/', limiter);

app.use('/api/auth',          authRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/projects/:id',  projectUsersRoutes);
app.use('/tracking.js',       trackingRoutes);

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