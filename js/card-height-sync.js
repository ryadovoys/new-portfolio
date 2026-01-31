/**
 * Card Height Synchronizer
 * Ensures that the image container of ".card--wide" matches the height of ".card" (standard)
 * regardless of the text content below. This strictly aligns the visual "content containers".
 */

function syncCardImageHeights() {
    // 1. Find a reference "Small Card"
    // We exclude wide, invisible, or adding cards
    const referenceCardMsg = document.querySelector('.card:not(.card--wide):not(.card--invisible):not(.card--add) .card__image');

    if (!referenceCardMsg) {
        // Fallback or unique layout (e.g. all wide), exit
        return;
    }

    // 2. Measure its exact pixel height (including border if any)
    // We need to use getBoundingClientRect for sub-pixel precision if needed, but offsetHeight is usually fine.
    // However, since we want to MATCH exactly, let's use the computed height.
    const rect = referenceCardMsg.getBoundingClientRect();
    const targetHeight = rect.height;

    // 3. Apply to all Wide Cards
    const wideImages = document.querySelectorAll('.card--wide .card__image');

    wideImages.forEach(img => {
        // Enforce the height
        img.style.height = `${targetHeight}px`;
        // Disable aspect-ratio if CSS interferes
        img.style.aspectRatio = 'auto';
        // Ensure flex doesn't mess it up
        img.style.flex = 'none';
    });
}

// Init
window.addEventListener('DOMContentLoaded', syncCardImageHeights);
window.addEventListener('load', syncCardImageHeights); // Backup getting exact layout
window.addEventListener('resize', () => {
    // Debounce slightly or just run (modern browsers are fast enough for simple DOM reads)
    // For smoothness, direct run is better unless massive grid.
    requestAnimationFrame(syncCardImageHeights);
});

// If using dynamic content (adding cards), we might need to expose this
window.syncCardImageHeights = syncCardImageHeights;
