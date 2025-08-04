const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String },
  coverImage: { type: String }, // URL or file path
  description: { type: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  source: { type: String }, // e.g., 'google', 'upload', 'internet'
  googleBookId: { type: String }, // if from Google Books
}, { timestamps: true });

module.exports = mongoose.model('Book', BookSchema); 