const User = require('../models/User');
const Book = require('../models/Book');
const { validationResult } = require('express-validator');

// Helper to ensure absolute URL for images
const makeAbsoluteUrl = (value, req) => {
  if (!value) return value;
  // If already absolute, return as-is
  if (/^https?:\/\//i.test(value)) return value;
  // Normalize leading slash
  const path = value.startsWith('/') ? value : `/${value}`;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${path}`;
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

  res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
    profilePicture: makeAbsoluteUrl(user.profilePicture, req),
        bio: user.bio,
        favoriteQuote: user.favoriteQuote,
        authProvider: user.authProvider,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

  const { username, profilePicture, bio, favoriteQuote } = req.body;
    
    // Check if username is already taken (if being changed)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
      user.username = username;
    }
    
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (bio !== undefined) user.bio = bio;
    if (favoriteQuote !== undefined) user.favoriteQuote = favoriteQuote;
    
  await user.save();
    
  res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
    profilePicture: makeAbsoluteUrl(user.profilePicture, req),
        bio: user.bio,
        favoriteQuote: user.favoriteQuote
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

exports.getCurrentlyReading = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('currentlyReading');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      currentlyReading: user.currentlyReading
    });
  } catch (err) {
    console.error('Get currently reading error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get currently reading list'
    });
  }
};

exports.addToCurrentlyReading = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { bookId } = req.body;
    
    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Book ID is required'
      });
    }

    // Check if book exists and belongs to user
    const book = await Book.findOne({ _id: bookId, addedBy: req.user.id });
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found in your collection'
      });
    }

    // Check if book is already in currently reading
    if (user.currentlyReading.includes(bookId)) {
      return res.status(400).json({
        success: false,
        message: 'Book is already in currently reading list'
      });
    }

    user.currentlyReading.push(bookId);
    await user.save();

    res.json({
      success: true,
      message: 'Book added to currently reading'
    });
  } catch (err) {
    console.error('Add to currently reading error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to add to currently reading'
    });
  }
};

exports.removeFromCurrentlyReading = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { bookId } = req.params;
    
    user.currentlyReading = user.currentlyReading.filter(
      (id) => id.toString() !== bookId
    );
    
    await user.save();

    res.json({
      success: true,
      message: 'Book removed from currently reading'
    });
  } catch (err) {
    console.error('Remove from currently reading error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from currently reading'
    });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

  // Create the full URL for the profile picture
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const profilePictureUrl = `${baseUrl}/uploads/profiles/${req.file.filename}`;
    
    user.profilePicture = profilePictureUrl;
    await user.save();

  res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: profilePictureUrl
    });
  } catch (err) {
    console.error('Upload profile picture error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture'
    });
  }
}; 