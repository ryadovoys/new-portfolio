/* =================================================================
   ANIMATIONS
   GSAP scroll reveal and motion effects
   ================================================================= */

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initCardParallax();
});

function initScrollReveal() {
    const cards = document.querySelectorAll('.card');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        gsap.set(cards, { opacity: 1, clearProps: 'transform' });
        const sidebarStatic = document.querySelector('.sidebar');
        if (sidebarStatic) {
            gsap.set(sidebarStatic, { opacity: 1, x: 0, clearProps: 'transform' });
        }
        return;
    }

    // Set initial state
    gsap.set(cards, {
        opacity: 0
    });

    // Animate each card when it enters viewport
    cards.forEach((card, index) => {
        gsap.to(card, {
            opacity: 1,
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

function initCardParallax() {
    const prefersReducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktopMQ = window.matchMedia('(min-width: 769px)');
    const parallaxTriggers = new WeakMap();
    let rafScheduled = false;

    const isParallaxEnabled = () => {
        return desktopMQ.matches && !prefersReducedMotionMQ.matches;
    };

    const isEligibleCard = (card) => {
        if (!card) return false;
        if (!card.classList.contains('card')) return false;
        if (card.classList.contains('card--add')) return false;
        if (card.classList.contains('card--project')) return false; // Keep project interactions intact.
        if (card.classList.contains('card--invisible')) return false;
        return true;
    };

    const clearCardParallax = (card) => {
        const trigger = parallaxTriggers.get(card);
        if (trigger) {
            trigger.kill();
            parallaxTriggers.delete(card);
        }
        card.dataset.parallaxApplied = '0';
        gsap.set(card, { clearProps: 'y,willChange' });
    };

    const applyCardParallax = (card, index) => {
        if (!isEligibleCard(card)) return false;
        if (card.dataset.parallaxApplied === '1') return false;
        if (!isParallaxEnabled()) return false;

        const distance = 24 + ((index % 4) * 8); // Stronger depth: 24-48px

        gsap.set(card, { willChange: 'transform' });
        const tween = gsap.fromTo(card, {
            y: -distance
        }, {
            y: distance,
            ease: 'none',
            scrollTrigger: {
                trigger: card,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.3
            }
        });

        card.dataset.parallaxApplied = '1';
        parallaxTriggers.set(card, tween.scrollTrigger);
        return true;
    };

    const applyParallax = () => {
        const cards = document.querySelectorAll('.card');
        let appliedAny = false;

        cards.forEach((card, index) => {
            if (!isParallaxEnabled()) {
                if (card.dataset.parallaxApplied === '1') clearCardParallax(card);
                return;
            }
            if (applyCardParallax(card, index)) appliedAny = true;
        });

        if (appliedAny) ScrollTrigger.refresh();
    };

    const scheduleApply = () => {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => {
            rafScheduled = false;
            applyParallax();
        });
    };

    applyParallax();
    window.addEventListener('load', scheduleApply, { passive: true });
    window.addEventListener('resize', scheduleApply, { passive: true });

    const grid = document.querySelector('.card-grid');
    if (!grid) return;

    const observer = new MutationObserver(() => {
        scheduleApply();
    });

    observer.observe(grid, {
        childList: true,
        subtree: true
    });
}
