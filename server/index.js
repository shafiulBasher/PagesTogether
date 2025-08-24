const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

const app = express();
// Disable etags for APIs to avoid 304 with stale bodies
app.set('etag', false);

// Trust proxy for secure cookies in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'http://localhost:5000', 'http://127.0.0.1:5000']
    }
  }
}));

app.use(morgan('combined'));
app.use(cookieParser());

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'your-production-domain.com' : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Prevent caching for API responses to ensure fresh membership state
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/pagestogether',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
  secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const uploadRoutes = require('./routes/uploadsRoutes');
const groupRoutes = require('./routes/groupRoutes');
const groupPostRoutes = require('./routes/groupPostRoutes');
const seedRoutes = require('./routes/seedRoutes');
const socialRoutes = require('./routes/socialRoutes');
const { router: notificationRoutes } = require('./routes/notificationRoutes');

// Import authentication middleware
const { authenticate } = require('./middleware/auth');

// Serve static files for uploads with proper CORS headers
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  const devAllowed = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];
  const isDev = process.env.NODE_ENV !== 'production';
  if (!process.env.NODE_ENV || isDev) {
    if (origin && devAllowed.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    }
  } else {
    res.header('Access-Control-Allow-Origin', 'your-production-domain.com');
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  }
  next();
}, express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/books', authenticate, bookRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', authenticate, groupPostRoutes);
app.use('/api/social', authenticate, socialRoutes);

// Notification routes (protected)
app.use('/api/notifications', notificationRoutes);

// Seed routes (development only - no auth required)
if (process.env.NODE_ENV !== 'production') {
  const seedRoutes = require('./routes/seedRoutes');
  app.use('/api/seed', seedRoutes);
}
app.use('/api/seed', seedRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pagestogether';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log('Database:', mongoose.connection.name);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 5000;
// Remove HOST binding to let it bind to all interfaces
console.log(`Attempting to start server on port ${PORT}`);

const server = app.listen(PORT, () => {
  console.log(`✓ Server successfully started!`);
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✓ Server bound to port: ${PORT}`);
  console.log(`✓ Server is now listening on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please try a different port.`);
    process.exit(1);
  } else if (err.code === 'EACCES') {
    console.error(`❌ Permission denied to bind to port ${PORT}. Try using a different port or run as administrator.`);
    process.exit(1);
  }
});

server.on('listening', () => {
  console.log(`✓ Server is now listening on port ${PORT}`);
});

module.exports = app; 