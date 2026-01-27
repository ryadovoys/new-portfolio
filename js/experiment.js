document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.querySelector('.card-grid');
    const closeButton = document.querySelector('.close-button');

    if (!grid || !closeButton) return;

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

            // Add track class to container
            imageContainer.classList.add('project-media-track');

            const numLayers = assets.length;

            for (let i = 1; i <= numLayers; i++) {
                const layer = document.createElement('div');
                layer.className = `project-layer project-layer--${i}`;
                layer.style.setProperty('--layer-index', i);

                const imageRadius = getComputedStyle(imageContainer).borderRadius;
                layer.style.borderRadius = imageRadius;
                layer.style.zIndex = `-${i}`; // Stack backwards

                // Size and Position
                // Size and Position
                // Position strictly behind the image (relative to container now)
                layer.style.top = '0';
                layer.style.left = '0';
                layer.style.width = '100%';
                layer.style.height = '100%';

                // Background/Content
                // Use real asset
                // Note: Arrays are 0-indexed, layers 1-indexed (for class)
                const asset = assets[i - 1];
                layer.style.background = 'var(--bg-page)'; // theme-aware base
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

                imageContainer.appendChild(layer);
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
                // Disable expansion on mobile for projects with layers (prioritize scroll)
                if (window.innerWidth <= 768 && card.querySelectorAll('.project-layer').length > 0) {
                    return;
                }

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

                    // Calculate target dimensions
                    imageContainer.style.flexShrink = '0';

                    let targetHeight, targetWidth, targetLeft;

                    // Get card padding
                    const cardStyle = getComputedStyle(card);
                    const pt = parseFloat(cardStyle.paddingTop);
                    const pb = parseFloat(cardStyle.paddingBottom);
                    const pl = parseFloat(cardStyle.paddingLeft);
                    const pr = parseFloat(cardStyle.paddingRight);

                    if (window.innerWidth <= 768) {
                        // Mobile: 100% width (minus 20px padding each side in CSS usually, but here fixed 20px)
                        targetHeight = imageContainer.offsetHeight + pt + pb;
                        targetLeft = 20;
                        targetWidth = window.innerWidth - 40;
                    } else {
                        // Desktop: Scale based on IMAGE height (window - 120px for 60px margins)
                        // Use image original aspect ratio
                        const imgRect = imageContainer.getBoundingClientRect();
                        const imageRatio = imgRect.width / imgRect.height;

                        const targetImageHeight = window.innerHeight - 120;
                        const targetImageWidth = targetImageHeight * imageRatio;

                        targetHeight = targetImageHeight + pt + pb;
                        targetWidth = targetImageWidth + pl + pr;
                        targetLeft = 40; // Standard left alignment
                    }

                    requestAnimationFrame(() => {
                        card.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                        card.style.top = '50%';
                        card.style.left = targetLeft + 'px';
                        card.style.transform = 'translateY(-50%)';
                        card.style.height = targetHeight + 'px';
                        card.style.width = targetWidth + 'px';

                        setTimeout(() => {
                            if (activeExpandedCard === card) {
                                card.style.transition = 'none';
                            }
                        }, 800);
                    });
                }
            });
        }

        // Close button (X)
        closeButton.addEventListener('click', (e) => {
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
                // Restore original dimensions (from placeholder)
                card.style.width = rect.width + 'px';
                card.style.height = rect.height + 'px';
                // Reset transform (including scroll) to 0
                card.style.transform = 'translate(0, 0)';

                document.body.classList.remove('is-project-expanded');
                card.classList.add('is-closing'); // Enable delayed opacity transition
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
                    card.classList.remove('is-closing');
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

    let lastTouchX = 0;
    let lastTouchTime = 0;
    let velocity = 0;
    let momentumId = null;

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

        lastTouchX = touchStartX;
        lastTouchTime = Date.now();
        velocity = 0;
        cancelMomentum();

        // Remove transition for direct control
        activeExpandedCard.style.transition = 'none';
    }

    function handleTouchEnd(e) {
        if (!activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;
        isTouchActive = false;

        if (Math.abs(velocity) > 0.5) {
            startMomentum();
        } else {
            checkSnapback();
        }
    }

    function cancelMomentum() {
        if (momentumId) {
            cancelAnimationFrame(momentumId);
            momentumId = null;
        }
    }

    function startMomentum() {
        cancelMomentum();

        const friction = 0.95;

        function animate() {
            if (Math.abs(velocity) < 0.1) return;

            velocity *= friction;
            currentScrollX += (velocity * 16);

            const limits = getScrollLimits();
            if (currentScrollX > 0) {
                currentScrollX = 0;
                velocity = 0;
            } else if (currentScrollX < limits.min) {
                currentScrollX = limits.min;
                velocity = 0;
            }

            activeExpandedCard.style.transform = `translateY(-50%) translateX(${currentScrollX}px)`;

            if (Math.abs(velocity) >= 0.1) {
                momentumId = requestAnimationFrame(animate);
            }
        }

        momentumId = requestAnimationFrame(animate);
    }

    function getScrollLimits() {
        const style = getComputedStyle(activeExpandedCard);
        const startLeft = parseFloat(activeExpandedCard.style.left) || 0;
        const cardWidth = activeExpandedCard.offsetWidth;
        const padding = parseFloat(style.paddingTop) || 20;
        const layers = activeExpandedCard.querySelectorAll('.project-layer');
        const numLayers = layers.length || 6;
        const layerGap = 4;
        const totalContentWidth = (numLayers * (cardWidth + layerGap)) + cardWidth - padding;
        const viewportWidth = window.innerWidth;
        const targetRightMargin = 40;
        let minScrollX = viewportWidth - targetRightMargin - startLeft - totalContentWidth;
        if (minScrollX > 0) minScrollX = 0;
        return { min: minScrollX, max: 0 };
    }

    function checkSnapback() {
        if (!activeExpandedCard) return;

        // If we are in the "overscroll" zone (positive scrollX) but not closed
        if (currentScrollX > 0) {
            // Linear/Clean stop: No spring bounce
            activeExpandedCard.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
            currentScrollX = 0;
            activeExpandedCard.style.transform = `translateY(-50%) translateX(0px)`;

            setTimeout(() => {
                if (activeExpandedCard && currentScrollX === 0) {
                    activeExpandedCard.style.transition = 'none';
                }
            }, 500);
        }
    }

    function handleTouchMove(e) {
        if (!activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const deltaX = touchStartX - touchX;
        const deltaY = touchStartY - touchY;

        // Velocity calculation for momentum
        const currentTime = Date.now();
        const timeDelta = currentTime - lastTouchTime;
        if (timeDelta > 0) {
            velocity = (touchX - lastTouchX) / timeDelta;
        }
        lastTouchX = touchX;
        lastTouchTime = currentTime;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            e.preventDefault();

            const touchSpeed = 1.2;
            let targetScrollX = initialScrollX - (deltaX * touchSpeed);

            // 1. PHYSICAL STOP: Catch returning scrolls at 0 (Ignore momentum/flick here)
            if (initialScrollX < 0 && targetScrollX > 0) {
                targetScrollX = 0;
            }

            // 2. MOBILE TENSION: Restore resistance and closing thresholds for touch
            if (targetScrollX > 0) {
                if (isScrollGestureStartedAtZero) {
                    const overscrollDelta = targetScrollX - Math.max(0, initialScrollX);
                    targetScrollX = Math.max(0, initialScrollX) + (overscrollDelta * 0.15);

                    // Threshold to close on mobile: 100px
                    if (targetScrollX > 100) {
                        if (activeCloseFunction) {
                            activeCloseFunction();
                            return;
                        }
                    }
                } else {
                    targetScrollX = 0;
                }
            }

            currentScrollX = targetScrollX;
            applyScrollClamp();
        }
    }

    function updateScroll(delta) {
        const prevScrollX = currentScrollX;

        // Normal displacement
        currentScrollX -= delta;

        // PHYSICAL STOP: Catch returning scroll at 0
        if (prevScrollX < 0 && currentScrollX > 0) {
            currentScrollX = 0;
        }

        // Clamp to 0 (No scroll-to-exit for desktop/trackpad)
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
