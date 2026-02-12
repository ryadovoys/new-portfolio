/* =================================================================
   ANIMATIONS
   GSAP scroll reveal and motion effects
   ================================================================= */

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
});

function initScrollReveal() {
    const cards = document.querySelectorAll('.card');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        gsap.set(cards, { opacity: 1, y: 0, clearProps: 'transform' });
        const sidebarStatic = document.querySelector('.sidebar');
        if (sidebarStatic) {
            gsap.set(sidebarStatic, { opacity: 1, x: 0, clearProps: 'transform' });
        }
        return;
    }

    // Set initial state
    gsap.set(cards, {
        opacity: 0,
        y: 40
    });

    // Animate each card when it enters viewport
    cards.forEach((card, index) => {
        gsap.to(card, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none none'
            },
            delay: (index % 3) * 0.1 // Stagger effect for cards in same row
        });
    });

    // Also animate sidebar (Desktop only)
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth > 768) {
        gsap.from(sidebar, {
            opacity: 0,
            x: -20,
            duration: 0.6,
            ease: 'power2.out',
            clearProps: 'transform' // Clear transform after animation to avoid stacking context issues
        });
    }
}
