document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.querySelector('.card-grid');
    const backButton = document.querySelector('.back-button');

    if (!grid || !backButton) return;

    // Fetch and render cards
    try {
        const response = await fetch('/api/cards');
        const cards = await response.json();

        // Clear existing grid, keeping placeholder if present (though we removed it in HTML)
        grid.innerHTML = '';

        // Render cards
        cards.forEach((data, index) => {
            // Determine card class
            let cardClass = 'card';
            if (data.width === 'wide') cardClass += ' card--wide';
            if (data.width === 'invisible') cardClass += ' card--invisible';

            const cardEl = document.createElement('div');
            cardEl.className = cardClass;
            cardEl.dataset.cardIndex = index;
            if (data.tag) cardEl.dataset.category = data.tag.toLowerCase();
            if (data.folder) cardEl.dataset.folder = data.folder;

            // Build inner HTML structure
            const mediaHtml = renderMedia(data.media, data.mediaType);

            cardEl.innerHTML = `
        <div class="card__image">
          ${mediaHtml}
        </div>
        <div class="card__content">
          <div class="card__header">
            <h3 class="card__title">${data.title || 'Card title'}</h3>
            <span class="card__tag ${getTagClass(data.tag)}">${data.tag || ''}</span>
          </div>
          <p class="card__description">${data.description || ''}</p>
        </div>
      `;

            grid.appendChild(cardEl);

            // Only set up as project if it has a folder and is visible
            if (data.folder && data.width !== 'invisible') {
                setupProjectCard(cardEl);
            }
        });

    } catch (e) {
        console.error('Error loading cards:', e);
        // Fallback
        grid.innerHTML = '<p style="padding: 20px;">Failed to load card data. Make sure server is running.</p>';
    }

    // --- Helper Functions ---

    function renderMedia(media, type) {
        if (!media) return '';

        if (type === 'video') {
            return `<video src="${media}" autoplay loop muted playsinline></video>`;
        } else if (type === 'carousel' && Array.isArray(media)) {
            const slides = media.map(item => {
                if (typeof item === 'string') {
                    return `<div class="carousel__slide"><img src="${item}" alt=""></div>`;
                }
                return '';
            }).join('');
            return `<div class="carousel__track">${slides}</div>`;
        } else {
            return `<img src="${media}" alt="">`;
        }
    }

    function getTagClass(tag) {
        if (!tag) return new String('');
        const map = {
            'SKILL': 'card__tag--skill',
            'PROJECT': 'card__tag--project',
            'PERSONAL': 'card__tag--personal',
            'EXPERIENCE': 'card__tag--experience',
            'EXPERIMENT': 'card__tag--experiment'
        };
        return map[tag.toUpperCase()] || '';
    }

    // State for manual scrolling
    let activeExpandedCard = null;
    let currentScrollX = 0;

    function setupProjectCard(card) {
        const imageContainer = card.querySelector('.card__image');
        if (!imageContainer) return;

        // Function to create layers
        const createLayers = (assets = []) => {
            if (assets.length === 0) return; // REMOVE GREY BOXES: Only create if we have real assets

            const numLayers = assets.length;

            for (let i = 1; i <= numLayers; i++) {
                const layer = document.createElement('div');
                layer.className = `project-layer project-layer--${i}`;
                layer.style.setProperty('--layer-index', i);

                const imageRadius = getComputedStyle(imageContainer).borderRadius;
                layer.style.borderRadius = imageRadius;
                layer.style.zIndex = `-${i}`; // Stack backwards

                // Size and Position
                const cardStyle = getComputedStyle(card);
                const padding = cardStyle.paddingTop;

                // Position strictly behind the image
                layer.style.top = padding;
                layer.style.left = padding;
                layer.style.width = `calc(100% - (${padding} * 2))`;
                layer.style.height = `${imageContainer.offsetHeight}px`;

                // Background/Content
                // Use real asset
                // Note: Arrays are 0-indexed, layers 1-indexed (for class)
                const asset = assets[i - 1];
                layer.style.background = '#fff'; // base
                layer.style.overflow = 'hidden';

                // Create image or video
                if (asset.isVideo) {
                    const vid = document.createElement('video');
                    vid.src = asset.path;
                    vid.autoplay = true;
                    vid.loop = true;
                    vid.muted = true;
                    vid.playsInline = true;
                    vid.style.width = '100%';
                    vid.style.height = '100%';
                    vid.style.objectFit = 'cover';
                    layer.appendChild(vid);
                } else {
                    const img = document.createElement('img');
                    img.src = asset.path;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    layer.appendChild(img);
                }

                card.appendChild(layer);
            }

            // Re-observe for size changes (resize observer already setup below)
            const layers = card.querySelectorAll('.project-layer');
            layers.forEach(l => {
                l.style.height = `${imageContainer.offsetHeight}px`;
            });
        };

        // Initialize layers and activate card behaviors
        if (!card.querySelector('.project-layer')) {
            if (card.dataset.folder) {
                // Fetch real assets
                fetch(`/api/folder-assets?folder=${card.dataset.folder}`)
                    .then(r => r.json())
                    .then(assets => {
                        if (assets && assets.length > 0) {
                            // ACTIVATE CARD: Add class and behavior only if content exists
                            card.classList.add('card--project');
                            createLayers(assets);
                            activateCardInteraction();
                        } else {
                            // If no images found, card remains a simple static card
                            card.style.cursor = 'default';
                        }
                    })
                    .catch(e => {
                        console.error(e);
                        card.style.cursor = 'default';
                    });
            }

            const observer = new ResizeObserver(() => {
                const layers = card.querySelectorAll('.project-layer');
                layers.forEach(l => {
                    l.style.height = `${imageContainer.offsetHeight}px`;
                });
            });
            observer.observe(imageContainer);
        }

        function activateCardInteraction() {
            // Click to expand
            card.addEventListener('click', (e) => {
                e.stopPropagation();

                if (!document.body.classList.contains('is-project-expanded')) {
                    // FLIP: First
                    const rect = card.getBoundingClientRect();

                    // Create placeholder
                    const placeholder = document.createElement('div');
                    placeholder.className = 'card card--placeholder';
                    placeholder.style.width = getComputedStyle(card).width;
                    placeholder.style.height = getComputedStyle(card).height;
                    placeholder.style.opacity = '0';
                    card.parentNode.insertBefore(placeholder, card);

                    // Set initial position
                    card.style.position = 'fixed';
                    card.style.top = rect.top + 'px';
                    card.style.left = rect.left + 'px';
                    card.style.width = rect.width + 'px';
                    card.style.height = rect.height + 'px';
                    card.style.zIndex = '1000';
                    card.style.margin = '0';

                    // Force reflow
                    card.offsetHeight;

                    document.body.classList.add('is-project-expanded');
                    card.classList.add('is-active');

                    activeExpandedCard = card;
                    activeCloseFunction = closeExpanded; // Start tracking close function
                    currentScrollX = 0;

                    // Calculate target height (Image + Padding)
                    imageContainer.style.flexShrink = '0';

                    const style = getComputedStyle(card);
                    const paddingTop = parseFloat(style.paddingTop);
                    const paddingBottom = parseFloat(style.paddingBottom);
                    const targetHeight = imageContainer.offsetHeight + paddingTop + paddingBottom;

                    // Calculate target Left position
                    const targetLeft = window.innerWidth <= 768 ? 20 : 40;

                    requestAnimationFrame(() => {
                        card.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                        card.style.top = '50%';
                        card.style.left = targetLeft + 'px';
                        card.style.transform = 'translateY(-50%)';
                        card.style.height = targetHeight + 'px';

                        setTimeout(() => {
                            if (activeExpandedCard === card) {
                                card.style.transition = 'none';
                            }
                        }, 800);
                    });
                }
            });
        }

        // Back button (still there for explicit escape)
        backButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeExpanded();
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (document.body.classList.contains('is-project-expanded')) {
                if (!card.contains(e.target)) {
                    closeExpanded();
                }
            }
        });

        function closeExpanded() {
            if (!card.classList.contains('is-active')) return;

            // Restore transition for closing animation
            card.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';

            // Reverse FLIP
            // 1. Get placeholder position
            const placeholder = document.querySelector('.card--placeholder');
            if (placeholder) {
                const rect = placeholder.getBoundingClientRect();

                // Animate back to placeholder
                card.style.top = rect.top + 'px';
                card.style.left = rect.left + 'px';
                // Restore original height (from placeholder)
                card.style.height = rect.height + 'px';
                // Reset transform (including scroll) to 0
                card.style.transform = 'translate(0, 0)';

                document.body.classList.remove('is-project-expanded');
                card.classList.remove('is-active');

                activeExpandedCard = null;
                activeCloseFunction = null;

                // Cleanup after transition
                card.addEventListener('transitionend', function cleanup() {
                    card.style.position = '';
                    card.style.top = '';
                    card.style.left = '';
                    card.style.width = '';
                    card.style.height = '';
                    card.style.zIndex = '';
                    card.style.margin = '';
                    card.style.transform = '';
                    card.style.transition = '';
                    card.style.overflow = '';

                    // Reset flex shrink
                    const imgContainer = card.querySelector('.card__image');
                    if (imgContainer) imgContainer.style.flexShrink = '';

                    placeholder.remove();
                    card.removeEventListener('transitionend', cleanup);
                }, { once: true });
            } else {
                // Fallback if no placeholder
                document.body.classList.remove('is-project-expanded');
                card.classList.remove('is-active');
                activeExpandedCard = null;
            }
        }
    } // End setupProjectCard

    // Touch state
    let touchStartX = 0;
    let touchStartY = 0;
    let initialScrollX = 0;

    // Global reference to the close function of the currently active card
    let activeCloseFunction = null;
    let wheelTimeout = null; // Detect end of wheel scroll
    let isScrollGestureStartedAtZero = false; // Track if current interaction started at start boundary
    let isTouchActive = false;

    // Global wheel listener for horizontal scrolling when expanded
    window.addEventListener('wheel', handleWheel, { passive: false });

    // Global Touch Listeners
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    function handleWheel(e) {
        if (!activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;

        e.preventDefault();

        // Detect start of a new wheel "burst"
        if (!wheelTimeout) {
            isScrollGestureStartedAtZero = (currentScrollX === 0);
        }

        // Clear timeout if scrolling continues
        if (wheelTimeout) clearTimeout(wheelTimeout);

        // Remove transition for direct control
        activeExpandedCard.style.transition = 'none';

        // Scroll speed factor
        const speed = 1.5;
        updateScroll(e.deltaY * speed);

        // Detect end of scroll for snapback
        wheelTimeout = setTimeout(() => {
            checkSnapback();
            wheelTimeout = null; // Reset for next burst detection
        }, 50); // Reduced delay to 50ms
    }

    function handleTouchStart(e) {
        if (!activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;
        isTouchActive = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        initialScrollX = currentScrollX;
        isScrollGestureStartedAtZero = (currentScrollX === 0);

        // Remove transition for direct control
        activeExpandedCard.style.transition = 'none';
    }

    function handleTouchEnd(e) {
        if (!activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;
        checkSnapback();
    }

    function checkSnapback() {
        // Not needed for start boundary anymore as we have immediate close.
        // Keeping it for potential future end-of-project rubber banding if needed.
        if (!activeExpandedCard) return;
    }

    function handleTouchMove(e) {
        if (!activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const deltaX = touchStartX - touchX;
        const deltaY = touchStartY - touchY;

        // If predominantly horizontal swipe, handle it
        // On mobile, "scrolling down" is swiping UP. 
        // We want horizontal swipe.
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            e.preventDefault();
            // In touch, moving finger LEFT (positive deltaX) means scrolling content RIGHT (viewing more) -> subtract from X
            // Moving finger RIGHT (negative deltaX) means scrolling BACK -> add to X
            // Our currentScrollX is negative for "forward", positive for "back".
            // So: finger left (deltaX positive) -> should DECREASE ScrollX (more negative).
            // finger right (deltaX < 0) -> should INCREASE ScrollX (towards 0).
            // So: newScroll = current - delta

            // Logic handled in updateScroll uses "delta" to subtract.
            // If delta is positive (wheel down), we subtract -> go negative -> forward.
            // Finger left = deltaX positive. We want forward. So subtract.
            // Matches wheel logic.

            // Touch sensitivity usually 1:1, maybe slightly boosted
            const touchSpeed = 1.2;
            let targetScrollX = initialScrollX - (deltaX * touchSpeed);

            // PHYSICAL STOP: If we are scrolling back to the start, catch it at 0
            if (initialScrollX < 0 && targetScrollX > 0) {
                targetScrollX = 0;
            }

            // 2. IMMEDIATE CLOSE: If gesture starts at 0 and moves back
            if (currentScrollX === 0 && targetScrollX > 0) {
                if (isScrollGestureStartedAtZero && activeCloseFunction) {
                    activeCloseFunction();
                    return;
                }
                // If not allowed to close yet, keep at 0
                targetScrollX = 0;
            }

            currentScrollX = targetScrollX;
            applyScrollClamp();
        }
    }

    function updateScroll(delta) {
        const prevScrollX = currentScrollX;

        // 1. IMMEDIATE CLOSE: If at 0 and scrolling back
        if (currentScrollX === 0 && delta < 0) {
            if (isScrollGestureStartedAtZero && activeCloseFunction) {
                activeCloseFunction();
                return;
            }
        }

        // 2. Normal displacement
        currentScrollX -= delta;

        // 3. PHYSICAL STOP: Catch returning scroll at 0
        if (prevScrollX < 0 && currentScrollX > 0) {
            currentScrollX = 0;
        }

        // 4. Ensure we never drift into positive unless it's a close trigger (handled above)
        if (currentScrollX > 0) currentScrollX = 0;

        applyScrollClamp();
    }

    function applyScrollClamp() {
        // --- Clamp Logic ---
        // 1. Calculate limits
        const style = getComputedStyle(activeExpandedCard);
        const startLeft = parseFloat(activeExpandedCard.style.left) || 0;
        const cardWidth = activeExpandedCard.offsetWidth;
        const padding = parseFloat(style.paddingTop) || 20; // fallback

        // Dynamic layer count
        const layers = activeExpandedCard.querySelectorAll('.project-layer');
        const numLayers = layers.length || 6;

        const layerGap = 4;
        const totalContentWidth = (numLayers * (cardWidth + layerGap)) + cardWidth - padding;

        const viewportWidth = window.innerWidth;
        const targetRightMargin = 40;

        // We want: startLeft + currentScrollX + totalContentWidth >= viewportWidth - targetRightMargin
        // So: currentScrollX >= viewportWidth - targetRightMargin - startLeft - totalContentWidth

        let minScrollX = viewportWidth - targetRightMargin - startLeft - totalContentWidth;

        // If content is smaller than viewport, clamp to 0 (don't scroll)
        if (minScrollX > 0) minScrollX = 0;

        // Normal bounds clamp
        if (currentScrollX < minScrollX) currentScrollX = minScrollX;
        if (currentScrollX > 0) currentScrollX = 0;

        // Clamp Logic
        if (currentScrollX > 0) {
            // Rubber band allowed (positive)
        } else {
            // Normal bounds
            if (currentScrollX < minScrollX) currentScrollX = minScrollX;
        }

        // Apply transform
        // Note: translateY(-50%) is needed for vertical centering
        activeExpandedCard.style.transform = `translateY(-50%) translateX(${currentScrollX}px)`;
    }

});
