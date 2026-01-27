const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure assets/images directory exists
const imagesDir = path.join(__dirname, 'assets', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename - duplicates will be handled by check-file endpoint
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

// Check if file exists endpoint
app.post('/api/check-file', express.json(), (req, res) => {
  const { filename } = req.body;

  // Check for exact match first
  const exactPath = path.join(imagesDir, filename);
  if (fs.existsSync(exactPath)) {
    return res.json({
      exists: true,
      path: `/assets/images/${filename}`
    });
  }

  // Check for files with same base name (ignoring timestamp suffix)
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);

  const existingFiles = fs.readdirSync(imagesDir);
  const match = existingFiles.find(f => {
    // Match if file starts with same base name
    return f.startsWith(baseName) && f.endsWith(ext);
  });

  if (match) {
    return res.json({
      exists: true,
      path: `/assets/images/${match}`
    });
  }

  res.json({ exists: false });
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = `/assets/images/${req.file.filename}`;
  res.json({
    success: true,
    path: filePath,
    filename: req.file.filename
  });
});

// Save card data endpoint
app.post('/api/save-cards', (req, res) => {
  const cardsData = req.body;
  const dataPath = path.join(__dirname, 'data', 'cards.json');

  // Ensure data directory exists
  const dataDir = path.dirname(dataPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(dataPath, JSON.stringify(cardsData, null, 2));
  res.json({ success: true });
});

// Load card data endpoint
app.get('/api/cards', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'cards.json');

  if (fs.existsSync(dataPath)) {
    const data = fs.readFileSync(dataPath, 'utf8');
    res.json(JSON.parse(data));
  } else {
    res.json([]);
  }
});

// List all assets endpoint
app.get('/api/assets', (req, res) => {
  try {
    const files = fs.readdirSync(imagesDir);
    const assets = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(f))
      .map(f => ({
        filename: f,
        path: `/assets/images/${f}`,
        isVideo: /\.(mp4|webm|mov)$/i.test(f)
      }));
    res.json(assets);
  } catch (error) {
    res.json([]);
  }
});

// List all folders in assets/images
app.get('/api/folders', (req, res) => {
  try {
    const entries = fs.readdirSync(imagesDir, { withFileTypes: true });
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => {
        const folderPath = path.join(imagesDir, entry.name);
        const files = fs.readdirSync(folderPath);
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(f));

        // Get first image as preview
        const preview = imageFiles.length > 0
          ? `/assets/images/${entry.name}/${imageFiles[0]}`
          : null;

        return {
          name: entry.name,
          path: entry.name,
          fileCount: imageFiles.length,
          preview
        };
      })
      .filter(folder => folder.fileCount > 0); // Only return folders with media

    res.json(folders);
  } catch (error) {
    console.error('Error listing folders:', error);
    res.json([]);
  }
});

// Get assets from a specific folder
app.get('/api/folder-assets', (req, res) => {
  const folderName = req.query.folder;
  if (!folderName) {
    return res.status(400).json({ error: 'Folder name required' });
  }

  const folderPath = path.join(imagesDir, folderName);

  // Security check: ensure path is within imagesDir
  if (!folderPath.startsWith(imagesDir)) {
    return res.status(403).json({ error: 'Invalid folder path' });
  }

  if (!fs.existsSync(folderPath)) {
    return res.json([]); // Return empty if folder doesn't exist yet
  }

  try {
    const files = fs.readdirSync(folderPath);
    const assets = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) // Natural sort (1, 2, 10)
      .map(f => ({
        filename: f,
        path: `/assets/images/${folderName}/${f}`,
        isVideo: /\.(mp4|webm|mov)$/i.test(f)
      }));
    res.json(assets);
  } catch (error) {
    console.error('Error reading folder assets:', error);
    res.status(500).json({ error: 'Failed to read folder assets' });
  }
});

app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
});
