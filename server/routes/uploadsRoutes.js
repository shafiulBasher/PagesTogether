const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

router.post('/upload-profile-picture', authenticate, upload.single('profilePicture'), userController.uploadProfilePicture);

module.exports = router;
