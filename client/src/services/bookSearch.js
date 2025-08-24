// Book search and external API integrations

// Google Books API integration
export const googleBooksAPI = {
  searchBooks: async (query, maxResults = 10) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&printType=books`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search books');
      }
      
      const data = await response.json();
      
      // Transform the results to match our book schema
      const books = data.items?.map(item => ({
        googleBookId: item.id,
        title: item.volumeInfo.title || 'Unknown Title',
        author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
        description: item.volumeInfo.description || '',
        coverImage: item.volumeInfo.imageLinks?.thumbnail || 
                   item.volumeInfo.imageLinks?.smallThumbnail || '',
        publishedDate: item.volumeInfo.publishedDate,
        pageCount: item.volumeInfo.pageCount,
        categories: item.volumeInfo.categories || [],
        language: item.volumeInfo.language,
        isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
        source: 'google'
      })) || [];
      
      return books;
    } catch (error) {
      console.error('Google Books API error:', error);
      throw error;
    }
  },
  
  getBookById: async (bookId) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes/${bookId}`
      );
      
      if (!response.ok) {
        throw new Error('Book not found');
      }
      
      const item = await response.json();
      
      return {
        googleBookId: item.id,
        title: item.volumeInfo.title || 'Unknown Title',
        author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
        description: item.volumeInfo.description || '',
        coverImage: item.volumeInfo.imageLinks?.thumbnail || 
                   item.volumeInfo.imageLinks?.smallThumbnail || '',
        publishedDate: item.volumeInfo.publishedDate,
        pageCount: item.volumeInfo.pageCount,
        categories: item.volumeInfo.categories || [],
        language: item.volumeInfo.language,
        isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
        source: 'google'
      };
    } catch (error) {
      console.error('Google Books API error:', error);
      throw error;
    }
  }
};

// Open Library API integration (alternative/backup)
export const openLibraryAPI = {
  searchBooks: async (query, limit = 10) => {
    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,isbn,subject`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search books');
      }
      
      const data = await response.json();
      
      const books = data.docs?.map(item => ({
        openLibraryId: item.key,
        title: item.title || 'Unknown Title',
        author: item.author_name?.join(', ') || 'Unknown Author',
        coverImage: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : '',
        publishedDate: item.first_publish_year,
        isbn: item.isbn?.[0],
        categories: item.subject?.slice(0, 3) || [],
        source: 'openlibrary'
      })) || [];
      
      return books;
    } catch (error) {
      console.error('Open Library API error:', error);
      throw error;
    }
  }
};

export default {
  googleBooksAPI,
  openLibraryAPI
};
