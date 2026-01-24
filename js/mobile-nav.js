class MobileNav {
    constructor() {
        this.menuToggle = document.querySelector('.menu-toggle');
        this.sidebar = document.querySelector('.sidebar');
        this.backdrop = document.querySelector('.sidebar-backdrop');
        this.body = document.body;
        this.isOpen = false;

        if (this.menuToggle) {
            this.init();
        }
    }

    init() {
        // Toggle menu
        this.menuToggle.addEventListener('click', () => this.toggleMenu());

        // Close on backdrop click
        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => this.closeMenu());
        }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });

        // Close on window resize if moving to desktop
        let resizeTimer;
        window.addEventListener('resize', () => {
            document.body.classList.add('resize-animation-stopper');
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                document.body.classList.remove('resize-animation-stopper');
            }, 400);

            if (window.innerWidth > 768 && this.isOpen) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        this.isOpen = !this.isOpen;
        this.updateState();
    }

    closeMenu() {
        this.isOpen = false;
        this.updateState();
    }

    updateState() {
        if (this.isOpen) {
            this.sidebar.classList.add('sidebar--open');
            this.body.style.overflow = 'hidden'; // Prevent scrolling
        } else {
            this.sidebar.classList.remove('sidebar--open');
            this.body.style.overflow = '';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new MobileNav();
});
