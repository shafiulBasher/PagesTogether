const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directories exist
const baseUploadsDir = 'uploads';
const profileUploadsDir = 'uploads/profiles';
const groupUploadsDir = 'uploads/groups';

[baseUploadsDir, profileUploadsDir, groupUploadsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Decide folder based on route or explicit flag
    const forGroup = req.path?.includes('group') || req.forGroupUpload;
    cb(null, forGroup ? groupUploadsDir : profileUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const forGroup = req.path?.includes('group') || req.forGroupUpload;
    const prefix = forGroup ? 'group' : 'profile';
    cb(null, `${prefix}-${uniqueSuffix}` + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;
