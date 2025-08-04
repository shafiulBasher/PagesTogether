const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset
} = require('../middleware/validation');

// Generate JWT token helper
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.NODE_ENV === 'production' ? '7d' : '30d'
  });
};

// Set JWT cookie helper
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  
  res.cookie('token', token, cookieOptions);
};

// Local Authentication Routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/refresh-token', authenticate, authController.refreshToken);

// Password Reset Routes
router.post('/forgot-password', validatePasswordResetRequest, authController.requestPasswordReset);
router.post('/reset-password', validatePasswordReset, authController.resetPassword);

// Check authentication status
router.get('/status', (req, res) => {
  // Check JWT token
  let isAuthenticated = false;
  let user = null;
  
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      isAuthenticated = true;
    }
  } catch (error) {
    // Token invalid, check session
    if (req.session && req.session.userId) {
      isAuthenticated = true;
    }
  }
  
  res.json({
    success: true,
    isAuthenticated,
    sessionActive: !!(req.session && req.session.userId)
  });
});

module.exports = router;
