const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    let token;

    // Get token from header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

  // Verify token
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
  const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked'
      });
    }

    req.user = { id: user._id, email: user.email, username: user.username };
    next();
  } catch (error) {
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

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Session-based authentication middleware
const authenticateSession = (req, res, next) => {
  if (req.session && req.session.userId) {
    User.findById(req.session.userId)
      .then(user => {
        if (user && !user.isLocked) {
          req.user = { id: user._id, email: user.email, username: user.username };
          return next();
        }
        
        req.session.destroy();
        res.status(401).json({
          success: false,
          message: 'Session invalid or account locked'
        });
      })
      .catch(error => {
        console.error('Session auth error:', error);
        res.status(500).json({
          success: false,
          message: 'Session authentication failed'
        });
      });
  } else {
    res.status(401).json({
      success: false,
      message: 'No active session'
    });
  }
};

// Combined authentication middleware (JWT + Session)
const authenticate = async (req, res, next) => {
  // Try JWT first, then session
  const jwtAuth = new Promise((resolve) => {
    authenticateToken(req, res, (err) => {
      if (err || !req.user) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });

  const sessionAuth = new Promise((resolve) => {
    if (req.session && req.session.userId) {
      User.findById(req.session.userId)
        .then(user => {
          if (user && !user.isLocked) {
            req.user = { id: user._id, email: user.email, username: user.username };
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch(() => resolve(false));
    } else {
      resolve(false);
    }
  });

  try {
    const jwtResult = await jwtAuth;
    if (jwtResult) {
      return next();
    }

    const sessionResult = await sessionAuth;
    if (sessionResult) {
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  } catch (error) {
    console.error('Combined auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional authentication (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user && !user.isLocked) {
          req.user = { id: user._id, email: user.email, username: user.username };
        }
      } catch (error) {
        // Token invalid, continue without user
      }
    }

    // Check session if no JWT
    if (!req.user && req.session && req.session.userId) {
      try {
        const user = await User.findById(req.session.userId);
        if (user && !user.isLocked) {
          req.user = { id: user._id, email: user.email, username: user.username };
        }
      } catch (error) {
        // Session invalid, continue without user
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without authentication
  }
};

module.exports = {
  authenticateToken,
  authenticateSession,
  authenticate,
  optionalAuth
};
