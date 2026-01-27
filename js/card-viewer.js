/* =================================================================
   CARD VIEWER
   Production-only interactions (Carousel, Project Layers)
   ================================================================= */

class CardViewer {
    constructor() {
        this.activeExpandedCard = null;
        this.activeCloseFunction = null;
        this.currentScrollX = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.initialScrollX = 0;
        this.wheelTimeout = null;
        this.isScrollGestureStartedAtZero = false;
        this.isTouchActive = false;
        this.lastTouchX = 0;
        this.lastTouchTime = 0;
        this.velocity = 0;
        this.momentumId = null;

        this.init();
    }

    init() {
        this.setupCarousels();
        this.setupProjectCards();
        this.bindGlobalEvents();
    }

    // =================================================================
    // CAROUSEL FUNCTIONALITY
    // =================================================================

    setupCarousels() {
        const carousels = document.querySelectorAll('.card__image--carousel');

        carousels.forEach(zone => {
            const track = zone.querySelector('.carousel__track');
            if (!track) return;

            this.initCarouselDrag(zone, track);

            window.addEventListener('resize', () => {
                const currentSlide = parseInt(zone.dataset.currentSlide) || 0;
                const slideWidth = zone.offsetWidth;
                track.style.transition = 'none';
                track.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
            });
        });
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
            if (e.target.closest('button')) return;

            isDragging = true;
            startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            startTranslate = getTranslateX();
            track.style.transition = 'none';
            zone.classList.add('carousel--dragging');
        };

        const handleMove = (e) => {
            if (!isDragging) return;

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
            const currentSlide = parseInt(zone.dataset.currentSlide) || 0;
            const totalSlides = parseInt(zone.dataset.totalSlides) || 0;

            let newSlide = currentSlide;

            if (diff < -threshold && currentSlide < totalSlides - 1) {
                newSlide = currentSlide + 1;
            } else if (diff > threshold && currentSlide > 0) {
                newSlide = currentSlide - 1;
            }

            this.goToCarouselSlide(zone, track, newSlide);
        };

        track.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        track.addEventListener('touchstart', handleStart, { passive: true });
        track.addEventListener('touchmove', handleMove, { passive: false });
        track.addEventListener('touchend', handleEnd);

        this.initHoverScrub(zone, track);
    }

    initHoverScrub(zone, track) {
        let isHovering = false;

        zone.addEventListener('mouseenter', () => { isHovering = true; });
        zone.addEventListener('mouseleave', () => { isHovering = false; });

        zone.addEventListener('mousemove', (e) => {
            if (window.matchMedia('(pointer: coarse)').matches) return;
            if (zone.classList.contains('carousel--dragging') || !isHovering) return;

            const totalSlides = parseInt(zone.dataset.totalSlides);
            if (!totalSlides || totalSlides <= 1) return;

            const rect = zone.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const containerWidth = rect.width;

            const zoneSection = containerWidth / totalSlides;
            let slideIndex = Math.floor(mouseX / zoneSection);
            slideIndex = Math.max(0, Math.min(slideIndex, totalSlides - 1));

            this.goToCarouselSlide(zone, track, slideIndex);
        });
    }

    goToCarouselSlide(zone, track, index) {
        const slideWidth = zone.offsetWidth;
        track.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        track.style.transform = `translateX(-${index * slideWidth}px)`;
        zone.dataset.currentSlide = index;

        track.querySelectorAll('video').forEach(v => v.pause());

        const activeSlide = track.children[index];
        if (activeSlide) {
            const video = activeSlide.querySelector('video');
            if (video) video.play().catch(() => { });
        }
    }

    // =================================================================
    // PROJECT CARD FUNCTIONALITY
    // =================================================================

    setupProjectCards() {
        const projectCards = document.querySelectorAll('.card[data-folder]');

        projectCards.forEach(card => {
            this.setupProjectCard(card);
        });
    }

    async setupProjectCard(card) {
        const imageContainer = card.querySelector('.card__image');
        const folder = card.dataset.folder;
        if (!imageContainer || !folder) return;

        const closeButton = document.querySelector('.close-button');

        try {
            const url = `/api/folder-assets/${encodeURIComponent(folder)}.json`;
            console.log('CardViewer: fetching', url);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

            const assets = await res.json();
            console.log('CardViewer: assets received', assets.length);

            if (!assets || assets.length === 0) return;

            // Setup Main Media
            const mainAsset = assets[0];
            const isWide = mainAsset.filename.startsWith('-w');

            if (isWide) {
                card.classList.add('card--wide');
            } else {
                card.classList.remove('card--wide');
            }

            card.classList.add('card--project');
            imageContainer.innerHTML = '';

            let mainMediaEl;
            if (mainAsset.isVideo) {
                mainMediaEl = document.createElement('video');
                mainMediaEl.src = mainAsset.path;
                mainMediaEl.autoplay = true;
                mainMediaEl.loop = true;
                mainMediaEl.muted = true;
                mainMediaEl.playsInline = true;
            } else {
                mainMediaEl = document.createElement('img');
                mainMediaEl.src = mainAsset.path;
                mainMediaEl.alt = mainAsset.filename;
            }
            imageContainer.appendChild(mainMediaEl);

            // Create Layers
            const layerAssets = assets.slice(1);
            this.createLayers(card, imageContainer, layerAssets);

            // Setup ResizeObserver
            const observer = new ResizeObserver(() => {
                const layers = card.querySelectorAll('.project-layer');
                if (window.innerWidth <= 768) {
                    layers.forEach(l => l.style.height = '');
                    return;
                }
                layers.forEach(l => {
                    l.style.height = `${imageContainer.offsetHeight}px`;
                });
            });
            observer.observe(imageContainer);

            // Activate Click to Expand
            this.activateCardInteraction(card, imageContainer, closeButton);

        } catch (e) {
            console.error('Error setting up project card:', e);
        }
    }

    createLayers(card, container, assets) {
        if (assets.length === 0) return;

        container.classList.add('project-media-track');

        let currentOffsetIndex = 1;

        for (let i = 1; i <= assets.length; i++) {
            const layer = document.createElement('div');
            layer.className = `project-layer project-layer--${i}`;

            const asset = assets[i - 1];
            const isWide = asset.filename && asset.filename.includes('-w');
            const widthMult = isWide ? 2 : 1;

            layer.style.setProperty('--layer-offset-index', currentOffsetIndex);
            layer.style.setProperty('--layer-width-mult', widthMult);

            currentOffsetIndex += widthMult;

            if (isWide) {
                layer.classList.add('project-layer--wide');
            }

            const imageRadius = getComputedStyle(container).borderRadius;
            layer.style.borderRadius = imageRadius;
            const zIndexVal = 1 - (i - 1);
            layer.style.zIndex = zIndexVal;

            layer.style.height = '100%';
            layer.style.background = 'var(--bg-page)';
            layer.style.overflow = 'hidden';

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

            container.appendChild(layer);
        }

        // Initial height sync
        const layers = card.querySelectorAll('.project-layer');
        layers.forEach(l => {
            if (window.innerWidth > 768) {
                l.style.height = `${container.offsetHeight}px`;
            } else {
                l.style.height = '';
            }
        });
    }

    activateCardInteraction(card, imageContainer, closeButton) {
        const self = this;

        card.addEventListener('click', (e) => {
            // Disable expansion on mobile for projects with layers
            if (window.innerWidth <= 768 && card.querySelectorAll('.project-layer').length > 0) {
                return;
            }

            e.stopPropagation();

            if (!document.body.classList.contains('is-project-expanded')) {
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

                card.offsetHeight; // Force reflow

                document.body.classList.add('is-project-expanded');
                card.classList.add('is-active');

                self.activeExpandedCard = card;
                self.activeCloseFunction = () => self.closeExpanded(card);
                self.currentScrollX = 0;

                imageContainer.style.flexShrink = '0';

                let targetHeight, targetWidth, targetLeft;

                const cardStyle = getComputedStyle(card);
                const pt = parseFloat(cardStyle.paddingTop);
                const pb = parseFloat(cardStyle.paddingBottom);
                const pl = parseFloat(cardStyle.paddingLeft);
                const pr = parseFloat(cardStyle.paddingRight);

                if (window.innerWidth <= 768) {
                    targetHeight = imageContainer.offsetHeight + pt + pb;
                    targetLeft = 20;
                    targetWidth = window.innerWidth - 40;
                } else {
                    const imgRect = imageContainer.getBoundingClientRect();
                    const imageRatio = imgRect.width / imgRect.height;

                    const targetImageHeight = window.innerHeight - 120;
                    const targetImageWidth = targetImageHeight * imageRatio;

                    targetHeight = targetImageHeight + pt + pb;
                    targetWidth = targetImageWidth + pl + pr;
                    targetLeft = 40;
                }

                requestAnimationFrame(() => {
                    card.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    card.style.top = '50%';
                    card.style.left = targetLeft + 'px';
                    card.style.transform = 'translateY(-50%)';
                    card.style.height = targetHeight + 'px';
                    card.style.width = targetWidth + 'px';

                    setTimeout(() => {
                        if (self.activeExpandedCard === card) {
                            card.style.transition = 'none';
                        }
                    }, 800);
                });
            }
        });

        // Close button
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                self.closeExpanded(card);
            });
        }

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (document.body.classList.contains('is-project-expanded')) {
                if (!card.contains(e.target)) {
                    self.closeExpanded(card);
                }
            }
        });
    }

    closeExpanded(card) {
        if (!card.classList.contains('is-active')) return;

        card.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';

        const placeholder = document.querySelector('.card--placeholder');
        if (placeholder) {
            const rect = placeholder.getBoundingClientRect();

            card.style.top = rect.top + 'px';
            card.style.left = rect.left + 'px';
            card.style.width = rect.width + 'px';
            card.style.height = rect.height + 'px';
            card.style.transform = 'translate(0, 0)';

            document.body.classList.remove('is-project-expanded');
            card.classList.add('is-closing');
            card.classList.remove('is-active');

            this.activeExpandedCard = null;
            this.activeCloseFunction = null;

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

                const imgContainer = card.querySelector('.card__image');
                if (imgContainer) imgContainer.style.flexShrink = '';

                placeholder.remove();
                card.removeEventListener('transitionend', cleanup);
                card.classList.remove('is-closing');
            }, { once: true });
        } else {
            document.body.classList.remove('is-project-expanded');
            card.classList.remove('is-active');
            this.activeExpandedCard = null;
        }
    }

    // =================================================================
    // GLOBAL SCROLL HANDLERS
    // =================================================================

    bindGlobalEvents() {
        window.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        window.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    handleWheel(e) {
        if (!this.activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;

        e.preventDefault();

        if (!this.wheelTimeout) {
            this.isScrollGestureStartedAtZero = (this.currentScrollX === 0);
        }

        if (this.wheelTimeout) clearTimeout(this.wheelTimeout);

        this.activeExpandedCard.style.transition = 'none';

        const speed = 1.5;
        this.updateScroll(e.deltaY * speed);

        this.wheelTimeout = setTimeout(() => {
            this.checkSnapback();
            this.wheelTimeout = null;
        }, 50);
    }

    handleTouchStart(e) {
        if (!this.activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;

        this.isTouchActive = true;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.initialScrollX = this.currentScrollX;
        this.isScrollGestureStartedAtZero = (this.currentScrollX === 0);

        this.lastTouchX = this.touchStartX;
        this.lastTouchTime = Date.now();
        this.velocity = 0;
        this.cancelMomentum();

        this.activeExpandedCard.style.transition = 'none';
    }

    handleTouchMove(e) {
        if (!this.activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const deltaX = this.touchStartX - touchX;
        const deltaY = this.touchStartY - touchY;

        const currentTime = Date.now();
        const timeDelta = currentTime - this.lastTouchTime;
        if (timeDelta > 0) {
            this.velocity = (touchX - this.lastTouchX) / timeDelta;
        }
        this.lastTouchX = touchX;
        this.lastTouchTime = currentTime;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            e.preventDefault();

            const touchSpeed = 1.2;
            let targetScrollX = this.initialScrollX - (deltaX * touchSpeed);

            if (this.initialScrollX < 0 && targetScrollX > 0) {
                targetScrollX = 0;
            }

            if (targetScrollX > 0) {
                if (this.isScrollGestureStartedAtZero) {
                    const overscrollDelta = targetScrollX - Math.max(0, this.initialScrollX);
                    targetScrollX = Math.max(0, this.initialScrollX) + (overscrollDelta * 0.15);

                    if (targetScrollX > 100) {
                        if (this.activeCloseFunction) {
                            this.activeCloseFunction();
                            return;
                        }
                    }
                } else {
                    targetScrollX = 0;
                }
            }

            this.currentScrollX = targetScrollX;
            this.applyScrollClamp();
        }
    }

    handleTouchEnd(e) {
        if (!this.activeExpandedCard || !document.body.classList.contains('is-project-expanded')) return;

        this.isTouchActive = false;

        if (Math.abs(this.velocity) > 0.5) {
            this.startMomentum();
        } else {
            this.checkSnapback();
        }
    }

    cancelMomentum() {
        if (this.momentumId) {
            cancelAnimationFrame(this.momentumId);
            this.momentumId = null;
        }
    }

    startMomentum() {
        this.cancelMomentum();

        const friction = 0.95;
        const self = this;

        function animate() {
            if (Math.abs(self.velocity) < 0.1) return;

            self.velocity *= friction;
            self.currentScrollX += (self.velocity * 16);

            const limits = self.getScrollLimits();
            if (self.currentScrollX > 0) {
                self.currentScrollX = 0;
                self.velocity = 0;
            } else if (self.currentScrollX < limits.min) {
                self.currentScrollX = limits.min;
                self.velocity = 0;
            }

            self.activeExpandedCard.style.transform = `translateY(-50%) translateX(${self.currentScrollX}px)`;

            if (Math.abs(self.velocity) >= 0.1) {
                self.momentumId = requestAnimationFrame(animate);
            }
        }

        this.momentumId = requestAnimationFrame(animate);
    }

    getScrollLimits() {
        const style = getComputedStyle(this.activeExpandedCard);
        const startLeft = parseFloat(this.activeExpandedCard.style.left) || 0;
        const cardWidth = this.activeExpandedCard.offsetWidth;
        const padding = parseFloat(style.paddingTop) || 20;
        const layers = this.activeExpandedCard.querySelectorAll('.project-layer');

        let totalContentWidth = 0;
        if (layers.length > 0) {
            const lastLayer = layers[layers.length - 1];
            const layerIndex = parseFloat(lastLayer.style.getPropertyValue('--layer-offset-index')) || layers.length;
            const widthMult = parseFloat(lastLayer.style.getPropertyValue('--layer-width-mult')) || 1;

            const layerGap = 4;
            const unitSize = cardWidth + layerGap;

            const lastLayerEnd = (layerIndex * unitSize) + (widthMult * cardWidth + (widthMult - 1) * layerGap);
            totalContentWidth = lastLayerEnd - padding;
        } else {
            totalContentWidth = cardWidth - padding;
        }

        const viewportWidth = window.innerWidth;
        const targetRightMargin = 40;
        let minScrollX = viewportWidth - targetRightMargin - startLeft - totalContentWidth;
        if (minScrollX > 0) minScrollX = 0;

        return { min: minScrollX, max: 0 };
    }

    checkSnapback() {
        if (!this.activeExpandedCard) return;

        if (this.currentScrollX > 0) {
            this.activeExpandedCard.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
            this.currentScrollX = 0;
            this.activeExpandedCard.style.transform = `translateY(-50%) translateX(0px)`;

            setTimeout(() => {
                if (this.activeExpandedCard && this.currentScrollX === 0) {
                    this.activeExpandedCard.style.transition = 'none';
                }
            }, 500);
        }
    }

    updateScroll(delta) {
        const prevScrollX = this.currentScrollX;

        this.currentScrollX -= delta;

        if (prevScrollX < 0 && this.currentScrollX > 0) {
            this.currentScrollX = 0;
        }

        if (this.currentScrollX > 0) this.currentScrollX = 0;

        this.applyScrollClamp();
    }

    applyScrollClamp() {
        const style = getComputedStyle(this.activeExpandedCard);
        const startLeft = parseFloat(this.activeExpandedCard.style.left) || 0;
        const cardWidth = this.activeExpandedCard.offsetWidth;
        const padding = parseFloat(style.paddingTop) || 20;

        const layers = this.activeExpandedCard.querySelectorAll('.project-layer');

        const layerGap = 4;
        let totalContentWidth = 0;

        if (layers.length > 0) {
            const lastLayer = layers[layers.length - 1];
            const layerIndex = parseFloat(lastLayer.style.getPropertyValue('--layer-offset-index')) || layers.length;
            const widthMult = parseFloat(lastLayer.style.getPropertyValue('--layer-width-mult')) || 1;

            const unitSize = cardWidth + layerGap;
            const endPos = (layerIndex * unitSize) + (widthMult * cardWidth + (widthMult - 1) * layerGap);
            totalContentWidth = endPos - padding;
        } else {
            totalContentWidth = cardWidth - padding;
        }

        const viewportWidth = window.innerWidth;
        const targetRightMargin = 40;

        let minScrollX = viewportWidth - targetRightMargin - startLeft - totalContentWidth;

        if (minScrollX > 0) minScrollX = 0;

        if (this.currentScrollX < minScrollX) this.currentScrollX = minScrollX;
        if (this.currentScrollX > 0) this.currentScrollX = 0;

        this.activeExpandedCard.style.transform = `translateY(-50%) translateX(${this.currentScrollX}px)`;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.cardViewer = new CardViewer();
});
