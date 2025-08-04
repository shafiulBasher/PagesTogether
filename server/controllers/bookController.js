const User = require('../models/User');
const Book = require('../models/Book');
const { validationResult } = require('express-validator');

exports.getBookshelf = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('bookshelf');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json(user.bookshelf || []);
  } catch (err) {
    console.error('Get bookshelf error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookshelf'
    });
  }
};

exports.addBook = async (req, res) => {
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

    const { title, author, coverImage, description, source, googleBookId } = req.body;
    
    // Create new book
    const book = new Book({
      title,
      author,
      coverImage,
      description,
      source: source || 'manual',
      googleBookId,
      addedBy: req.user.id,
    });

    await book.save();

    // Add book to user's bookshelf
    user.bookshelf.push(book._id);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      book
    });
  } catch (err) {
    console.error('Add book error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to add book'
    });
  }
};

exports.updateBook = async (req, res) => {
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

    const { bookId } = req.params;
    const { title, author, coverImage, description, source, googleBookId } = req.body;
    
    // Find book and verify ownership
    const book = await Book.findOne({ _id: bookId, addedBy: req.user.id });
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found or not authorized'
      });
    }

    // Update book fields
    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (coverImage !== undefined) book.coverImage = coverImage;
    if (description !== undefined) book.description = description;
    if (source !== undefined) book.source = source;
    if (googleBookId !== undefined) book.googleBookId = googleBookId;

    await book.save();

    res.json({
      success: true,
      message: 'Book updated successfully',
      book
    });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update book'
    });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    
    // Find and delete book (verify ownership)
    const book = await Book.findOneAndDelete({ _id: bookId, addedBy: req.user.id });
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found or not authorized'
      });
    }

    // Remove book from user's bookshelf and currently reading
    const user = await User.findById(req.user.id);
    if (user) {
      user.bookshelf = user.bookshelf.filter((id) => id.toString() !== bookId);
      user.currentlyReading = user.currentlyReading.filter((id) => id.toString() !== bookId);
      await user.save();
    }

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete book'
    });
  }
}; 