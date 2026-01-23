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

    // Also animate sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        gsap.from(sidebar, {
            opacity: 0,
            x: -20,
            duration: 0.6,
            ease: 'power2.out'
        });
    }
}
