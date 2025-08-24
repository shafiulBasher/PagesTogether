# Development Setup Guide

## Prerequisites

Make sure you have the following installed:
- Node.js (v16 or higher)
- npm (v8 or higher)
- MongoDB (running locally or MongoDB Atlas)

## Quick Start

1. **Clone and Install Dependencies**
   ```bash
   # Navigate to project root
   cd PagesTogether
   
   # Install root dependencies
   npm install
   
   # Install all dependencies (server + client)
   npm run install-all
   ```

2. **Environment Setup**
   ```bash
   # Copy the example environment file
   cd server
   cp .env.example .env
   
   # Edit .env with your configuration
   # The default MongoDB connection should work for local development
   ```

3. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod --dbpath /path/to/your/db
   
   # Or use MongoDB service
   sudo systemctl start mongod
   ```

4. **Start Development Servers**
   ```bash
   # Option 1: Use the batch script (Windows)
   start-dev.bat
   
   # Option 2: Use npm script (runs both concurrently)
   npm run dev
   
   # Option 3: Manual start (separate terminals)
   # Terminal 1 - Backend
   cd server && npm run dev
   
   # Terminal 2 - Frontend  
   cd client && npm start
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/api/health

## Development Workflow

### Database Seeding

To populate the database with sample data:
```bash
# From project root
cd server
node -e "
const mongoose = require('mongoose');
const { seedGroups } = require('./controllers/seedController');
mongoose.connect('mongodb://localhost:27017/pagestogether')
  .then(() => seedGroups({ body: {} }, { json: console.log }))
  .catch(console.error);
"
```

Or use the API endpoint after starting the server:
```bash
curl http://localhost:3001/api/seed/groups
```

### User Registration

1. Go to http://localhost:3000/register
2. Create a new account
3. Login with your credentials
4. Start adding books and connecting with friends!

### API Testing

The server includes several API endpoints you can test:

```bash
# Health check
curl http://localhost:3001/api/health

# Get groups (after seeding)
curl http://localhost:3001/api/groups
```

## Troubleshooting

### Port Conflicts
If port 3001 is in use, modify the PORT in `server/.env`:
```
PORT=5001
```

And update the API URL in `client/src/services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:5001';
```

### MongoDB Connection Issues
1. Check if MongoDB is running: `sudo systemctl status mongod`
2. Verify the connection string in `server/.env`
3. Check MongoDB logs for errors

### Package Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API Connection Issues
1. Check that backend is running on correct port
2. Verify CORS settings in `server/index.js`
3. Check browser console for CORS errors

## Features Overview

### ✅ Working Features
- User authentication (register/login/logout)
- Profile management with book statistics
- Book management (add, remove, currently reading)
- Social features (friends, following, notifications)
- Group/Communities system
- Book search integration (Google Books API)
- Responsive design

### 🚧 Features to Enhance
- Book recommendations based on friends' activity
- Book reviews and ratings
- Reading challenges and goals
- Book discussion forums in groups
- Advanced search filters
- Mobile app version

## File Structure

```
PagesTogether/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── contexts/       # React Context providers
│   │   └── App.js          # Main App component
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Node.js backend
│   ├── controllers/        # Business logic
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── config/            # Configuration files
│   ├── .env               # Environment variables
│   └── index.js           # Server entry point
├── uploads/               # File uploads directory
├── package.json           # Root package.json
└── start-dev.bat         # Windows development script
```

## Contributing

1. Create a feature branch: `git checkout -b feature/new-feature`
2. Make your changes
3. Test thoroughly
4. Commit: `git commit -m "Add new feature"`
5. Push: `git push origin feature/new-feature`
6. Create a Pull Request

## Support

For issues or questions:
1. Check this README first
2. Look at the browser console for errors
3. Check server logs in the terminal
4. Create an issue with error details and steps to reproduce
