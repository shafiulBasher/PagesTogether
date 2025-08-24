import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { bookAPI, userAPI, socialAPI } from '../services/api';
import { googleBooksAPI } from '../services/bookSearch';
import { useAuth } from '../contexts/AuthContext';
import './Bookshelf.css';

const Bookshelf = () => {
  const { id: viewedUserId } = useParams();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;
  const isOwnProfile = !viewedUserId || String(viewedUserId) === String(currentUserId);
  const [viewedUsername, setViewedUsername] = useState('');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [addTab, setAddTab] = useState('manual'); // 'manual' | 'search'
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
  // Inline search state (for unified Add Book modal)
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedSearchBook, setSelectedSearchBook] = useState(null);

  useEffect(() => {
    // If viewing someone else's profile, load their public bookshelf/currently reading
    if (!isOwnProfile && viewedUserId) {
      (async () => {
        try {
          setLoading(true);
          setError('');
          const res = await socialAPI.getUserProfile(viewedUserId);
          const profile = res?.data?.data?.user;
          const publicBooks = Array.isArray(profile?.bookshelf) ? profile.bookshelf : [];
          const publicCR = Array.isArray(profile?.currentlyReading) ? profile.currentlyReading : [];
          setBooks(publicBooks);
          // Public currently reading comes from server; no progress info available
          setCurrentlyReading(publicCR);
          setViewedUsername(profile?.username || 'User');
        } catch (e) {
          console.error('Load public bookshelf failed:', e);
          setError('Failed to load user bookshelf.');
          setBooks([]);
          setCurrentlyReading([]);
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    // Otherwise, load current user's bookshelf/currently reading
    if (user) {
      loadBooks();
      loadCurrentlyReadingFromServer();
    }
  }, [user, viewedUserId, isOwnProfile]);

  // Merge reading progress from localStorage into server-provided list
  const mergeProgress = (serverList) => {
    try {
      const uid = user?.id || user?._id;
      const stored = localStorage.getItem(`currentlyReading_${uid}`);
      if (!stored) return serverList;
      const parsed = JSON.parse(stored);
      const progressMap = {};
      parsed.forEach((b) => {
        if (b && b._id) progressMap[b._id] = { readingProgress: b.readingProgress || 0, isRead: !!b.isRead };
      });
      return serverList.map((b) => ({ ...b, ...(progressMap[b._id] || {}) }));
    } catch (e) {
      return serverList;
    }
  };

  // Load currently reading from server for own profile and merge local progress
  const loadCurrentlyReadingFromServer = async () => {
    if (!isOwnProfile) return;
    try {
      const resp = await userAPI.getCurrentlyReading();
      const list = Array.isArray(resp?.data?.currentlyReading) ? resp.data.currentlyReading : [];
      setCurrentlyReading(mergeProgress(list));

      // If server has no items but local storage has some, migrate them by adding to server
      if (list.length === 0) {
        try {
          const uid = user?.id || user?._id;
          const stored = localStorage.getItem(`currentlyReading_${uid}`);
          const localItems = stored ? JSON.parse(stored) : [];
          if (Array.isArray(localItems) && localItems.length) {
            await Promise.allSettled(
              localItems.map((b) => (b && b._id ? userAPI.addToCurrentlyReading(b._id) : Promise.resolve()))
            );
            // Refresh after migration
            const resp2 = await userAPI.getCurrentlyReading();
            const list2 = Array.isArray(resp2?.data?.currentlyReading) ? resp2.data.currentlyReading : [];
            setCurrentlyReading(mergeProgress(list2));
          }
        } catch (_) {
          // ignore migration errors
        }
      }
    } catch (err) {
      console.error('Failed to load currently reading from server:', err);
      // Fallback to local stored progress if server fails
      const uid = user?.id || user?._id;
      const stored = localStorage.getItem(`currentlyReading_${uid}`);
      if (stored) {
        try {
          setCurrentlyReading(JSON.parse(stored));
        } catch (_) {
          setCurrentlyReading([]);
        }
      } else {
        setCurrentlyReading([]);
      }
    }
  };

  // Save currently reading progress to localStorage (progress/isRead flags)
  const saveCurrentlyReading = (books) => {
    if (!isOwnProfile) return; // Read-only on public profile
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
      if (!isOwnProfile) return; // public load handled in effect
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
    if (!isOwnProfile) return;
    setShowAddModal(true);
    setAddTab('manual');
    setNewBook({ title: '', author: '', coverImage: '' });
    setError('');
    // reset search side
    setQuery('');
    setSearchResults([]);
    setSelectedSearchBook(null);
    setSearchError('');
  };

  const handleOpenSearchModal = () => {
    if (!isOwnProfile) return;
    // Open unified modal in search tab
    setShowAddModal(true);
    setAddTab('search');
    setQuery('');
    setSearchResults([]);
    setSelectedSearchBook(null);
    setSearchError('');
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setNewBook({ title: '', author: '', coverImage: '' });
    setError('');
  // reset search fields
  setQuery('');
  setSearchResults([]);
  setSelectedSearchBook(null);
  setSearchError('');
  };

  const handleCloseSearchModal = () => {
    setShowSearchModal(false);
  };

  const handleBookAddFromSearch = (book) => {
    if (!isOwnProfile) return;
    setBooks(prevBooks => [...prevBooks, book]);
    setShowSearchModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBook(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddBook = async () => {
    if (!isOwnProfile) return;
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

  // Inline search handlers (for unified modal)
  const runSearch = async (value) => {
    if (!value || value.trim().length < 2) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    try {
      setSearchLoading(true);
      setSearchError('');
      const books = await googleBooksAPI.searchBooks(value);
      setSearchResults(books);
    } catch (e) {
      setSearchError('Failed to search books. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(window.__bs_debounce);
    window.__bs_debounce = setTimeout(() => runSearch(v), 400);
  };

  const handleSelectSearchBook = (b) => {
    setSelectedSearchBook(b);
  };

  const handleAddSelectedSearchBook = async () => {
    if (!selectedSearchBook) return;
    try {
      setSearchLoading(true);
      // Sanitize to satisfy server-side validation limits
      const clean = (s = '', limit = Infinity) =>
        String(s || '')
          .replace(/<[^>]+>/g, '') // strip HTML tags from descriptions
          .replace(/[\s\n\r\t]+/g, ' ')
          .trim()
          .slice(0, limit);

      const isHttpUrl = (u) => /^https?:\/\//i.test(u || '');
      const safeTitle = clean(selectedSearchBook.title, 200) || 'Untitled';
      // Use first author if the joined string is lengthy
      const rawAuthor = selectedSearchBook.author || '';
      const firstAuthor = rawAuthor.split(',')[0] || rawAuthor;
      const safeAuthor = clean(firstAuthor, 100);
      const safeDescription = clean(selectedSearchBook.description, 1000);
      const safeCover = isHttpUrl(selectedSearchBook.coverImage)
        ? clean(selectedSearchBook.coverImage)
        : '';

      const bookData = {
        title: safeTitle,
        author: safeAuthor,
        description: safeDescription,
        coverImage: safeCover, // optional; empty string will be ignored by validator
        googleBookId: selectedSearchBook.googleBookId,
        source: 'google'
      };
      await bookAPI.addBook(bookData);
      await loadBooks();
      handleCloseModal();
      alert('Book added to your bookshelf!');
    } catch (e) {
      const apiMsg = e?.response?.data?.message;
      const apiErrors = e?.response?.data?.errors;
      const detail = Array.isArray(apiErrors) && apiErrors.length ? `: ${apiErrors[0]?.msg || apiErrors[0]}` : '';
      setSearchError(apiMsg ? `${apiMsg}${detail}` : 'Failed to add book');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBookMenuClick = (e, bookId) => {
    e.stopPropagation();
    if (!isOwnProfile) return; // disable menu on public view
    setShowBookMenu(showBookMenu === bookId ? null : bookId);
  };

  const handleBookInfo = (book) => {
    alert(`Book: ${book.title}\nAuthor: ${book.author}\nAdded: ${new Date(book.createdAt || Date.now()).toLocaleDateString()}`);
    setShowBookMenu(null);
  };

  const handleDownloadCover = (book) => {
    if (!isOwnProfile) return;
    setSelectedBook(book);
    setNewCoverUrl(book.coverImage || '');
    setShowUpdateCoverModal(true);
    setShowBookMenu(null);
  };

  const handleUpdateCover = async () => {
    if (!isOwnProfile) return;
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
    if (!isOwnProfile) return;
    if (window.confirm(`Are you sure you want to remove "${book.title}" from your bookshelf?`)) {
      try {
        await bookAPI.deleteBook(book._id);
        // Also remove from currently reading on server if it exists there
        try { await userAPI.removeFromCurrentlyReading(book._id); } catch (_) {}
        // Refresh currently reading from server
        await loadCurrentlyReadingFromServer();
        
        await loadBooks();
        setShowBookMenu(null);
      } catch (err) {
        alert('Failed to remove book. Please try again.');
        console.error('Remove book error:', err);
      }
    }
  };

  const handleAddToCurrentlyReading = (book) => {
    if (!isOwnProfile) return;
    // Add on server, then refresh list and merge local progress
    const add = async () => {
      try {
        await userAPI.addToCurrentlyReading(book._id);
        await loadCurrentlyReadingFromServer();
      } catch (e) {
        console.error('Add to currently reading failed:', e);
        alert(e?.response?.data?.message || 'Failed to add to currently reading');
      }
    };
    add();
    setShowBookMenu(null);
  };

  const handleRemoveFromCurrentlyReading = (bookId) => {
    if (!isOwnProfile) return;
    const remove = async () => {
      try {
        await userAPI.removeFromCurrentlyReading(bookId);
        await loadCurrentlyReadingFromServer();
      } catch (e) {
        console.error('Remove from currently reading failed:', e);
        alert(e?.response?.data?.message || 'Failed to remove from currently reading');
      }
    };
    remove();
  };

  const handleOpenCurrentlyReadingModal = () => {
    if (!isOwnProfile) return;
    setShowAddToCurrentlyReading(true);
    setShowBookMenu(null);
  };

  const handleCloseCurrentlyReadingModal = () => {
    setShowAddToCurrentlyReading(false);
  };

  const handleCurrentlyReadingMenuClick = (e, bookId) => {
    e.stopPropagation();
    if (!isOwnProfile) return; // disable menu on public view
    setShowCurrentlyReadingMenu(showCurrentlyReadingMenu === bookId ? null : bookId);
  };

  const handleMarkAsRead = (book) => {
    if (!isOwnProfile) return;
    const updatedBooks = currentlyReading.map(b => 
      b._id === book._id ? { ...b, isRead: true, readingProgress: 100 } : b
    );
    setCurrentlyReading(updatedBooks);
    saveCurrentlyReading(updatedBooks);
    setShowCurrentlyReadingMenu(null);
  };

  const handleUpdateProgress = (book) => {
    if (!isOwnProfile) return;
    setSelectedReadingBook(book);
    setReadingProgress(book.readingProgress || 0);
    setShowProgressModal(true);
    setShowCurrentlyReadingMenu(null);
  };

  const handleSaveProgress = () => {
    if (!isOwnProfile) return;
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
      <div className="currently-reading-section">
        <h3>Currently Reading:</h3>
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

                {/* Progress indicator (own profile only) */}
                {isOwnProfile && book.readingProgress > 0 && (
                  <div className="progress-indicator">{book.readingProgress}%</div>
                )}

                {/* Read badge (own profile only) */}
                {isOwnProfile && book.isRead && (
                  <div className="read-badge">Read</div>
                )}

                {/* Actions menu (own profile only) */}
                {isOwnProfile && (
                  <>
                    <button
                      className="currently-reading-menu-button"
                      onClick={(e) => handleCurrentlyReadingMenuClick(e, book._id)}
                    />
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
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Add Book to Currently Reading (own profile only) */}
          {isOwnProfile && (
            <div className="add-to-currently-reading">
              <div className="add-reading-card" onClick={handleOpenCurrentlyReadingModal}>
                <div className="add-icon">+</div>
                <div className="add-text">Add Book</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bookshelf-header">
        <h2>{isOwnProfile ? 'My BookShelf' : `${viewedUsername ? viewedUsername + "'s" : 'User'} BookShelf`}</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

  {/* Books Grid; Add Book tile appears after books */}
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
              {isOwnProfile && index === 1 && <div className="progress-indicator">20%</div>}
              {isOwnProfile && index === 8 && <div className="progress-indicator">92%</div>}
              {/* Book title overlay for hover effect */}
              <div className="author-overlay">
                <p className="author-name">{book.title}</p>
              </div>
              
              {/* Three dots menu button */}
              {isOwnProfile && (
                <button 
                  className="book-menu-button"
                  onClick={(e) => handleBookMenuClick(e, book._id)}
                />
              )}
              
              {/* Book menu popup */}
              {isOwnProfile && showBookMenu === book._id && (
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

        {isOwnProfile && (
          <div className="book-item">
            <div className="add-reading-card" onClick={handleOpenModal}>
              <div className="add-icon">+</div>
              <div className="add-text">Add Book</div>
            </div>
          </div>
        )}
      </div>

      {books.length === 0 && (
        <div className="empty-state">
          <p>No books in your collection yet.</p>
        </div>
      )}

      {/* Unified Add Book Modal (Manual + Search) */}
  {isOwnProfile && showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Book</h3>
              <button className="close-button" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {/* Tab toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  className={`save-button ${addTab === 'manual' ? '' : 'secondary'}`}
                  onClick={() => setAddTab('manual')}
                  type="button"
                >
                  Add Manually
                </button>
                <button
                  className={`save-button ${addTab === 'search' ? '' : 'secondary'}`}
                  onClick={() => setAddTab('search')}
                  type="button"
                >
                  Search Online
                </button>
              </div>

              {addTab === 'manual' ? (
                <>
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
                    <small className="form-help">You can paste an image URL from the web</small>
                  </div>
                </>
              ) : (
                <>
                  {searchError && <div className="error-message">{searchError}</div>}
                  <div className="search-section">
                    <input
                      type="text"
                      placeholder="Search by title, author, or ISBN..."
                      value={query}
                      onChange={handleSearchInput}
                      className="search-input"
                      autoFocus
                    />
                    {searchLoading && <div className="search-loading">Searching...</div>}
                  </div>

                  {!selectedSearchBook ? (
                    <div className="search-results">
                      {searchResults.length > 0 ? (
                        <div className="books-grid">
                          {searchResults.map((b, idx) => (
                            <div key={b.googleBookId || idx} className="book-result-card" onClick={() => handleSelectSearchBook(b)}>
                              <div className="book-cover">
                                {b.coverImage ? <img src={b.coverImage} alt={b.title} /> : (
                                  <div className="cover-placeholder"><span>📚</span></div>
                                )}
                              </div>
                              <div className="book-info">
                                <h4>{b.title}</h4>
                                <p className="book-author">by {b.author}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        query.trim().length >= 2 && !searchLoading ? (
                          <div className="no-results">No results for "{query}"</div>
                        ) : (
                          <div className="search-help">
                            <h3>📚 Search for Books</h3>
                            <p>Start typing to search for books by title, author, or ISBN.</p>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="book-details">
                      <button className="back-button" onClick={() => setSelectedSearchBook(null)}>← Back to results</button>
                      <div className="book-details-content">
                        <div className="book-cover-large">
                          {selectedSearchBook.coverImage ? (
                            <img src={selectedSearchBook.coverImage} alt={selectedSearchBook.title} />
                          ) : (
                            <div className="cover-placeholder-large"><span>📚</span></div>
                          )}
                        </div>
                        <div className="book-info-detailed">
                          <h3>{selectedSearchBook.title}</h3>
                          <p className="author">by {selectedSearchBook.author}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button" 
                onClick={handleCloseModal}
                disabled={isSubmitting || searchLoading}
              >
                Cancel
              </button>
              {addTab === 'manual' ? (
                <button 
                  className="save-button" 
                  onClick={handleAddBook}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Save'}
                </button>
              ) : (
                <button 
                  className="save-button" 
                  onClick={handleAddSelectedSearchBook}
                  disabled={searchLoading || !selectedSearchBook}
                >
                  {searchLoading ? 'Adding...' : 'Add to My Bookshelf'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Book Cover Modal */}
  {isOwnProfile && showUpdateCoverModal && (
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
  {isOwnProfile && showAddToCurrentlyReading && (
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
  {isOwnProfile && showProgressModal && (
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

  {/* Book Search Modal removed; search is integrated above */}
    </div>
  );
};

export default Bookshelf;
