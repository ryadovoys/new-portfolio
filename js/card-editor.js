/* =================================================================
   CARD EDITOR
   Drag-and-drop and inline editing with carousel support
   ================================================================= */

class CardEditor {
    constructor() {
        this.cards = [];
        this.init();
    }

    async init() {
        await this.loadCards();
        this.setupCards();
        this.bindEvents();
    }

    async loadCards() {
        try {
            const response = await fetch('/api/cards');
            const savedCards = await response.json();

            const cardElements = document.querySelectorAll('.card');

            cardElements.forEach((card, index) => {
                const savedData = savedCards[index] || {};

                this.cards.push({
                    element: card,
                    id: index,
                    title: savedData.title || '',
                    description: savedData.description || '',
                    media: savedData.media || null,
                    mediaType: savedData.mediaType || null
                });

                if (savedData.title) {
                    card.querySelector('.card__title').textContent = savedData.title;
                }
                if (savedData.description) {
                    card.querySelector('.card__description').textContent = savedData.description;
                }
                if (savedData.media) {
                    const imageContainer = card.querySelector('.card__image');
                    this.setCardMedia(imageContainer, savedData.media, savedData.mediaType, index);
                }
            });
        } catch (e) {
            console.log('No saved cards found, starting fresh');
            document.querySelectorAll('.card').forEach((card, index) => {
                this.cards.push({
                    element: card,
                    id: index,
                    title: card.querySelector('.card__title')?.textContent || '',
                    description: card.querySelector('.card__description')?.textContent || '',
                    media: null,
                    mediaType: null
                });
            });
        }
    }

    setupCards() {
        document.querySelectorAll('.card').forEach((card, index) => {
            const title = card.querySelector('.card__title');
            const description = card.querySelector('.card__description');
            const imageContainer = card.querySelector('.card__image');

            if (title) {
                title.contentEditable = true;
                title.dataset.cardIndex = index;
            }
            if (description) {
                description.contentEditable = true;
                description.dataset.cardIndex = index;
            }

            if (imageContainer) {
                imageContainer.dataset.cardIndex = index;
                imageContainer.classList.add('card__image--dropzone');

                // Add delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'card__delete-btn';
                deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;
                deleteBtn.dataset.cardIndex = index;
                deleteBtn.addEventListener('click', (e) => this.clearCardMedia(e));
                imageContainer.appendChild(deleteBtn);
            }
        });
    }

    clearCardMedia(e) {
        e.stopPropagation();
        const index = parseInt(e.currentTarget.dataset.cardIndex);
        const zone = e.currentTarget.parentElement;

        // Clear the media
        zone.innerHTML = '';
        zone.classList.remove('card__image--carousel');
        zone.classList.add('card__image--dropzone');

        // Re-add delete button (hidden by CSS when no media)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'card__delete-btn';
        deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;
        deleteBtn.dataset.cardIndex = index;
        deleteBtn.addEventListener('click', (e) => this.clearCardMedia(e));
        zone.appendChild(deleteBtn);

        // Re-bind drag events
        zone.addEventListener('dragover', (e) => this.handleDragOver(e));
        zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        zone.addEventListener('drop', (e) => this.handleDrop(e));

        // Update card data
        if (this.cards[index]) {
            this.cards[index].media = null;
            this.cards[index].mediaType = null;
            this.saveCards();
        }
    }

    bindEvents() {
        document.querySelectorAll('.card__title, .card__description').forEach(el => {
            el.addEventListener('blur', (e) => this.handleTextEdit(e));
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });

        document.querySelectorAll('.card__image').forEach(zone => {
            zone.addEventListener('dragover', (e) => this.handleDragOver(e));
            zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            zone.addEventListener('drop', (e) => this.handleDrop(e));
            zone.addEventListener('click', (e) => this.handleZoneClick(e));
        });

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.asset-picker') && !e.target.closest('.card__image')) {
                this.closeAssetPicker();
            }
        });
    }

    handleZoneClick(e) {
        // Don't open picker if clicking delete button or if has media
        if (e.target.closest('.card__delete-btn')) return;

        const zone = e.currentTarget;
        const hasMedia = zone.querySelector('img') || zone.querySelector('video') || zone.classList.contains('card__image--carousel');

        if (!hasMedia) {
            this.openAssetPicker(zone);
        }
    }

    async openAssetPicker(zone) {
        // Close any existing picker
        this.closeAssetPicker();

        const index = parseInt(zone.dataset.cardIndex);

        // Fetch available assets
        try {
            const response = await fetch('/api/assets');
            const assets = await response.json();

            if (assets.length === 0) {
                return; // No assets, just allow drag-drop
            }

            // Track selected assets
            this.selectedAssets = [];
            this.currentPickerZone = zone;

            // Create picker
            const picker = document.createElement('div');
            picker.className = 'asset-picker';
            picker.dataset.cardIndex = index;

            const header = document.createElement('div');
            header.className = 'asset-picker__header';

            const title = document.createElement('span');
            title.textContent = 'Choose from assets';
            header.appendChild(title);

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'asset-picker__confirm';
            confirmBtn.textContent = 'Confirm';
            confirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmAssetSelection();
            });
            header.appendChild(confirmBtn);

            picker.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'asset-picker__grid';

            assets.forEach(asset => {
                const item = document.createElement('div');
                item.className = 'asset-picker__item';
                item.dataset.path = asset.path;
                item.dataset.isVideo = asset.isVideo;
                item.title = asset.filename;

                if (asset.isVideo) {
                    const video = document.createElement('video');
                    video.src = asset.path;
                    video.muted = true;
                    item.appendChild(video);
                } else {
                    const img = document.createElement('img');
                    img.src = asset.path;
                    img.alt = asset.filename;
                    item.appendChild(img);
                }

                // Toggle selection on click
                item.addEventListener('click', () => this.toggleAssetSelection(item, asset));
                grid.appendChild(item);
            });

            picker.appendChild(grid);
            zone.appendChild(picker);

        } catch (error) {
            console.error('Failed to load assets:', error);
        }
    }

    toggleAssetSelection(item, asset) {
        const index = this.selectedAssets.findIndex(a => a.path === asset.path);

        if (index > -1) {
            // Deselect
            this.selectedAssets.splice(index, 1);
            item.classList.remove('asset-picker__item--selected');
        } else {
            // Select
            this.selectedAssets.push(asset);
            item.classList.add('asset-picker__item--selected');
        }

        // Update confirm button text
        const confirmBtn = document.querySelector('.asset-picker__confirm');
        if (confirmBtn) {
            confirmBtn.textContent = this.selectedAssets.length > 0
                ? `Confirm (${this.selectedAssets.length})`
                : 'Confirm';
        }
    }

    confirmAssetSelection() {
        if (this.selectedAssets.length === 0) {
            this.closeAssetPicker();
            return;
        }

        const zone = this.currentPickerZone;
        const index = parseInt(zone.dataset.cardIndex);

        // Save selection before closing (closeAssetPicker clears selectedAssets)
        const selected = [...this.selectedAssets];

        this.closeAssetPicker();

        if (selected.length === 1) {
            // Single asset
            const asset = selected[0];
            const mediaType = asset.isVideo ? 'video' : 'image';

            this.setCardMedia(zone, asset.path, mediaType, index);

            if (this.cards[index]) {
                this.cards[index].media = asset.path;
                this.cards[index].mediaType = mediaType;
                this.saveCards();
            }
        } else {
            // Multiple assets - create carousel
            const items = selected.map(a => ({
                path: a.path,
                type: a.isVideo ? 'video' : 'image'
            }));

            this.setCardCarousel(zone, items, index);

            if (this.cards[index]) {
                this.cards[index].media = items.map(i => i.path);
                this.cards[index].mediaType = 'carousel';
                this.saveCards();
            }
        }

        this.selectedAssets = [];
        this.currentPickerZone = null;
    }

    closeAssetPicker() {
        const picker = document.querySelector('.asset-picker');
        if (picker) {
            picker.remove();
        }
        this.selectedAssets = [];
        this.currentPickerZone = null;
    }

    selectAsset(zone, asset) {
        const index = parseInt(zone.dataset.cardIndex);
        const mediaType = asset.isVideo ? 'video' : 'image';

        this.closeAssetPicker();
        this.setCardMedia(zone, asset.path, mediaType, index);

        if (this.cards[index]) {
            this.cards[index].media = asset.path;
            this.cards[index].mediaType = mediaType;
            this.saveCards();
        }
    }

    handleTextEdit(e) {
        const index = parseInt(e.target.dataset.cardIndex);
        const field = e.target.classList.contains('card__title') ? 'title' : 'description';

        if (this.cards[index]) {
            this.cards[index][field] = e.target.textContent;
            this.saveCards();
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('card__image--dragover');
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('card__image--dragover');
    }

    async handleDrop(e) {
        e.preventDefault();
        const zone = e.currentTarget;
        zone.classList.remove('card__image--dragover');

        const index = parseInt(zone.dataset.cardIndex);
        const files = Array.from(e.dataTransfer.files);

        if (files.length > 0) {
            await this.uploadAndSetMedia(zone, files, index);
        }
    }

    async uploadAndSetMedia(zone, files, cardIndex) {
        try {
            zone.classList.add('card__image--loading');

            const uploadedPaths = [];

            for (const file of files) {
                // Check if file already exists
                const checkResponse = await fetch('/api/check-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: file.name })
                });
                const checkResult = await checkResponse.json();

                if (checkResult.exists) {
                    // Reuse existing file
                    const isVideo = file.type.startsWith('video/');
                    uploadedPaths.push({
                        path: checkResult.path,
                        type: isVideo ? 'video' : 'image'
                    });
                    console.log(`Reusing existing file: ${checkResult.path}`);
                } else {
                    // Upload new file
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();
                    if (result.success) {
                        const isVideo = file.type.startsWith('video/');
                        uploadedPaths.push({
                            path: result.path,
                            type: isVideo ? 'video' : 'image'
                        });
                        console.log(`Uploaded new file: ${result.path}`);
                    }
                }
            }

            // Get existing media for this card
            const existingCard = this.cards[cardIndex];
            let allItems = [];

            // If card already has media, include it
            if (existingCard && existingCard.media) {
                if (existingCard.mediaType === 'carousel' && Array.isArray(existingCard.media)) {
                    // Already a carousel - add existing items
                    allItems = existingCard.media.map(path => ({ path, type: 'image' }));
                } else if (existingCard.media) {
                    // Single image/video - convert to array
                    allItems = [{ path: existingCard.media, type: existingCard.mediaType || 'image' }];
                }
            }

            // Add newly uploaded files
            allItems = [...allItems, ...uploadedPaths];

            if (allItems.length === 1) {
                // Still just one file
                const { path, type } = allItems[0];
                this.setCardMedia(zone, path, type, cardIndex);

                if (this.cards[cardIndex]) {
                    this.cards[cardIndex].media = path;
                    this.cards[cardIndex].mediaType = type;
                    this.saveCards();
                }
            } else if (allItems.length > 1) {
                // Multiple files - create/update carousel
                this.setCardCarousel(zone, allItems, cardIndex);

                if (this.cards[cardIndex]) {
                    this.cards[cardIndex].media = allItems.map(p => p.path);
                    this.cards[cardIndex].mediaType = 'carousel';
                    this.saveCards();
                }
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            zone.classList.remove('card__image--loading');
        }
    }

    setCardMedia(zone, path, mediaType, cardIndex) {
        zone.innerHTML = '';
        zone.classList.remove('card__image--placeholder');

        // Handle carousel type from saved data
        if (mediaType === 'carousel' && Array.isArray(path)) {
            const paths = path.map(p => ({ path: p, type: 'image' }));
            this.setCardCarousel(zone, paths, cardIndex);
            return;
        }

        if (mediaType === 'video') {
            const video = document.createElement('video');
            video.src = path;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            zone.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = path;
            img.alt = '';
            zone.appendChild(img);
        }

        // Add delete button
        this.addDeleteButton(zone, cardIndex);
    }

    addDeleteButton(zone, cardIndex) {
        // Remove existing delete button if any
        const existing = zone.querySelector('.card__delete-btn');
        if (existing) existing.remove();

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'card__delete-btn';
        deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;
        deleteBtn.dataset.cardIndex = cardIndex;
        deleteBtn.addEventListener('click', (e) => this.clearCardMedia(e));
        zone.appendChild(deleteBtn);
    }

    setCardCarousel(zone, items, cardIndex) {
        zone.innerHTML = '';
        zone.classList.remove('card__image--placeholder');
        zone.classList.add('card__image--carousel');

        // Create carousel track
        const track = document.createElement('div');
        track.className = 'carousel__track';

        items.forEach((item, i) => {
            const slide = document.createElement('div');
            slide.className = 'carousel__slide';

            if (item.type === 'video') {
                const video = document.createElement('video');
                video.src = item.path;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                slide.appendChild(video);
            } else {
                const img = document.createElement('img');
                img.src = item.path;
                img.alt = '';
                slide.appendChild(img);
            }

            track.appendChild(slide);
        });

        zone.appendChild(track);

        // Create dots
        const dots = document.createElement('div');
        dots.className = 'carousel__dots';

        items.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'carousel__dot' + (i === 0 ? ' carousel__dot--active' : '');
            dot.addEventListener('click', () => this.goToSlide(zone, i));
            dots.appendChild(dot);
        });

        zone.appendChild(dots);

        // Initialize carousel state
        zone.dataset.currentSlide = 0;
        zone.dataset.totalSlides = items.length;

        // Add drag/swipe functionality
        this.initCarouselDrag(zone, track);

        // Add delete button
        this.addDeleteButton(zone, cardIndex);
    }

    initCarouselDrag(zone, track) {
        let isDragging = false;
        let startX = 0;
        let currentX = 0;
        let startTranslate = 0;

        const getTranslateX = () => {
            const style = window.getComputedStyle(track);
            const matrix = new DOMMatrix(style.transform);
            return matrix.m41;
        };

        const setTranslateX = (value) => {
            track.style.transform = `translateX(${value}px)`;
        };

        const handleStart = (e) => {
            isDragging = true;
            startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            startTranslate = getTranslateX();
            track.style.transition = 'none';
            zone.classList.add('carousel--dragging');
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const diff = currentX - startX;
            setTranslateX(startTranslate + diff);
        };

        const handleEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            zone.classList.remove('carousel--dragging');

            const diff = currentX - startX;
            const threshold = zone.offsetWidth * 0.2;
            const currentSlide = parseInt(zone.dataset.currentSlide);
            const totalSlides = parseInt(zone.dataset.totalSlides);

            let newSlide = currentSlide;

            if (diff < -threshold && currentSlide < totalSlides - 1) {
                newSlide = currentSlide + 1;
            } else if (diff > threshold && currentSlide > 0) {
                newSlide = currentSlide - 1;
            }

            track.style.transition = 'transform 0.3s ease';
            this.goToSlide(zone, newSlide);
        };

        // Mouse events
        track.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        // Touch events
        track.addEventListener('touchstart', handleStart, { passive: true });
        track.addEventListener('touchmove', handleMove, { passive: false });
        track.addEventListener('touchend', handleEnd);

        // Resize handler - recalculate position
        window.addEventListener('resize', () => {
            const currentSlide = parseInt(zone.dataset.currentSlide) || 0;
            const slideWidth = zone.offsetWidth;
            track.style.transition = 'none';
            track.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
        });
    }

    goToSlide(zone, index) {
        const track = zone.querySelector('.carousel__track');
        const dots = zone.querySelectorAll('.carousel__dot');
        const slideWidth = zone.offsetWidth;

        track.style.transition = 'transform 0.3s ease';
        track.style.transform = `translateX(-${index * slideWidth}px)`;

        zone.dataset.currentSlide = index;

        dots.forEach((dot, i) => {
            dot.classList.toggle('carousel__dot--active', i === index);
        });
    }

    async saveCards() {
        const dataToSave = this.cards.map(card => ({
            title: card.title,
            description: card.description,
            media: card.media,
            mediaType: card.mediaType
        }));

        try {
            await fetch('/api/save-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });
        } catch (error) {
            console.error('Save failed:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CardEditor();
});
