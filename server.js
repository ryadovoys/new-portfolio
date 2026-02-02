const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Assets directory (flat structure with folder galleries)
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, assetsDir);
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
  const exactPath = path.join(assetsDir, filename);
  if (fs.existsSync(exactPath)) {
    return res.json({
      exists: true,
      path: `/assets/${filename}`
    });
  }

  // Check for files with same base name (ignoring timestamp suffix)
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);

  const existingFiles = fs.readdirSync(assetsDir).filter(f => !fs.statSync(path.join(assetsDir, f)).isDirectory());
  const match = existingFiles.find(f => {
    // Match if file starts with same base name
    return f.startsWith(baseName) && f.endsWith(ext);
  });

  if (match) {
    return res.json({
      exists: true,
      path: `/assets/${match}`
    });
  }

  res.json({ exists: false });
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = `/assets/${req.file.filename}`;
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

// List all assets endpoint (excludes folders and archive)
app.get('/api/assets', (req, res) => {
  try {
    const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
    const assets = entries
      .filter(entry => !entry.isDirectory() && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(entry.name))
      .map(entry => ({
        filename: entry.name,
        path: `/assets/${entry.name}`,
        isVideo: /\.(mp4|webm|mov)$/i.test(entry.name)
      }));
    res.json(assets);
  } catch (error) {
    res.json([]);
  }
});

// List all folders in assets (excludes archive)
app.get('/api/folders', (req, res) => {
  try {
    const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
    const folders = entries
      .filter(entry => entry.isDirectory() && entry.name !== 'archive')
      .map(entry => {
        const folderPath = path.join(assetsDir, entry.name);
        const files = fs.readdirSync(folderPath);
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(f));

        // Get first image as preview
        const preview = imageFiles.length > 0
          ? `/assets/${entry.name}/${imageFiles[0]}`
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

  const folderPath = path.join(assetsDir, folderName);

  // Security check: ensure path is within assetsDir
  if (!folderPath.startsWith(assetsDir)) {
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
        path: `/assets/${folderName}/${f}`,
        isVideo: /\.(mp4|webm|mov)$/i.test(f)
      }));
    res.json(assets);
  } catch (error) {
    console.error('Error reading folder assets:', error);
    res.status(500).json({ error: 'Failed to read folder assets' });
  }
});

// Static-compatible endpoint for folder assets
app.get('/api/folder-assets/:folderName.json', (req, res) => {
  console.log('Server: Request for folder json', req.params.folderName);
  const folderName = req.params.folderName;
  // Reuse existing logic
  const folderPath = path.join(assetsDir, folderName);

  if (!folderPath.startsWith(assetsDir)) {
    return res.status(403).json({ error: 'Invalid folder path' });
  }

  if (!fs.existsSync(folderPath)) {
    return res.json([]);
  }

  try {
    const files = fs.readdirSync(folderPath);
    const assets = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(f => ({
        filename: f,
        path: `/assets/${folderName}/${f}`,
        isVideo: /\.(mp4|webm|mov)$/i.test(f)
      }));
    res.json(assets);
  } catch (error) {
    console.error('Error reading folder assets:', error);
    res.status(500).json({ error: 'Failed to read folder assets' });
  }
});

// AI Chat proxy endpoint (keeps API key server-side)
app.post('/api/ai-chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array required' });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_API_KEY not configured' });
  }

  try {
    // Transform messages to Gemini format
    let systemInstruction = undefined;
    const contents = [];

    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemInstruction = {
          parts: [{ text: msg.content }]
        };
      } else if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: systemInstruction,
        contents: contents,
        generationConfig: {
          maxOutputTokens: 2000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    // Map back to OpenAI format for frontend compatibility
    res.json({
      choices: [{
        message: {
          content: generatedText
        }
      }]
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
});
