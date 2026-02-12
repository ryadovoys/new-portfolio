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
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.cardsInViewport = new Set();
        this.cardVisibilityObserver = null;
        this.projectHoverStates = new WeakMap();

        this.init();
    }

    init() {
        this.setupCarousels();
        this.setupProjectCards();
        this.bindGlobalEvents();
        this.forceMuteAll();
        this.setupVideoVisibilityObserver();
        this.scheduleInitialPlaybackChecks();
    }

    scheduleInitialPlaybackChecks() {
        // Handle async media/card insertion races during initial load.
        [0, 150, 400, 900].forEach((delay) => {
            window.setTimeout(() => this.updateAllCardVideoPlayback(), delay);
        });
    }

    forceMuteAll() {
        const handleVideo = (v) => {
            v.preload = 'auto';
            v.muted = true;
            v.defaultMuted = true;
            v.setAttribute('muted', '');
            v.pause();

            const card = v.closest('.card');
            if (card && this.cardVisibilityObserver) {
                this.cardVisibilityObserver.observe(card);
            }

            if (card) {
                requestAnimationFrame(() => this.updateCardVideoPlayback(card));
                window.setTimeout(() => this.updateCardVideoPlayback(card), 120);
            }
        };

        // Mute existing
        document.querySelectorAll('video').forEach(handleVideo);

        // Watch for new
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'VIDEO') {
                        handleVideo(node);
                    } else if (node.querySelectorAll) {
                        if (node.classList && node.classList.contains('card') && this.cardVisibilityObserver) {
                            this.cardVisibilityObserver.observe(node);
                        }
                        node.querySelectorAll('video').forEach(handleVideo);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    hasFilenameToken(filename, token) {
        const base = String(filename || '').replace(/\.[^.]+$/, '').toLowerCase();
        if (!base) return false;

        const segments = base.split(/[-_]+/).filter(Boolean);
        return segments.includes(String(token || '').toLowerCase());
    }

    getMediaAspectRatio(media) {
        if (!media) return 1;

        if (media.tagName === 'VIDEO') {
            const vw = media.videoWidth;
            const vh = media.videoHeight;
            if (vw > 0 && vh > 0) return vw / vh;
        } else if (media.tagName === 'IMG') {
            const nw = media.naturalWidth;
            const nh = media.naturalHeight;
            if (nw > 0 && nh > 0) return nw / nh;
        }

        const rect = media.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            return rect.width / rect.height;
        }

        return 1;
    }

    recalculateLayerGeometry(card, container) {
        const layers = Array.from(card.querySelectorAll('.project-layer'));
        if (layers.length === 0) return;

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width || container.offsetWidth || 0;
        const containerHeight = containerRect.height || container.offsetHeight || 0;
        if (containerWidth <= 0 || containerHeight <= 0) return;

        let currentOffsetIndex = 1;

        layers.forEach((layer) => {
            const fallbackWidthMult = parseFloat(layer.dataset.baseWidthMult || '1') || 1;
            let widthMult = fallbackWidthMult;

            if (layer.dataset.heightDriven === 'true') {
                const media = layer.querySelector('img, video');
                const ratio = this.getMediaAspectRatio(media);
                if (ratio > 0) {
                    widthMult = (containerHeight * ratio) / containerWidth;
                }
            }

            layer.style.setProperty('--layer-offset-index', currentOffsetIndex);
            layer.style.setProperty('--layer-width-mult', widthMult);
            currentOffsetIndex += widthMult;
        });
    }

    getProjectLayerGap(card) {
        if (!card) return 40;
        const raw = getComputedStyle(card).getPropertyValue('--project-layer-gap');
        const parsed = parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : 40;
    }

    // =================================================================
    // VIDEO PLAYBACK (VISIBLE AREA ONLY)
    // =================================================================

    setupVideoVisibilityObserver() {
        if (this.cardVisibilityObserver) {
            this.cardVisibilityObserver.disconnect();
        }

        this.cardsInViewport.clear();

        this.cardVisibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const card = entry.target;
                const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.2;

                if (isVisible) {
                    this.cardsInViewport.add(card);
                } else {
                    this.cardsInViewport.delete(card);
                }

                this.updateCardVideoPlayback(card);
            });
        }, {
            threshold: [0, 0.2, 0.6]
        });

        document.querySelectorAll('.card').forEach((card) => {
            this.cardVisibilityObserver.observe(card);
        });

        this.updateAllCardVideoPlayback();
    }

    isCardPlaybackVisible(card) {
        if (!card) return false;
        if (card.classList.contains('is-active') || this.cardsInViewport.has(card)) return true;

        const rect = card.getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

        if (viewportWidth <= 0 || viewportHeight <= 0) return false;

        const viewportRect = {
            left: 0,
            top: 0,
            right: viewportWidth,
            bottom: viewportHeight
        };

        return this.getRectIntersectionRatio(rect, viewportRect) >= 0.2;
    }

    getRectIntersectionRatio(rect, boundsRect) {
        if (!rect || !boundsRect || rect.width <= 0 || rect.height <= 0) return 0;

        const overlapWidth = Math.max(0, Math.min(rect.right, boundsRect.right) - Math.max(rect.left, boundsRect.left));
        const overlapHeight = Math.max(0, Math.min(rect.bottom, boundsRect.bottom) - Math.max(rect.top, boundsRect.top));
        const overlapArea = overlapWidth * overlapHeight;
        const rectArea = rect.width * rect.height;

        if (rectArea <= 0) return 0;
        return overlapArea / rectArea;
    }

    isElementInCenterPlaybackZone(el, zoneCoverage = 0.8, minViewportVisibility = 0.2) {
        if (!el) return false;

        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        if (viewportWidth <= 0 || viewportHeight <= 0) return false;

        const rect = el.getBoundingClientRect();
        const zoneWidth = viewportWidth * zoneCoverage;
        const zoneHeight = viewportHeight * zoneCoverage;
        const zoneRect = {
            left: (viewportWidth - zoneWidth) / 2,
            top: (viewportHeight - zoneHeight) / 2,
            right: (viewportWidth + zoneWidth) / 2,
            bottom: (viewportHeight + zoneHeight) / 2
        };

        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);
        const isCenterInsideZone = centerX >= zoneRect.left
            && centerX <= zoneRect.right
            && centerY >= zoneRect.top
            && centerY <= zoneRect.bottom;
        if (!isCenterInsideZone) return false;

        const viewportRect = {
            left: 0,
            top: 0,
            right: viewportWidth,
            bottom: viewportHeight
        };

        return this.getRectIntersectionRatio(rect, viewportRect) >= minViewportVisibility;
    }

    isVideoEligibleForPlayback(videoEl, card, isProjectExpanded) {
        if (!videoEl || !card) return false;

        const isProjectVideo = Boolean(videoEl.closest('.project-media-track'));
        if (!isProjectVideo) return true;

        const isProjectLayerVideo = Boolean(videoEl.closest('.project-layer'));
        if (!isProjectExpanded) {
            // While collapsed, keep only the primary project preview video running.
            return !isProjectLayerVideo;
        }

        // While expanded, only play videos that are in the center 80% viewport zone.
        return this.isElementInCenterPlaybackZone(videoEl, 0.8, 0.2);
    }

    playVideo(videoEl) {
        videoEl.muted = true;
        videoEl.defaultMuted = true;
        videoEl.setAttribute('muted', '');
        videoEl.playsInline = true;
        videoEl.setAttribute('playsinline', '');
        videoEl.preload = 'auto';

        const tryPlay = () => {
            const playPromise = videoEl.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => { });
            }
        };

        if (videoEl.readyState >= 2) {
            tryPlay();
            return;
        }

        const retryOnReady = () => {
            if (videoEl.isConnected) {
                tryPlay();
            }
        };

        videoEl.addEventListener('loadeddata', retryOnReady, { once: true });
        videoEl.addEventListener('canplay', retryOnReady, { once: true });
        tryPlay();
    }

    updateAllCardVideoPlayback() {
        document.querySelectorAll('.card').forEach((card) => {
            this.updateCardVideoPlayback(card);
        });
    }

    updateCardVideoPlayback(card) {
        if (!card) return;
        const videos = Array.from(card.querySelectorAll('video'));
        if (videos.length === 0) return;

        const shouldPlay = this.isCardPlaybackVisible(card);
        const isProjectExpanded = card.classList.contains('card--project')
            && card.classList.contains('is-active')
            && document.body.classList.contains('is-project-expanded');

        videos.forEach((videoEl) => {
            videoEl.muted = true;
            videoEl.setAttribute('muted', '');
        });

        const playableVideos = new Set();
        const carouselVideos = new Set();
        if (shouldPlay) {
            card.querySelectorAll('.card__image--carousel').forEach((zone) => {
                const track = zone.querySelector('.carousel__track');
                if (!track) return;

                track.querySelectorAll('video').forEach((videoEl) => carouselVideos.add(videoEl));
                const currentIndex = parseInt(zone.dataset.currentSlide, 10) || 0;
                const activeSlide = track.children[currentIndex];
                const activeVideo = activeSlide ? activeSlide.querySelector('video') : null;

                if (activeVideo && this.isVideoEligibleForPlayback(activeVideo, card, isProjectExpanded)) {
                    playableVideos.add(activeVideo);
                }
            });

            videos.forEach((videoEl) => {
                if (carouselVideos.has(videoEl)) return;
                if (this.isVideoEligibleForPlayback(videoEl, card, isProjectExpanded)) {
                    playableVideos.add(videoEl);
                }
            });
        }

        videos.forEach((videoEl) => {
            if (playableVideos.has(videoEl)) {
                if (videoEl.paused) {
                    this.playVideo(videoEl);
                }
            } else if (!videoEl.paused) {
                videoEl.pause();
            }
        });
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
                track.style.transition = 'none';
                track.style.transform = this.getCarouselTransform(currentSlide);
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
            currentX = startX;
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
        track.addEventListener('touchcancel', handleEnd);

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
        track.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        track.style.transform = this.getCarouselTransform(index);
        zone.dataset.currentSlide = index;

        const card = zone.closest('.card');
        if (card) {
            this.updateCardVideoPlayback(card);
        }
    }

    getCarouselTransform(index) {
        return `translateX(calc(-${index} * (100% + var(--carousel-gap, 40px))))`;
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
            const isWide = this.hasFilenameToken(mainAsset.filename, 'w');

            // Allow card to stay wide if it was manually added as wide, OR if the first image dictates it
            const shouldBeWide = card.classList.contains('card--wide') || isWide;

            if (shouldBeWide) {
                card.classList.add('card--wide');
            } else {
                card.classList.remove('card--wide');
            }

            // Preserve controls for editor
            const existingControls = imageContainer.querySelector('.card__controls');

            card.classList.add('card--project');
            imageContainer.innerHTML = '';
            imageContainer.classList.remove('card__image--dropzone');

            let mainMediaEl;
            const cardTitle = card.querySelector('.card__title')?.textContent?.trim() || 'Project';
            if (mainAsset.isVideo) {
                mainMediaEl = document.createElement('video');
                mainMediaEl.src = mainAsset.path;
                mainMediaEl.autoplay = true;
                mainMediaEl.loop = true;
                mainMediaEl.muted = true;
                mainMediaEl.setAttribute('muted', '');
                mainMediaEl.playsInline = true;
            } else {
                mainMediaEl = document.createElement('img');
                mainMediaEl.src = mainAsset.path;
                mainMediaEl.alt = `${cardTitle} preview`;
            }
            mainMediaEl.classList.add('project-main-media');
            imageContainer.appendChild(mainMediaEl);

            // Create Layers
            const layerAssets = assets.slice(1);
            this.createLayers(card, imageContainer, layerAssets);

            // Re-append controls if preserved
            if (existingControls) {
                imageContainer.appendChild(existingControls);
            }

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
                this.recalculateLayerGeometry(card, imageContainer);
            });
            observer.observe(imageContainer);

            // Activate Click to Expand
            this.makeCardKeyboardAccessible(card);
            this.activateCardInteraction(card, imageContainer, closeButton);

            // Initial Randomization
            this.randomizeLayerInitialState(card);
            this.setupProjectHoverPhysics(card, imageContainer);

            this.updateCardVideoPlayback(card);

        } catch (e) {
            console.error('Error setting up project card:', e);
        }
    }

    createLayers(card, container, assets) {
        if (assets.length === 0) return;

        container.classList.add('project-media-track');
        const cardTitle = card.querySelector('.card__title')?.textContent?.trim() || 'Project';

        let currentOffsetIndex = 1;

        for (let i = 1; i <= assets.length; i++) {
            const layer = document.createElement('div');
            layer.className = `project-layer project-layer--${i}`;

            const asset = assets[i - 1];
            const isWide = this.hasFilenameToken(asset.filename, 'w');
            const isHeightDriven = this.hasFilenameToken(asset.filename, 'h');
            const widthMult = isHeightDriven ? 1 : (isWide ? 2 : 1);

            layer.style.setProperty('--layer-offset-index', currentOffsetIndex);
            layer.style.setProperty('--layer-width-mult', widthMult);
            layer.dataset.baseWidthMult = String(widthMult);
            layer.dataset.heightDriven = isHeightDriven ? 'true' : 'false';

            currentOffsetIndex += widthMult;

            if (isWide && !isHeightDriven) {
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
                vid.setAttribute('muted', '');
                vid.playsInline = true;
                vid.style.width = '100%';
                vid.style.height = '100%';
                vid.style.objectFit = 'cover';
                layer.appendChild(vid);

                if (isHeightDriven) {
                    vid.addEventListener('loadedmetadata', () => {
                        this.recalculateLayerGeometry(card, container);
                    }, { once: true });
                }
            } else {
                const img = document.createElement('img');
                img.src = asset.path;
                img.alt = `${cardTitle} detail ${i}`;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                layer.appendChild(img);

                if (isHeightDriven) {
                    if (img.complete && img.naturalWidth > 0) {
                        this.recalculateLayerGeometry(card, container);
                    } else {
                        img.addEventListener('load', () => {
                            this.recalculateLayerGeometry(card, container);
                        }, { once: true });
                    }
                }
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

        this.recalculateLayerGeometry(card, container);
    }

    randomizeLayerInitialState(card) {
        const layers = card.querySelectorAll('.project-layer');
        layers.forEach(layer => {
            const initialRotation = (Math.random() * 4) - 2; // -2 to +2
            layer.style.setProperty('--initial-rotation', `${initialRotation}deg`);
        });
    }

    randomizeLayerHover(card) {
        const layers = Array.from(card.querySelectorAll('.project-layer'));
        if (layers.length === 0) return;

        const mainMedia = card.querySelector('.project-main-media');
        const hoverTargets = mainMedia ? [mainMedia, ...layers] : layers;

        // Randomly pick starting side for the first layer: 0 for leftish, 1 for rightish
        let side = Math.random() < 0.5 ? 0 : 1;

        hoverTargets.forEach((target) => {
            // angle ranges (in radians):
            // Leftish-up: ~100 to 160 degrees (1.7 to 2.8 rad)
            // Rightish-up: ~20 to 80 degrees (0.35 to 1.4 rad)
            let angle;
            if (side === 0) {
                angle = 1.7 + (Math.random() * 1.1);
            } else {
                angle = 0.35 + (Math.random() * 1.05);
            }

            const distance = (28 + Math.random() * 11) * 0.68; // softer initial spread

            const x = Math.cos(angle) * distance;
            const y = -Math.sin(angle) * distance; // Negative Y is UP

            const rotation = (Math.random() * 3.4) - 1.7; // -1.7 to +1.7

            target.style.setProperty('--hover-x', `${x}px`);
            target.style.setProperty('--hover-y', `${y}px`);
            target.style.setProperty('--hover-rotation', `${rotation}deg`);

            // Flip side for the next layer
            side = 1 - side;
        });
    }

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    getProjectHoverTargets(card) {
        const layers = Array.from(card.querySelectorAll('.project-layer'));
        if (layers.length === 0) return [];

        const mainMedia = card.querySelector('.project-main-media');
        return mainMedia ? [mainMedia, ...layers] : layers;
    }

    randomizeProjectPushProfile(card) {
        const targets = this.getProjectHoverTargets(card);
        targets.forEach((target, index) => {
            const depthTaper = 1 - (index * 0.08);
            const primary = (0.24 + Math.random() * 0.22) * Math.max(0.55, depthTaper);
            const cross = (Math.random() * 0.16) - 0.08;
            const rotate = 0.018 + Math.random() * 0.02;

            target.style.setProperty('--push-primary', `${primary}`);
            target.style.setProperty('--push-cross', `${cross}`);
            target.style.setProperty('--push-rotate', `${rotate}`);
        });
    }

    applyProjectHoverPush(card, velocityX, velocityY) {
        const targets = this.getProjectHoverTargets(card);
        targets.forEach((target, index) => {
            const primary = parseFloat(target.style.getPropertyValue('--push-primary')) || 0.6;
            const cross = parseFloat(target.style.getPropertyValue('--push-cross')) || 0;
            const rotate = parseFloat(target.style.getPropertyValue('--push-rotate')) || 0.1;
            const twistSign = index % 2 === 0 ? 1 : -1;

            const pushX = (velocityX * primary) + (velocityY * cross);
            const pushY = (velocityY * primary) - (velocityX * cross);
            const pushRotation = ((velocityX * rotate * twistSign) + (velocityY * rotate * 0.25));

            target.style.setProperty('--push-x', `${pushX.toFixed(2)}px`);
            target.style.setProperty('--push-y', `${pushY.toFixed(2)}px`);
            target.style.setProperty('--push-rotation', `${pushRotation.toFixed(2)}deg`);
        });
    }

    resetProjectHoverPush(card) {
        const targets = this.getProjectHoverTargets(card);
        targets.forEach((target) => {
            target.style.setProperty('--push-x', '0px');
            target.style.setProperty('--push-y', '0px');
            target.style.setProperty('--push-rotation', '0deg');
        });
    }

    setupProjectHoverPhysics(card, imageContainer) {
        if (card.dataset.hoverPhysicsBound === 'true') return;
        if (!imageContainer) return;

        const state = {
            lastX: 0,
            lastY: 0,
            pushX: 0,
            pushY: 0,
            isInside: false
        };

        imageContainer.addEventListener('mouseenter', (e) => {
            if (this.prefersReducedMotion) return;
            if (window.matchMedia('(pointer: coarse)').matches) return;
            if (card.classList.contains('is-active') || document.body.classList.contains('is-project-expanded')) return;

            this.randomizeLayerHover(card);
            this.randomizeProjectPushProfile(card);
            this.resetProjectHoverPush(card);

            state.isInside = true;
            state.lastX = e.clientX;
            state.lastY = e.clientY;
            state.pushX = 0;
            state.pushY = 0;

            card.classList.add('is-media-hovered');
            card.classList.remove('is-hover-tracking');
        });

        imageContainer.addEventListener('mousemove', (e) => {
            if (!state.isInside) return;
            if (this.prefersReducedMotion) return;
            if (window.matchMedia('(pointer: coarse)').matches) return;
            if (card.classList.contains('is-active') || document.body.classList.contains('is-project-expanded')) return;

            const deltaX = e.clientX - state.lastX;
            const deltaY = e.clientY - state.lastY;
            const movement = Math.abs(deltaX) + Math.abs(deltaY);

            state.lastX = e.clientX;
            state.lastY = e.clientY;

            if (movement < 0.5) return;
            if (!card.classList.contains('is-hover-tracking')) {
                card.classList.add('is-hover-tracking');
            }

            const resistanceX = 1 - Math.min(0.8, Math.abs(state.pushX) / 140);
            const resistanceY = 1 - Math.min(0.8, Math.abs(state.pushY) / 140);

            state.pushX = this.clamp(state.pushX + (deltaX * 0.22 * resistanceX), -140, 140);
            state.pushY = this.clamp(state.pushY + (deltaY * 0.22 * resistanceY), -140, 140);

            this.applyProjectHoverPush(card, state.pushX, state.pushY);
        });

        imageContainer.addEventListener('mouseleave', () => {
            state.isInside = false;
            card.classList.remove('is-media-hovered');
            card.classList.remove('is-hover-tracking');
        });

        this.projectHoverStates.set(card, state);
        card.dataset.hoverPhysicsBound = 'true';
    }

    makeCardKeyboardAccessible(card) {
        const title = card.querySelector('.card__title')?.textContent?.trim();
        const label = title ? `Open project details: ${title}` : 'Open project details';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', label);

        if (card.dataset.a11yBound === 'true') return;

        card.addEventListener('keydown', (e) => {
            // Only treat Enter/Space as activation when the card itself has focus.
            // This avoids hijacking typing in contenteditable fields when local editor is active.
            if (e.target !== card) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });

        card.dataset.a11yBound = 'true';
    }

    activateCardInteraction(card, imageContainer, closeButton) {
        const self = this;
        const expandDuration = this.prefersReducedMotion ? 0 : 800;

        card.addEventListener('click', (e) => {
            // Allow links to work normally
            if (e.target.closest('a')) return;

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
                this.updateCardVideoPlayback(card);

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
                    // Keep expanded sizing deterministic. Using measured box ratio here can be
                    // unstable when other scripts temporarily force inline heights during load.
                    const imageRatio = card.classList.contains('card--wide')
                        ? (16 / 9)
                        : (1 / 1.236);

                    const targetImageHeight = window.innerHeight - 120;
                    const targetImageWidth = targetImageHeight * imageRatio;

                    targetHeight = targetImageHeight + pt + pb;
                    targetWidth = targetImageWidth + pl + pr;
                    targetLeft = 40;
                }

                requestAnimationFrame(() => {
                    card.style.transition = this.prefersReducedMotion
                        ? 'none'
                        : 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    card.style.top = '50%';
                    card.style.left = targetLeft + 'px';
                    card.style.transform = 'translateY(-50%)';
                    card.style.height = targetHeight + 'px';
                    card.style.width = targetWidth + 'px';

                    if (expandDuration > 0) {
                        setTimeout(() => {
                            if (self.activeExpandedCard === card) {
                                card.style.transition = 'none';
                            }
                        }, expandDuration);
                    }
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

        card.style.transition = this.prefersReducedMotion
            ? 'none'
            : 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        const placeholder = document.querySelector('.card--placeholder');
        const cleanup = () => {
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

            if (placeholder && placeholder.isConnected) {
                placeholder.remove();
            }
            card.classList.remove('is-closing');
            this.updateCardVideoPlayback(card);
        };

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

            if (this.prefersReducedMotion) {
                cleanup();
            } else {
                card.addEventListener('transitionend', cleanup, { once: true });
            }
        } else {
            document.body.classList.remove('is-project-expanded');
            card.classList.remove('is-active');
            this.activeExpandedCard = null;
            this.activeCloseFunction = null;
            cleanup();
        }

        this.updateAllCardVideoPlayback();
    }

    // =================================================================
    // GLOBAL SCROLL HANDLERS
    // =================================================================

    bindGlobalEvents() {
        window.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        window.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        window.addEventListener('load', () => this.updateAllCardVideoPlayback());
        window.addEventListener('resize', () => this.updateAllCardVideoPlayback());
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeExpandedCard && document.body.classList.contains('is-project-expanded')) {
                e.preventDefault();
                this.closeExpanded(this.activeExpandedCard);
            }
        });
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
            self.updateCardVideoPlayback(self.activeExpandedCard);

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
        const layerGap = this.getProjectLayerGap(this.activeExpandedCard);

        let totalContentWidth = 0;
        if (layers.length > 0) {
            const lastLayer = layers[layers.length - 1];
            const layerIndex = parseFloat(lastLayer.style.getPropertyValue('--layer-offset-index')) || layers.length;
            const widthMult = parseFloat(lastLayer.style.getPropertyValue('--layer-width-mult')) || 1;

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
            this.activeExpandedCard.style.transition = this.prefersReducedMotion
                ? 'none'
                : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
            this.currentScrollX = 0;
            this.activeExpandedCard.style.transform = `translateY(-50%) translateX(0px)`;

            if (!this.prefersReducedMotion) {
                setTimeout(() => {
                    if (this.activeExpandedCard && this.currentScrollX === 0) {
                        this.activeExpandedCard.style.transition = 'none';
                    }
                }, 500);
            }
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

        const layerGap = this.getProjectLayerGap(this.activeExpandedCard);
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
        this.updateCardVideoPlayback(this.activeExpandedCard);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.cardViewer = new CardViewer();
});
