/* =================================================================
   GALLERY MODE
   Handles "Show just images" toggle
   ================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('showJustImageBtn');
    const body = document.body;
    const scrollContainer = document.querySelector('.card-grid');

    if (!btn) return;

    btn.addEventListener('click', (e) => {
        e.preventDefault();

        // Toggle class
        const isActive = body.classList.toggle('mode-gallery');

        // Update button text? User didn't ask, but good UX. 
        // User text: "Show just images". Maybe toggle to "Show all content"?
        // btn.textContent = isActive ? 'Show all content' : 'Show just images';

        // Close sidebar on mobile if open
        const sidebar = document.querySelector('.sidebar');
        if (isActive && sidebar && sidebar.classList.contains('sidebar--open')) {
            // Use the toggle function if available or just remove class
            // Assuming mobile-nav.js uses sidebar--open class
            document.querySelector('.menu-toggle')?.click();
        }

        // Horizontal Scroll Logic (Desktop Wheel)
        if (isActive) {
            setupHorizontalScroll();
        } else {
            cleanupHorizontalScroll();
        }
    });

    // Horizontal Scroll Handler
    let wheelHandler;

    function setupHorizontalScroll() {
        // Prevent default vertical scroll and map to horizontal
        wheelHandler = (e) => {
            if (!body.classList.contains('mode-gallery')) return;

            // Only if we have overflow
            if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
                // If pure vertical scroll intent, map to horizontal
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    scrollContainer.scrollLeft += e.deltaY;
                }
            }
        };

        // Use standard wheel event
        // Note: 'wheel' event with passive: false to allow preventDefault
        window.addEventListener('wheel', wheelHandler, { passive: false });
    }

    function cleanupHorizontalScroll() {
        if (wheelHandler) {
            window.removeEventListener('wheel', wheelHandler);
        }
    }
});
