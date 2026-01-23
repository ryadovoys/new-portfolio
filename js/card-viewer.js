/* =================================================================
   CARD VIEWER
   Production-only interactions (Carousel, etc.)
   ================================================================= */

class CardViewer {
    constructor() {
        this.init();
    }

    init() {
        this.setupCarousels();
    }

    setupCarousels() {
        const carousels = document.querySelectorAll('.card__image--carousel');
        
        carousels.forEach(zone => {
            const track = zone.querySelector('.carousel__track');
            if (!track) return;
            
            // Initialize drag/swipe functionality
            this.initCarouselDrag(zone, track);
            
            // Re-bind window resize listener for this carousel
            // (Note: In a bigger app, we might want a single debounce resize listener)
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
            // If it's a click on a button (like delete in editor, though this script is for prod), ignore
            if (e.target.closest('button')) return;

            isDragging = true;
            startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            startTranslate = getTranslateX();
            track.style.transition = 'none';
            zone.classList.add('carousel--dragging');
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            // e.preventDefault(); // removed to allow vertical scroll on mobile if moving vertically
            
            currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const diff = currentX - startX;
            setTranslateX(startTranslate + diff);
        };

        const handleEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            zone.classList.remove('carousel--dragging');

            const diff = currentX - startX;
            const threshold = zone.offsetWidth * 0.2; // 20% threshold
            const currentSlide = parseInt(zone.dataset.currentSlide) || 0;
            const totalSlides = parseInt(zone.dataset.totalSlides) || 0;

            let newSlide = currentSlide;

            if (diff < -threshold && currentSlide < totalSlides - 1) {
                newSlide = currentSlide + 1;
            } else if (diff > threshold && currentSlide > 0) {
                newSlide = currentSlide - 1;
            }
            
            // Snap to slide
            this.goToSlide(zone, track, newSlide);

            // Accessing clean up here is tricky without component scope, 
            // but we attached these to window, so we should clean them up if we were destroying components.
            // For a static landing page, it's fine to leave them until unload.
        };

        // Mouse events
        track.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        // Touch events
        track.addEventListener('touchstart', handleStart, { passive: true });
        track.addEventListener('touchmove', handleMove, { passive: false });
        track.addEventListener('touchend', handleEnd);

        // Hover scrub navigation (Desktop only)
        this.initHoverScrub(zone, track);
    }

    initHoverScrub(zone, track) {
        let isHovering = false;

        zone.addEventListener('mouseenter', () => {
            isHovering = true;
        });

        zone.addEventListener('mouseleave', () => {
            isHovering = false;
        });

        zone.addEventListener('mousemove', (e) => {
            // Don't scrub while dragging or if touch
            if (window.matchMedia('(pointer: coarse)').matches) return;
            if (zone.classList.contains('carousel--dragging') || !isHovering) return;

            const totalSlides = parseInt(zone.dataset.totalSlides);
            if (!totalSlides || totalSlides <= 1) return;

            const rect = zone.getBoundingClientRect();
            // const mouseX = e.clientX - rect.left; // relative X
            // const containerWidth = rect.width;

            // Simple scrub logic: divide width by slides
            // const zoneWidth = containerWidth / totalSlides;
            // const slideIndex = Math.floor(mouseX / zoneWidth);
            
            // Actually, let's stick to the click/drag for now to consistent with editor
            // or re-implement the exact logic found in editor if scrub was enabled there.
            // Checking card-editor.js, it references initCarouselDrag but then handleMove seems to be the main thing.
            // Wait, card-editor.js lines 777+ has Hover Scrub logic. Let's port that.
             
            const mouseX = e.clientX - rect.left;
            const containerWidth = rect.width;
            
            const zoneSection = containerWidth / totalSlides;
            let slideIndex = Math.floor(mouseX / zoneSection);
            
            // Clamp
            slideIndex = Math.max(0, Math.min(slideIndex, totalSlides - 1));
            
            this.goToSlide(zone, track, slideIndex);
        });
    }

    goToSlide(zone, track, index) {
        const slideWidth = zone.offsetWidth;
        track.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        track.style.transform = `translateX(-${index * slideWidth}px)`;
        zone.dataset.currentSlide = index;
        
        // Pause all videos
        track.querySelectorAll('video').forEach(v => v.pause());
        
        // Play video in active slide
        const activeSlide = track.children[index];
        if (activeSlide) {
            const video = activeSlide.querySelector('video');
            if (video) {
                // video.currentTime = 0; // Optional: restart
                video.play().catch(() => {}); // catch promise error if interaction needed
            }
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new CardViewer();
});
