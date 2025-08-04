const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { validateBook } = require('../middleware/validation');

// Bookshelf routes
router.get('/', bookController.getBookshelf);
router.post('/', validateBook, bookController.addBook);
router.put('/:bookId', validateBook, bookController.updateBook);
router.delete('/:bookId', bookController.deleteBook);

module.exports = router; 