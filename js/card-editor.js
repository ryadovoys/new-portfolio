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
        this.initSortable();
    }

    initSortable() {
        const grid = document.querySelector('.card-grid');
        if (!grid) return;

        new Sortable(grid, {
            animation: 200,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            handle: '.card__image',
            ghostClass: 'card--ghost',
            chosenClass: 'card--chosen',
            dragClass: 'card--dragging',
            onEnd: (evt) => {
                // Reorder cards array
                const movedCard = this.cards.splice(evt.oldIndex, 1)[0];
                this.cards.splice(evt.newIndex, 0, movedCard);

                // Update card indices
                this.cards.forEach((card, i) => {
                    card.id = i;
                    const element = card.element;
                    element.querySelector('.card__title').dataset.cardIndex = i;
                    element.querySelector('.card__description').dataset.cardIndex = i;
                    element.querySelector('.card__image').dataset.cardIndex = i;
                    const deleteBtn = element.querySelector('.card__delete-btn');
                    if (deleteBtn) deleteBtn.dataset.cardIndex = i;
                });

                this.saveCards();
            }
        });
    }

    async loadCards() {
        try {
            const response = await fetch('/api/cards');
            const savedCards = await response.json();

            // Clear existing static cards (except the placeholder)
            const grid = document.querySelector('.card-grid');
            const placeholder = document.getElementById('addCardPlaceholder');

            // Remove all .card elements that are NOT the placeholder
            const existingCards = grid.querySelectorAll('.card:not(#addCardPlaceholder)');
            existingCards.forEach(card => card.remove());

            this.cards = [];

            if (savedCards && savedCards.length > 0) {
                // Create dynamic cards from data
                savedCards.forEach((cardData, index) => {
                    this.createCardFromData(cardData, index, grid, placeholder);
                });
            } else {
                // Fallback: If no data, maybe we want to create some default empty cards?
                // For now, let's just start with 0 cards and the user can add them.
                console.log('No saved cards found, starting empty');
            }
        } catch (e) {
            console.error('Error loading cards:', e);
        }
    }

    createCardFromData(data, index, grid, placeholder) {
        // Determine card class based on data.width
        const isWide = data.width === 'wide';
        const cardClass = isWide ? 'card card--wide' : 'card';

        const cardEl = document.createElement('div');
        cardEl.className = cardClass;

        // Build HTML structure
        cardEl.innerHTML = `
          <div class="card__image"></div>
          <div class="card__content">
            <div class="card__header">
              <h3 class="card__title">${data.title || 'Card title'}</h3>
              <span class="card__tag">${data.tag || ''}</span>
            </div>
            <p class="card__description">${data.description || 'Click to edit description text.'}</p>
          </div>
        `;

        // Insert into DOM
        grid.insertBefore(cardEl, placeholder);

        // Store in memory
        this.cards.push({
            element: cardEl,
            id: index,
            title: data.title || '',
            description: data.description || '',
            tag: data.tag || '',
            media: data.media || null,
            mediaType: data.mediaType || null
        });

        // Initialize features (edit, drag-drop, color, etc.)
        this.setupNewCard(cardEl, index);

        // Load media if present
        if (data.media) {
            const imageContainer = cardEl.querySelector('.card__image');
            this.setCardMedia(imageContainer, data.media, data.mediaType, index);
        }

        // Apply tag color
        const tagEl = cardEl.querySelector('.card__tag');
        if (tagEl && data.tag) {
            this.updateTagColor(tagEl);
        }
    }

    setupCards() {
        // Now mostly handled by createCardFromData / setupNewCard
        // We can keep this empty or remove it, but for safety let's leave valid empty function
        // in case anything calls it.
    }

    clearCardMedia(e) {
        e.stopPropagation();
        const index = parseInt(e.currentTarget.dataset.cardIndex);
        const zone = e.currentTarget.parentElement;
        const card = this.cards[index];

        if (!card) return;

        // 1. If has carousel media, remove current slide
        if (card.mediaType === 'carousel' && Array.isArray(card.media) && card.media.length > 1) {
            const currentSlide = parseInt(zone.dataset.currentSlide) || 0;
            card.media.splice(currentSlide, 1);

            if (card.media.length === 1) {
                card.mediaType = 'image';
                card.media = card.media[0];
                this.setCardMedia(zone, card.media, 'image', index);
            } else {
                const newSlide = Math.min(currentSlide, card.media.length - 1);
                const items = card.media.map(path => ({ path, type: 'image' }));
                this.setCardCarousel(zone, items, index);
                this.goToSlide(zone, newSlide);
            }
            this.saveCards();
            return;
        }

        // 2. If has single media, clear it
        if (card.media) {
            zone.innerHTML = '';
            zone.classList.remove('card__image--carousel');
            zone.classList.add('card__image--dropzone');

            this.addDeleteButton(zone, index);

            // Re-bind events for the new dropzone
            zone.addEventListener('dragover', (e) => this.handleDragOver(e));
            zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            zone.addEventListener('drop', (e) => this.handleDrop(e));

            card.media = null;
            card.mediaType = null;
            this.saveCards();
            return;
        }

        // 3. If NO media, delete the card itself
        this.removeCard(index);
    }

    removeCard(index) {
        const card = this.cards[index];
        if (!card) return;

        // Remove from DOM
        card.element.remove();

        // Remove from array
        this.cards.splice(index, 1);

        // Update indices for all remaining cards
        this.cards.forEach((c, i) => {
            c.id = i;
            const element = c.element;
            const title = element.querySelector('.card__title');
            const description = element.querySelector('.card__description');
            const tag = element.querySelector('.card__tag');
            const image = element.querySelector('.card__image');
            const deleteBtn = element.querySelector('.card__delete-btn');

            if (title) title.dataset.cardIndex = i;
            if (description) description.dataset.cardIndex = i;
            if (tag) tag.dataset.cardIndex = i;
            if (image) image.dataset.cardIndex = i;
            if (deleteBtn) deleteBtn.dataset.cardIndex = i;
        });

        this.saveCards();
    }

    bindEvents() {
        document.querySelectorAll('.card__title, .card__description, .card__tag').forEach(el => {
            el.addEventListener('click', (e) => e.stopPropagation()); // Prevent card link click
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

        // Add Card buttons
        document.querySelectorAll('.card-add__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.addNewCard(type);
            });
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
                    video.setAttribute('muted', '');
                    video.setAttribute('playsinline', '');
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
        let field;
        if (e.target.classList.contains('card__title')) {
            field = 'title';
        } else if (e.target.classList.contains('card__tag')) {
            field = 'tag';
            // Update tag color based on content
            this.updateTagColor(e.target);
        } else {
            field = 'description';
        }

        if (this.cards[index]) {
            this.cards[index][field] = e.target.textContent.trim();
            this.saveCards();
        }
    }

    updateTagColor(tagElement) {
        const text = tagElement.textContent.trim().toUpperCase();

        // Remove all variant classes
        tagElement.classList.remove('card__tag--skill', 'card__tag--project', 'card__tag--personal', 'card__tag--experience', 'card__tag--experiment', 'card__tag--empty');

        // Apply appropriate class based on content
        if (!text) {
            tagElement.classList.add('card__tag--empty');
        } else if (text === 'SKILL') {
            tagElement.classList.add('card__tag--skill');
        } else if (text === 'PROJECT') {
            tagElement.classList.add('card__tag--project');
        } else if (text === 'PERSONAL') {
            tagElement.classList.add('card__tag--personal');
        } else if (text === 'EXPERIENCE') {
            tagElement.classList.add('card__tag--experience');
        } else if (text === 'EXPERIMENT') {
            tagElement.classList.add('card__tag--experiment');
        }
        // Default: uses base --tag-bg and --tag-text (purple)
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

        if (zone.classList.contains('card__image--loading')) return;

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
            video.setAttribute('muted', '');
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
                video.setAttribute('muted', '');
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
            track.style.transition = 'transform 0.3s ease';
            this.goToSlide(zone, newSlide);

            // Cleanup window listeners
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove); // If added to window? No, handleMove used for both.
            // window.removeEventListener('touchend', handleEnd); // If added to window? handleEnd is on track for touch.
        };

        // Mouse events
        track.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        // Touch events
        track.addEventListener('touchstart', handleStart, { passive: true });
        track.addEventListener('touchmove', handleMove, { passive: false });
        track.addEventListener('touchend', handleEnd);

        // Cleanup function to remove window listeners when carousel is destroyed/replaced
        // Note: usage of this approach relies on the fact that we replace innerHTML
        // Ideally we should track these listeners and remove them explicitly.
        // For now, removing them on handleEnd ensures we don't leak during interaction,
        // but if we replace the card while dragging, we might leak. 
        // A better approach for the window listeners:

        const cleanup = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            // We can't remove touchend easily if it was added to track, but track is removed from DOM.
            // Window listeners are the main concern.
        };

        // Append cleanup to the track so we can find it? No, that's messy.
        // Instead, we will remove window listeners inside handleEnd.


        // Resize handler - recalculate position
        window.addEventListener('resize', () => {
            const currentSlide = parseInt(zone.dataset.currentSlide) || 0;
            const slideWidth = zone.offsetWidth;
            track.style.transition = 'none';
            track.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
        });

        // Hover scrub navigation
        let isHovering = false;

        zone.addEventListener('mouseenter', () => {
            isHovering = true;
        });

        zone.addEventListener('mouseleave', () => {
            isHovering = false;
        });

        zone.addEventListener('mousemove', (e) => {
            // Don't scrub while dragging
            if (isDragging || !isHovering) return;

            const totalSlides = parseInt(zone.dataset.totalSlides);
            if (totalSlides <= 1) return;

            const rect = zone.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const containerWidth = rect.width;

            // Calculate which slide based on mouse position
            const zoneWidth = containerWidth / totalSlides;
            let targetSlide = Math.floor(mouseX / zoneWidth);

            // Clamp to valid range
            targetSlide = Math.max(0, Math.min(targetSlide, totalSlides - 1));

            const currentSlide = parseInt(zone.dataset.currentSlide);
            if (targetSlide !== currentSlide) {
                track.style.transition = 'transform 0.15s ease-out';
                this.goToSlide(zone, targetSlide);
            }
        });
    }

    goToSlide(zone, index) {
        const track = zone.querySelector('.carousel__track');
        const slideWidth = zone.offsetWidth;

        track.style.transition = 'transform 0.3s ease';
        track.style.transform = `translateX(-${index * slideWidth}px)`;

        zone.dataset.currentSlide = index;
    }

    async addNewCard(type) {
        const grid = document.querySelector('.card-grid');
        const placeholder = document.getElementById('addCardPlaceholder');
        if (!grid || !placeholder) return;

        const index = this.cards.length;
        const cardClass = type === 'wide' ? 'card card--wide' : 'card';

        const cardEl = document.createElement('div');
        cardEl.className = cardClass;
        cardEl.innerHTML = `
          <div class="card__image"></div>
          <div class="card__content">
            <div class="card__header">
              <h3 class="card__title">Card title</h3>
              <span class="card__tag"></span>
            </div>
            <p class="card__description">Click to edit description text.</p>
          </div>
        `;

        // Insert before placeholder
        grid.insertBefore(cardEl, placeholder);

        const newCard = {
            element: cardEl,
            id: index,
            title: 'Card title',
            description: 'Click to edit description text.',
            tag: '',
            media: null,
            mediaType: null
        };

        this.cards.push(newCard);

        // Setup the new card (contentEditable, delete buttons, etc.)
        this.setupNewCard(cardEl, index);

        // Save progress
        this.saveCards();

        // Scroll to the new card
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setupNewCard(card, index) {
        const title = card.querySelector('.card__title');
        const description = card.querySelector('.card__description');
        const tag = card.querySelector('.card__tag');
        const imageContainer = card.querySelector('.card__image');

        if (title) {
            title.contentEditable = true;
            title.dataset.cardIndex = index;
            title.addEventListener('click', (e) => e.stopPropagation());
            title.addEventListener('blur', (e) => this.handleTextEdit(e));
            title.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        }
        if (description) {
            description.contentEditable = true;
            description.dataset.cardIndex = index;
            description.addEventListener('click', (e) => e.stopPropagation());
            description.addEventListener('blur', (e) => this.handleTextEdit(e));
            description.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        }
        if (tag) {
            tag.contentEditable = true;
            tag.dataset.cardIndex = index;
            tag.addEventListener('click', (e) => e.stopPropagation());
            tag.addEventListener('blur', (e) => this.handleTextEdit(e));
            tag.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
            // Set placeholder text when empty
            if (!tag.textContent.trim()) {
                tag.dataset.placeholder = 'TAG';
                this.updateTagColor(tag);
            }
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

            imageContainer.addEventListener('dragover', (e) => this.handleDragOver(e));
            imageContainer.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            imageContainer.addEventListener('drop', (e) => this.handleDrop(e));
            imageContainer.addEventListener('click', (e) => this.handleZoneClick(e));
        }
    }

    async saveCards() {
        const dataToSave = this.cards.map(card => ({
            title: card.title,
            description: card.description,
            tag: card.tag,
            width: card.element.classList.contains('card--wide') ? 'wide' : 'regular',
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
