import React, { useState, useEffect } from 'react';
import { bookAPI, userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Bookshelf.css';

const Bookshelf = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    coverImage: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBookMenu, setShowBookMenu] = useState(null); // Track which book menu is open
  const [showUpdateCoverModal, setShowUpdateCoverModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [currentlyReading, setCurrentlyReading] = useState([]);
  const [showAddToCurrentlyReading, setShowAddToCurrentlyReading] = useState(false);
  const [showCurrentlyReadingMenu, setShowCurrentlyReadingMenu] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedReadingBook, setSelectedReadingBook] = useState(null);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    if (user) {
      loadBooks();
      loadCurrentlyReading();
    }
  }, [user]);

  // Load currently reading books from localStorage
  const loadCurrentlyReading = () => {
    if (user) {
      const stored = localStorage.getItem(`currentlyReading_${user.id || user._id}`);
      if (stored) {
        try {
          const parsedBooks = JSON.parse(stored);
          setCurrentlyReading(parsedBooks);
        } catch (err) {
          console.error('Error loading currently reading books:', err);
        }
      }
    }
  };

  // Save currently reading books to localStorage
  const saveCurrentlyReading = (books) => {
    if (user) {
      localStorage.setItem(`currentlyReading_${user.id || user._id}`, JSON.stringify(books));
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowBookMenu(null);
      setShowCurrentlyReadingMenu(null);
    };
    
    if (showBookMenu || showCurrentlyReadingMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showBookMenu, showCurrentlyReadingMenu]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError('');
      
      const bookshelfRes = await bookAPI.getBookshelf().catch(() => ({ data: [] }));
      const allBooks = Array.isArray(bookshelfRes.data) ? bookshelfRes.data : [];
      setBooks(allBooks);
    } catch (err) {
      setError('Failed to load books. Please try again.');
      console.error('Books load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setShowAddModal(true);
    setNewBook({ title: '', author: '', coverImage: '' });
    setError('');
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setNewBook({ title: '', author: '', coverImage: '' });
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBook(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddBook = async () => {
    // Validation
    if (!newBook.title.trim() || !newBook.author.trim()) {
      setError('Book title and author are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const bookData = {
        title: newBook.title.trim(),
        author: newBook.author.trim(),
        coverImage: newBook.coverImage.trim() || '',
        source: 'manual'
      };

      await bookAPI.addBook(bookData);
      
      // Close modal and refresh book list
      handleCloseModal();
      await loadBooks();
    } catch (err) {
      setError('Failed to add book. Please try again.');
      console.error('Add book error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookMenuClick = (e, bookId) => {
    e.stopPropagation();
    setShowBookMenu(showBookMenu === bookId ? null : bookId);
  };

  const handleBookInfo = (book) => {
    alert(`Book: ${book.title}\nAuthor: ${book.author}\nAdded: ${new Date(book.createdAt || Date.now()).toLocaleDateString()}`);
    setShowBookMenu(null);
  };

  const handleDownloadCover = (book) => {
    setSelectedBook(book);
    setNewCoverUrl(book.coverImage || '');
    setShowUpdateCoverModal(true);
    setShowBookMenu(null);
  };

  const handleUpdateCover = async () => {
    if (!newCoverUrl.trim()) {
      alert('Please enter a valid image URL');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const updatedBookData = {
        title: selectedBook.title,
        author: selectedBook.author,
        coverImage: newCoverUrl.trim(),
        source: selectedBook.source || 'manual'
      };

      await bookAPI.updateBook(selectedBook._id, updatedBookData);
      
      // Close modal and refresh book list
      setShowUpdateCoverModal(false);
      setSelectedBook(null);
      setNewCoverUrl('');
      await loadBooks();
    } catch (err) {
      alert('Failed to update book cover. Please try again.');
      console.error('Update cover error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseUpdateCoverModal = () => {
    setShowUpdateCoverModal(false);
    setSelectedBook(null);
    setNewCoverUrl('');
  };

  const handleRemoveBook = async (book) => {
    if (window.confirm(`Are you sure you want to remove "${book.title}" from your bookshelf?`)) {
      try {
        await bookAPI.deleteBook(book._id);
        
        // Also remove from currently reading if it exists there
        const updatedCurrentlyReading = currentlyReading.filter(cb => cb._id !== book._id);
        if (updatedCurrentlyReading.length !== currentlyReading.length) {
          setCurrentlyReading(updatedCurrentlyReading);
          saveCurrentlyReading(updatedCurrentlyReading);
        }
        
        await loadBooks();
        setShowBookMenu(null);
      } catch (err) {
        alert('Failed to remove book. Please try again.');
        console.error('Remove book error:', err);
      }
    }
  };

  const handleAddToCurrentlyReading = (book) => {
    if (!currentlyReading.find(cb => cb._id === book._id)) {
      const bookWithProgress = { ...book, readingProgress: 0, isRead: false };
      const updatedBooks = [...currentlyReading, bookWithProgress];
      setCurrentlyReading(updatedBooks);
      saveCurrentlyReading(updatedBooks);
    }
    setShowBookMenu(null);
  };

  const handleRemoveFromCurrentlyReading = (bookId) => {
    const updatedBooks = currentlyReading.filter(book => book._id !== bookId);
    setCurrentlyReading(updatedBooks);
    saveCurrentlyReading(updatedBooks);
  };

  const handleOpenCurrentlyReadingModal = () => {
    setShowAddToCurrentlyReading(true);
    setShowBookMenu(null);
  };

  const handleCloseCurrentlyReadingModal = () => {
    setShowAddToCurrentlyReading(false);
  };

  const handleCurrentlyReadingMenuClick = (e, bookId) => {
    e.stopPropagation();
    setShowCurrentlyReadingMenu(showCurrentlyReadingMenu === bookId ? null : bookId);
  };

  const handleMarkAsRead = (book) => {
    const updatedBooks = currentlyReading.map(b => 
      b._id === book._id ? { ...b, isRead: true, readingProgress: 100 } : b
    );
    setCurrentlyReading(updatedBooks);
    saveCurrentlyReading(updatedBooks);
    setShowCurrentlyReadingMenu(null);
  };

  const handleUpdateProgress = (book) => {
    setSelectedReadingBook(book);
    setReadingProgress(book.readingProgress || 0);
    setShowProgressModal(true);
    setShowCurrentlyReadingMenu(null);
  };

  const handleSaveProgress = () => {
    if (selectedReadingBook) {
      const updatedBooks = currentlyReading.map(b => 
        b._id === selectedReadingBook._id 
          ? { ...b, readingProgress: readingProgress, isRead: readingProgress === 100 } 
          : b
      );
      setCurrentlyReading(updatedBooks);
      saveCurrentlyReading(updatedBooks);
      setShowProgressModal(false);
      setSelectedReadingBook(null);
    }
  };

  const handleCloseProgressModal = () => {
    setShowProgressModal(false);
    setSelectedReadingBook(null);
  };

  if (loading) {
    return (
      <div className="bookshelf-container">
        <div className="loading">Loading your books...</div>
      </div>
    );
  }

  return (
    <div className="bookshelf-container">
      {/* Currently Reading Section */}
      <div className="currently-reading-section">
        <h3>Currently Reading:</h3>
        <div className="currently-reading-grid">
          {currentlyReading.map((book) => (
            <div key={book._id} className="currently-reading-item">
              <div className="currently-reading-cover">
                {book.coverImage ? (
                  <img src={book.coverImage} alt={book.title} />
                ) : (
                  <div className="book-placeholder-small">
                    <div className="book-spine-small">
                      <span className="book-title-small">{book.title}</span>
                    </div>
                  </div>
                )}
                
                {/* Progress indicator */}
                {book.readingProgress > 0 && (
                  <div className="progress-indicator">{book.readingProgress}%</div>
                )}
                
                {/* Read badge */}
                {book.isRead && (
                  <div className="read-badge">Read</div>
                )}
                
                {/* Three dots menu button */}
                <button 
                  className="currently-reading-menu-button"
                  onClick={(e) => handleCurrentlyReadingMenuClick(e, book._id)}
                />
                
                {/* Currently Reading Menu popup */}
                {showCurrentlyReadingMenu === book._id && (
                  <div className="currently-reading-menu-popup" onClick={(e) => e.stopPropagation()}>
                    <div className="book-menu-item" onClick={() => handleMarkAsRead(book)}>
                      <span className="book-menu-icon">📖</span>
                      Mark as Read
                    </div>
                    <div className="book-menu-item" onClick={() => handleUpdateProgress(book)}>
                      <span className="book-menu-icon">📊</span>
                      Progress reading
                    </div>
                    <div className="book-menu-item remove" onClick={() => handleRemoveFromCurrentlyReading(book._id)}>
                      <span className="book-menu-icon">❌</span>
                      Remove
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Add Book to Currently Reading */}
          <div className="add-to-currently-reading">
            <div className="add-reading-card" onClick={handleOpenCurrentlyReadingModal}>
              <div className="add-icon">+</div>
              <div className="add-text">Add Book</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bookshelf-header">
        <h2>My BookShelf</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Books Grid with Add Button */}
      <div className="books-grid-container">
        {books.map((book, index) => (
          <div key={book._id} className="book-item">
            <div className="book-cover">
              {book.coverImage ? (
                <img src={book.coverImage} alt={book.title} />
              ) : (
                <div className="book-placeholder">
                  <div className="book-spine">
                    <span className="book-title">{book.title}</span>
                    <span className="book-author">{book.author}</span>
                  </div>
                </div>
              )}
              {/* Progress indicator for some books */}
              {index === 1 && <div className="progress-indicator">20%</div>}
              {index === 8 && <div className="progress-indicator">92%</div>}
              {/* Book title overlay for hover effect */}
              <div className="author-overlay">
                <p className="author-name">{book.title}</p>
              </div>
              
              {/* Three dots menu button */}
              <button 
                className="book-menu-button"
                onClick={(e) => handleBookMenuClick(e, book._id)}
              />
              
              {/* Book menu popup */}
              {showBookMenu === book._id && (
                <div className="book-menu-popup" onClick={(e) => e.stopPropagation()}>
                  <div className="book-menu-item" onClick={() => handleBookInfo(book)}>
                    <span className="book-menu-icon">ℹ️</span>
                    Book Information
                  </div>
                  <div className="book-menu-item" onClick={() => handleDownloadCover(book)}>
                    <span className="book-menu-icon">🖼️</span>
                    Update Book Cover
                  </div>
                  <div className="book-menu-item" onClick={() => handleAddToCurrentlyReading(book)}>
                    <span className="book-menu-icon">📖</span>
                    Add to Currently Reading
                  </div>
                  <div className="book-menu-item remove" onClick={() => handleRemoveBook(book)}>
                    <span className="book-menu-icon">🗑️</span>
                    Remove from My BookShelf
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Add Book Button */}
        <div className="add-book-item">
          <div className="add-book-card" onClick={handleOpenModal}>
            <div className="add-icon">+</div>
            <div className="add-text">Add Book</div>
          </div>
        </div>
      </div>

      {books.length === 0 && (
        <div className="empty-state">
          <p>No books in your collection yet.</p>
          <div className="add-book-item">
            <div className="add-book-card" onClick={handleOpenModal}>
              <div className="add-icon">+</div>
              <div className="add-text">Add Book</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Book</h3>
              <button className="close-button" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="title">Book Title *</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={newBook.title}
                  onChange={handleInputChange}
                  placeholder="Enter book title"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="author">Author Name *</label>
                <input
                  id="author"
                  name="author"
                  type="text"
                  value={newBook.author}
                  onChange={handleInputChange}
                  placeholder="Enter author name"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="coverImage">Cover Image URL (optional)</label>
                <input
                  id="coverImage"
                  name="coverImage"
                  type="url"
                  value={newBook.coverImage}
                  onChange={handleInputChange}
                  placeholder="Paste image URL here"
                  disabled={isSubmitting}
                />
                <small className="form-help">
                  You can copy and paste an image URL from the web
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button" 
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="save-button" 
                onClick={handleAddBook}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Book Cover Modal */}
      {showUpdateCoverModal && (
        <div className="modal-overlay" onClick={handleCloseUpdateCoverModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Book Cover</h3>
              <button className="close-button" onClick={handleCloseUpdateCoverModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {selectedBook && (
                <div className="book-info">
                  <p><strong>Book:</strong> {selectedBook.title}</p>
                  <p><strong>Author:</strong> {selectedBook.author}</p>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="newCoverUrl">New Cover Image URL *</label>
                <input
                  id="newCoverUrl"
                  name="newCoverUrl"
                  type="url"
                  value={newCoverUrl}
                  onChange={(e) => setNewCoverUrl(e.target.value)}
                  placeholder="Paste new image URL here"
                  disabled={isSubmitting}
                />
                <small className="form-help">
                  Copy and paste an image URL from the web to update the book cover
                </small>
              </div>

              {newCoverUrl && (
                <div className="cover-preview">
                  <p><strong>Preview:</strong></p>
                  <img 
                    src={newCoverUrl} 
                    alt="Cover preview" 
                    style={{
                      width: '100px',
                      height: '140px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button" 
                onClick={handleCloseUpdateCoverModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="save-button" 
                onClick={handleUpdateCover}
                disabled={isSubmitting || !newCoverUrl.trim()}
              >
                {isSubmitting ? 'Updating...' : 'Update Cover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Currently Reading Modal */}
      {showAddToCurrentlyReading && (
        <div className="modal-overlay" onClick={handleCloseCurrentlyReadingModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add to Currently Reading</h3>
              <button className="close-button" onClick={handleCloseCurrentlyReadingModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p>Select books from your bookshelf to add to Currently Reading:</p>
              <div className="book-selection-grid">
                {books
                  .filter(book => !currentlyReading.find(cb => cb._id === book._id))
                  .map((book) => (
                    <div 
                      key={book._id} 
                      className="selectable-book-item"
                      onClick={() => {
                        handleAddToCurrentlyReading(book);
                        handleCloseCurrentlyReadingModal();
                      }}
                    >
                      <div className="selectable-book-cover">
                        {book.coverImage ? (
                          <img src={book.coverImage} alt={book.title} />
                        ) : (
                          <div className="book-placeholder">
                            <div className="book-spine">
                              <span className="book-title">{book.title}</span>
                              <span className="book-author">{book.author}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="book-title-label">{book.title}</p>
                    </div>
                  ))}
              </div>
              
              {books.filter(book => !currentlyReading.find(cb => cb._id === book._id)).length === 0 && (
                <p>All books from your bookshelf are already in Currently Reading.</p>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button" 
                onClick={handleCloseCurrentlyReadingModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reading Progress Modal */}
      {showProgressModal && (
        <div className="modal-overlay" onClick={handleCloseProgressModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Reading Progress</h3>
              <button className="close-button" onClick={handleCloseProgressModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {selectedReadingBook && (
                <div className="book-info">
                  <p><strong>Book:</strong> {selectedReadingBook.title}</p>
                  <p><strong>Author:</strong> {selectedReadingBook.author}</p>
                </div>
              )}
              
              <div className="progress-section">
                <label>Reading Progress: {readingProgress}%</label>
                <div className="progress-slider-container">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={readingProgress}
                    onChange={(e) => setReadingProgress(parseInt(e.target.value))}
                    className="progress-slider"
                  />
                  <div className="progress-labels">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
                <p className="progress-text">
                  {readingProgress === 0 && "Haven't started yet"}
                  {readingProgress > 0 && readingProgress < 100 && `${readingProgress}% completed`}
                  {readingProgress === 100 && "Finished reading!"}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button" 
                onClick={handleCloseProgressModal}
              >
                Cancel
              </button>
              <button 
                className="save-button" 
                onClick={handleSaveProgress}
              >
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookshelf;
