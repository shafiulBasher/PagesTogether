# PagesTogether - Book Reading Community

A modern web application for book lovers to manage their reading lists, track their progress, and connect with other readers.

## Features

### User Profile
- **Modern Profile Design**: Clean, card-based layout with gradient backgrounds and smooth animations
- **Profile Information**: Display username, email, bio, and favorite quotes
- **Reading Statistics**: Real-time stats showing total books, currently reading, books read, and want-to-read
- **Editable Profile**: Users can edit their bio and favorite quotes with a modern form interface
- **Profile Picture Support**: Avatar display with fallback to user initials
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### My Bookshelf
- **Currently Reading Section**: Dedicated section for books currently being read
- **Complete Book Collection**: Grid layout displaying all books in the user's collection
- **Book Management**: Add, remove, and manage reading status for books
- **Cover Image Support**: Display book covers with fallback to styled book spines
- **Reading Status Tracking**: Track books as "Want to Read", "Currently Reading", or "Read"
- **Modern Modal Interface**: Beautiful add book modal with form validation
- **Loading States**: Smooth loading indicators for all actions
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Technical Features
- **React.js Frontend**: Modern React with hooks and functional components
- **Responsive CSS Grid**: Flexible layouts that adapt to different screen sizes
- **Gradient Design**: Beautiful gradient backgrounds and button effects
- **Smooth Animations**: Hover effects, transitions, and micro-interactions
- **API Integration**: Full integration with backend services for data persistence
- **Authentication**: Protected routes and user session management

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd PagesTogether
```

2. Install dependencies for both client and server:
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Set up environment variables:
```bash
# In the server directory, create a .env file
cp .env.example .env
# Edit the .env file with your configuration
```

4. Start the development servers:
```bash
# Start the backend server (from server directory)
npm run dev

# Start the frontend (from client directory, in a new terminal)
npm start
```

## Usage

### Profile Page
1. Navigate to `/profile` or click "Profile Settings" in the navigation
2. View your reading statistics and profile information
3. Click "Edit Profile" to modify your bio and favorite quotes
4. Save changes to update your profile

### Bookshelf Management
1. Navigate to `/profile` to access your bookshelf
2. Click "Add Book" to add a new book to your collection
3. Fill in the book details (title, author, cover image URL, description)
4. Choose the reading status (Want to Read, Currently Reading, or Read)
5. Use the action buttons to manage your books:
   - "Add to Reading" - Move a book to currently reading
   - "Currently Reading" - Remove a book from currently reading
   - "Remove" - Delete a book from your collection

### Sample Book Cover URLs
When adding books, you can use these sample cover URLs:
- Harry Potter: `https://covers.openlibrary.org/b/isbn/9780439023481-M.jpg`
- Mockingjay: `https://covers.openlibrary.org/b/isbn/9780439708180-M.jpg`
- To Kill a Mockingbird: `https://covers.openlibrary.org/b/isbn/9780061120084-M.jpg`
- The Hobbit: `https://covers.openlibrary.org/b/isbn/9780544003415-M.jpg`
- 1984: `https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg`


REACT_APP_API_URL=relative

This will use the CRA proxy (configured in `client/package.json`) so requests go to the backend on `http://localhost:5000` without hardcoding the host.

```
PagesTogether/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── UserProfile.js
│   │   │   ├── UserProfile.css
│   │   │   ├── Bookshelf.js
│   │   │   └── Bookshelf.css
│   │   ├── pages/          # Page components
│   │   │   ├── ProfilePage.js
│   │   │   └── ProfilePage.css
│   │   ├── services/       # API services
│   │   └── contexts/       # React contexts
│   └── public/             # Static assets
└── server/                 # Node.js backend
    ├── controllers/        # Route controllers
    ├── models/            # Database models
    ├── routes/            # API routes
    └── middleware/        # Custom middleware
```

## Technologies Used

- **Frontend**: React.js, CSS3, HTML5
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose)
- **Authentication**: JWT tokens
- **Styling**: Custom CSS with gradients and animations
- **State Management**: React Context API
- **HTTP Client**: Axios

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
