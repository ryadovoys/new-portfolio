const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'cards.json');
const INDEX_FILE = path.join(ROOT_DIR, 'index.html');

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
    const cardClass = isWide ? 'card card--wide' : 'card';

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

    tagHTML = `<span class="${tagClass}" data-card-index="${index}">${card.tag || ''}</span>`;

    // Media HTML
    let mediaHTML = '';
    const mediaType = card.mediaType;
    const media = card.media;

    if (mediaType === 'carousel' && Array.isArray(media)) {
        // Carousel
        let slidesHTML = '';
        media.forEach(item => {
            if (item.endsWith('.mp4') || item.endsWith('.webm') || item.endsWith('.mov')) {
                slidesHTML += `
                 <div class="carousel__slide">
                    <video src="${item}" autoplay loop muted playsinline></video>
                 </div>`;
            } else {
                slidesHTML += `
                 <div class="carousel__slide">
                    <img src="${item}" alt="">
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
        mediaHTML = `
        <div class="card__image" data-card-index="${index}">
            <video src="${media}" autoplay loop muted playsinline></video>
        </div>`;
    } else if (media) {
        // Image
        mediaHTML = `
        <div class="card__image" data-card-index="${index}">
            <img src="${media}" alt="">
        </div>`;
    } else {
        // Empty
        mediaHTML = `<div class="card__image" data-card-index="${index}"></div>`;
    }

    // Link wrapper logic (if card has a link, wrap content? Or onclick?)
    // Existing code index.html example uses onclick="window.open(...)".
    // We don't have link data in the current cards.json structure shown in previous turns?
    // Let's assume standard card structure for now. If link property existed, we'd add it.

    return `
    <div class="${cardClass}">
        ${mediaHTML}
        <div class="card__content">
            <div class="card__header">
                <h3 class="card__title" data-card-index="${index}">${card.title || 'Card title'}</h3>
                ${tagHTML}
            </div>
            <p class="card__description" data-card-index="${index}">${card.description || ''}</p>
        </div>
    </div>
    `;
}

// 4. Process HTML
let html = fs.readFileSync(INDEX_FILE, 'utf8');

// Generate cards HTML
const cardsHTML = cards.map((c, i) => generateCardHTML(c, i)).join('\n');

// Inject into grid
// Look for where the grid starts and ends, or easier: replace the placeholder or empty grid content.
// The index.html has static cards + placeholder. 
// We want to REPLACE the inner contents of <div class="card-grid"> ... </div>
const gridRegex = /<div class="card-grid">([\s\S]*?)<\/div>/;
html = html.replace(gridRegex, `<div class="card-grid">\n${cardsHTML}\n</div>`);

// Remove Editor Scripts & Styles
// Remove Sortable
html = html.replace(/<script src=".*sortable.*"><\/script>/i, '');
// Remove card-editor.js
html = html.replace(/<script src="js\/card-editor\.js"><\/script>/, '<script src="js/card-viewer.js"></script>');
// Modify CSS links if needed (card-editor.css might be safe to keep or remove, let's keep for now as it probably has card styles)
// Actually card-editor.css likely has the "add button" styles. We can leave it, unused styles are fine.

// Remove Theme Toggle (Optionally, user might want this? User didn't ask to remove it. Keeping it.)

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

console.log('Assets copied. Build complete.');
