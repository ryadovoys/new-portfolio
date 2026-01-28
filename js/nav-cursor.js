/**
 * NavCursor
 * Handles the "moving dot" hover effect for the sidebar navigation.
 */
class NavCursor {
    constructor() {
        this.nav = document.querySelector('.sidebar__nav');
        this.cursor = document.querySelector('.nav-cursor');
        this.links = document.querySelectorAll('.sidebar__nav-link');

        if (!this.nav || !this.cursor || this.links.length === 0) return;

        this.init();
    }

    init() {
        this.links.forEach(link => {
            link.addEventListener('mouseenter', (e) => this.handleLinkEnter(e));
        });

        this.nav.addEventListener('mouseleave', () => this.handleNavLeave());
    }

    handleLinkEnter(e) {
        const link = e.currentTarget;

        // Position calculations
        // We want the dot to be centered vertically relative to the link
        // And positioned at the left
        // The dot is absolutely positioned within .sidebar__nav (relative)

        const navRect = this.nav.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();

        // Calculate top position relative to nav
        // link.offsetTop might differ if there are margins/padding, so using rects is safer
        const relativeTop = linkRect.top - navRect.top;
        const centerTop = relativeTop + (linkRect.height / 2);

        // Update cursor position
        this.cursor.style.top = `${centerTop}px`;
        this.cursor.style.opacity = '1';

        // Update active state for text push
        this.links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }

    handleNavLeave() {
        this.cursor.style.opacity = '0';
        this.links.forEach(l => l.classList.remove('active'));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NavCursor();
});
