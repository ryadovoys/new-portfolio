const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'cards.json');
const INDEX_FILE = path.join(ROOT_DIR, 'index.html');

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseAttributeString(attrs) {
    const parsed = {};
    const source = String(attrs || '');
    const regex = /([^\s=]+)(?:=(["'])(.*?)\2|=([^\s"']+))?/g;
    let match;

    while ((match = regex.exec(source)) !== null) {
        const key = match[1];
        const quoted = match[3];
        const unquoted = match[4];
        parsed[key] = quoted !== undefined ? quoted : (unquoted !== undefined ? unquoted : '');
    }

    return parsed;
}

function serializeAttributes(map) {
    return Object.entries(map)
        .map(([key, value]) => value === '' ? key : `${key}="${escapeHtml(value)}"`)
        .join(' ');
}

function normalizeLinkAttributes(attrs) {
    const parsed = parseAttributeString(attrs);
    const target = (parsed.target || '').toLowerCase();

    if (target === '_blank') {
        const tokens = new Set(
            String(parsed.rel || '')
                .split(/\s+/)
                .map(t => t.trim())
                .filter(Boolean)
        );
        tokens.add('noopener');
        tokens.add('noreferrer');
        parsed.rel = Array.from(tokens).join(' ');
    }

    return serializeAttributes(parsed);
}

// 1. Prepare Dist Directory
if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR);

console.log('Build started...');

// 2. Load Data
let cards = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        cards = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        console.log(`Loaded ${cards.length} cards.`);
    } catch (e) {
        console.error('Error reading cards data:', e);
    }
}

// 3. Helper to generate Card HTML (matching logic in card-editor.js)
function generateCardHTML(card, index) {
    const isWide = card.width === 'wide';
    const hasFolder = !!card.folder;
    const safeTitle = escapeHtml(card.title || 'Card title');
    const safeTag = escapeHtml(card.tag || '');
    const safeDescription = escapeHtml(card.description || '');
    const imageAlt = safeTitle || 'Project image';

    let cardClass = 'card';
    if (isWide) cardClass += ' card--wide';
    if (hasFolder) cardClass += ' card--project';

    // Tag HTML
    let tagHTML = '';
    let tagClass = 'card__tag';
    const tagText = (card.tag || '').toUpperCase();
    if (!tagText) tagClass += ' card__tag--empty';
    else if (tagText === 'SKILL') tagClass += ' card__tag--skill';
    else if (tagText === 'PROJECT') tagClass += ' card__tag--project';
    else if (tagText === 'PERSONAL') tagClass += ' card__tag--personal';
    else if (tagText === 'EXPERIENCE') tagClass += ' card__tag--experience';
    else if (tagText === 'EXPERIMENT') tagClass += ' card__tag--experiment';

    tagHTML = `<span class="${tagClass}" data-card-index="${index}">${safeTag}</span>`;

    // Media HTML
    let mediaHTML = '';
    const mediaType = card.mediaType;
    const media = card.media;

    if (mediaType === 'carousel' && Array.isArray(media)) {
        // Carousel
        let slidesHTML = '';
        media.forEach((item, mediaIndex) => {
            const safePath = escapeHtml(item);
            const slideAlt = `${imageAlt} slide ${mediaIndex + 1}`;
            if (item.endsWith('.mp4') || item.endsWith('.webm') || item.endsWith('.mov')) {
                slidesHTML += `
                 <div class="carousel__slide">
                    <video src="${safePath}" autoplay loop muted playsinline></video>
                 </div>`;
            } else {
                slidesHTML += `
                 <div class="carousel__slide">
                    <img src="${safePath}" alt="${slideAlt}" loading="lazy" decoding="async">
                 </div>`;
            }
        });

        mediaHTML = `
        <div class="card__image card__image--carousel" data-card-index="${index}" data-current-slide="0" data-total-slides="${media.length}">
            <div class="carousel__track" style="transform: translateX(0px);">
                ${slidesHTML}
            </div>
            <!-- No delete button in prod -->
        </div>`;

    } else if (mediaType === 'video' || (typeof media === 'string' && (media.endsWith('.mp4') || media.endsWith('.webm') || media.endsWith('.mov')))) {
        // Video
        const safePath = escapeHtml(media);
        mediaHTML = `
        <div class="card__image" data-card-index="${index}">
            <video src="${safePath}" autoplay loop muted playsinline></video>
        </div>`;
    } else if (media) {
        // Image
        const safePath = escapeHtml(media);
        mediaHTML = `
        <div class="card__image" data-card-index="${index}">
            <img src="${safePath}" alt="${imageAlt}" loading="lazy" decoding="async">
        </div>`;
    } else {
        // Empty
        mediaHTML = `<div class="card__image" data-card-index="${index}"></div>`;
    }

    // Build attributes
    const folderAttr = hasFolder ? ` data-folder="${escapeHtml(card.folder)}"` : '';
    const linkUrl = card.link ? escapeHtml(card.link.url) : '';
    const linkText = card.link ? escapeHtml(card.link.text) : '';
    const linkAttrs = card.link ? normalizeLinkAttributes(card.link.attributes || '') : '';
    const linkAttrString = linkAttrs ? ` ${linkAttrs}` : '';

    return `
    <div class="${cardClass}"${folderAttr}>
        ${mediaHTML}
        <div class="card__content">
            <div class="card__header">
                <h3 class="card__title" data-card-index="${index}">${safeTitle}</h3>
                ${tagHTML}
            </div>
            <p class="card__description" data-card-index="${index}">${safeDescription}</p>
            ${card.link ? `<a href="${linkUrl}" class="card__link"${linkAttrString}>${linkText}</a>` : ''}
        </div>
    </div>
    `;
}

// 4. Process HTML
let html = fs.readFileSync(INDEX_FILE, 'utf8');

// Generate cards HTML
const cardsHTML = cards.map((c, i) => generateCardHTML(c, i)).join('\n');

// Inject into grid
// Use </main> as the anchor to ensure we capture the entire grid content, 
// preventing early termination at nested </div> tags.
const gridRegex = /<div class="card-grid">[\s\S]*?<\/main>/;
html = html.replace(gridRegex, `<div class="card-grid">\n${cardsHTML}\n</div>\n    </main>`);

// Remove Editor Scripts & Styles
// Remove Sortable
html = html.replace(/\s*<script[^>]*src=["'][^"']*sortable[^"']*["'][^>]*>\s*<\/script>/gi, '');
// Remove editor script with or without cache query strings
html = html.replace(/\s*<script[^>]*src=["'][^"']*js\/card-editor\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/gi, '');

// Add card-project.css link if not present
if (!html.includes('card-project.css')) {
    html = html.replace(
        '<link rel="stylesheet" href="css/components/card-editor.css">',
        '<link rel="stylesheet" href="css/components/card-editor.css">\n  <link rel="stylesheet" href="css/components/card-project.css">'
    );
}

// Ensure external links opened in new tabs are safe in static output.
html = html.replace(/<a\b([^>]*?)>/gi, (full, attrs) => {
    if (!/target\s*=\s*(['"])_blank\1/i.test(attrs) && !/target\s*=\s*_blank/i.test(attrs)) {
        return full;
    }
    const normalized = normalizeLinkAttributes(attrs);
    return `<a ${normalized}>`;
});

// Add close button for project cards (after theme toggle)
const closeButtonHTML = `
  <button class="close-button" aria-label="Close project">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>`;

if (!html.includes('close-button')) {
    html = html.replace(
        '</button>\n\n  <div class="page">',
        `</button>\n${closeButtonHTML}\n\n  <div class="page">`
    );
}

const forbiddenInProdHtml = [
    /js\/card-editor\.js/i,
    /sortable(?:\.min)?\.js/i,
    /id="addCardPlaceholder"/i
];

for (const pattern of forbiddenInProdHtml) {
    if (pattern.test(html)) {
        throw new Error(`Build contains forbidden production artifact: ${pattern}`);
    }
}

// Write HTML
fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html);
console.log('Generated dist/index.html');

// 5. Copy Assets
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            // Filter out editor-specific js if copying js folder
            if (src.endsWith('js') && (entry.name === 'card-editor.js')) {
                continue;
            }
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Copy subdirectories
['assets', 'css', 'js'].forEach(dir => {
    const srcDir = path.join(ROOT_DIR, dir);
    if (fs.existsSync(srcDir)) {
        copyDir(srcDir, path.join(DIST_DIR, dir));
    }
});

// Copy assets-grid.html if exists
const assetsGridSrc = path.join(ROOT_DIR, 'assets-grid.html');
if (fs.existsSync(assetsGridSrc)) {
    fs.copyFileSync(assetsGridSrc, path.join(DIST_DIR, 'assets-grid.html'));
}

// Copy root static files used by SEO and crawlers if they exist.
['robots.txt', 'sitemap.xml'].forEach((filename) => {
    const src = path.join(ROOT_DIR, filename);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(DIST_DIR, filename));
    }
});

// 6. Generate JSON API Files for Static Hosting
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const API_DIR = path.join(DIST_DIR, 'api', 'folder-assets');

if (fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(API_DIR, { recursive: true });

    const entries = fs.readdirSync(ASSETS_DIR, { withFileTypes: true });
    entries.forEach(entry => {
        // Process folders (exclude archive)
        if (entry.isDirectory() && entry.name !== 'archive') {
            const folderName = entry.name;
            const folderPath = path.join(ASSETS_DIR, folderName);
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

                // Write JSON file
                fs.writeFileSync(path.join(API_DIR, `${folderName}.json`), JSON.stringify(assets));
            } catch (err) {
                console.error(`Error processing folder ${folderName}:`, err);
            }
        }
    });
    console.log('Generated Static APIs.');
}

console.log('Assets copied. Build complete.');
