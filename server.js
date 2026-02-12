const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const assetsDir = path.join(ROOT_DIR, 'assets');
const dataPath = path.join(ROOT_DIR, 'data', 'cards.json');
const MEDIA_FILE_REGEX = /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i;
const MEDIA_MIME_REGEX = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime))$/i;
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 200);
const ADMIN_TOKEN = process.env.PORTFOLIO_ADMIN_TOKEN || '';

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

function sanitizeFilename(name) {
  return path.basename(String(name || ''))
    .replace(/[^\w.\- ]+/g, '_')
    .trim();
}

function isValidMediaFile(filename, mimeType) {
  const hasAllowedExt = MEDIA_FILE_REGEX.test(String(filename || ''));
  if (!mimeType) return hasAllowedExt;
  return hasAllowedExt && MEDIA_MIME_REGEX.test(String(mimeType));
}

function isSafeFolderName(folderName) {
  return typeof folderName === 'string'
    && folderName.length > 0
    && !folderName.includes('..')
    && !folderName.includes('/')
    && !folderName.includes('\\');
}

function resolveInside(baseDir, relativePath) {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(baseDir, String(relativePath || ''));
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    return null;
  }
  return resolved;
}

function listMediaFiles(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isValidMediaFile(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function requireAdminTokenIfConfigured(req, res, next) {
  if (!ADMIN_TOKEN) {
    next();
    return;
  }

  const authHeader = req.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const providedToken = req.get('x-admin-token') || bearer;

  if (providedToken !== ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

function folderAssetsResponse(folderName) {
  if (!isSafeFolderName(folderName)) {
    return { status: 400, error: 'Invalid folder path' };
  }

  const folderPath = resolveInside(assetsDir, folderName);
  if (!folderPath) {
    return { status: 403, error: 'Invalid folder path' };
  }

  if (!fs.existsSync(folderPath)) {
    return { status: 200, data: [] };
  }

  const files = listMediaFiles(folderPath);
  const data = files.map((filename) => ({
    filename,
    path: `/assets/${folderName}/${filename}`,
    isVideo: /\.(mp4|webm|mov)$/i.test(filename)
  }));

  return { status: 200, data };
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, assetsDir);
  },
  filename: (req, file, cb) => {
    const cleaned = sanitizeFilename(file.originalname);
    const ext = path.extname(cleaned);
    const base = path.basename(cleaned, ext) || 'upload';

    let filename = `${base}${ext}`;
    const candidatePath = () => path.join(assetsDir, filename);
    let suffix = 1;
    while (fs.existsSync(candidatePath())) {
      filename = `${base}-${Date.now()}-${suffix}${ext}`;
      suffix += 1;
    }

    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (isValidMediaFile(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// Serve static files
app.use(express.static(__dirname));
app.use(express.json({ limit: '1mb' }));

// Check if file exists endpoint
app.post('/api/check-file', requireAdminTokenIfConfigured, (req, res) => {
  const { filename } = req.body;
  const safeFilename = sanitizeFilename(filename);

  if (!safeFilename || !isValidMediaFile(safeFilename)) {
    res.status(400).json({ error: 'Valid media filename required' });
    return;
  }

  // Check for exact match first
  const exactPath = resolveInside(assetsDir, safeFilename);
  if (exactPath && fs.existsSync(exactPath)) {
    res.json({
      exists: true,
      path: `/assets/${safeFilename}`
    });
    return;
  }

  // Check for files with same base name (ignoring timestamp suffix)
  const ext = path.extname(safeFilename).toLowerCase();
  const baseName = path.basename(safeFilename, ext).toLowerCase();

  const existingFiles = fs.readdirSync(assetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isValidMediaFile(entry.name))
    .map((entry) => entry.name);
  const match = existingFiles.find(f => {
    // Match if file starts with same base name
    const candidateExt = path.extname(f).toLowerCase();
    const candidateBase = path.basename(f, candidateExt).toLowerCase();
    return candidateExt === ext && candidateBase.startsWith(baseName);
  });

  if (match) {
    res.json({
      exists: true,
      path: `/assets/${match}`
    });
    return;
  }

  res.json({ exists: false });
});

// Upload endpoint
app.post('/api/upload', requireAdminTokenIfConfigured, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const filePath = `/assets/${req.file.filename}`;
  res.json({
    success: true,
    path: filePath,
    filename: req.file.filename
  });
});

// Save card data endpoint
app.post('/api/save-cards', requireAdminTokenIfConfigured, (req, res) => {
  const cardsData = req.body;
  if (!Array.isArray(cardsData)) {
    res.status(400).json({ error: 'Cards payload must be an array' });
    return;
  }

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
    const assets = fs.readdirSync(assetsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && isValidMediaFile(entry.name))
      .map((entry) => ({
        filename: entry.name,
        path: `/assets/${entry.name}`,
        isVideo: /\.(mp4|webm|mov)$/i.test(entry.name)
      }))
      .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));
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
        const folderPath = resolveInside(assetsDir, entry.name);
        if (!folderPath) return null;
        const imageFiles = listMediaFiles(folderPath);

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
      .filter(Boolean)
      .filter(folder => folder.fileCount > 0); // Only return folders with media

    res.json(folders);
  } catch (error) {
    console.error('Error listing folders:', error);
    res.json([]);
  }
});

// Get assets from a specific folder
app.get('/api/folder-assets', (req, res) => {
  const folderName = String(req.query.folder || '');
  if (!folderName) {
    res.status(400).json({ error: 'Folder name required' });
    return;
  }

  try {
    const result = folderAssetsResponse(folderName);
    if (result.error) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('Error reading folder assets:', error);
    res.status(500).json({ error: 'Failed to read folder assets' });
  }
});

// Static-compatible endpoint for folder assets
app.get('/api/folder-assets/:folderName.json', (req, res) => {
  const folderName = String(req.params.folderName || '');

  try {
    const result = folderAssetsResponse(folderName);
    if (result.error) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(result.status).json(result.data);
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

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: `File is too large. Max size is ${MAX_UPLOAD_MB}MB.` });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (error) {
    res.status(400).json({ error: error.message || 'Bad request' });
    return;
  }

  next();
});

app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
});
