/* =================================================================
   ANIMATIONS
   GSAP scroll reveal and motion effects
   ================================================================= */

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initLenisSmoothScroll();

    ensureAboutStatsSection();
    markLineRevealTargets();
    initScrollReveal();
    initLineReveal();
    initCountUpStats();

    const grid = document.querySelector('.card-grid');
    if (grid) {
        const observer = new MutationObserver(() => {
            ensureAboutStatsSection();
            markLineRevealTargets();
            initScrollReveal();
            initLineReveal();
            initCountUpStats();
            ScrollTrigger.refresh();
        });
        observer.observe(grid, {
            childList: true,
            subtree: true
        });
    }

    requestAnimationFrame(() => ScrollTrigger.refresh());
});

function markLineRevealTargets() {
    const selectors = [
        '.sidebar__identity-name',
        '.sidebar__identity-email',
        '.sidebar__identity-link',
        '.card[data-folder="introduction"] .card__title',
        '.card[data-folder="introduction"] .card__description',
        '.about-stats__title',
        '.about-stats__intro'
    ];

    selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
            if (!el.hasAttribute('data-reveal-lines')) {
                el.setAttribute('data-reveal-lines', '');
            }
        });
    });
}

function initLenisSmoothScroll() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;
    if (typeof window.Lenis === 'undefined') return null;
    if (window.__lenis) return window.__lenis;

    const lenis = new window.Lenis({
        duration: 1.2,
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 0.95,
        easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))
    });

    window.__lenis = lenis;

    lenis.on('scroll', () => ScrollTrigger.update());

    const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    const body = document.body;
    const updateLenisLock = () => {
        const isLocked = body.classList.contains('is-project-expanded')
            || body.classList.contains('ai-chat-active')
            || body.style.overflow === 'hidden';

        if (isLocked) {
            lenis.stop();
        } else {
            lenis.start();
        }
    };

    const bodyObserver = new MutationObserver(updateLenisLock);
    bodyObserver.observe(body, {
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    updateLenisLock();

    return lenis;
}

function ensureAboutStatsSection() {
    const main = document.querySelector('.main-content');
    const grid = document.querySelector('.card-grid');
    if (!main || !grid) return;

    if (document.getElementById('about-stats')) return;

    const section = document.createElement('section');
    section.id = 'about-stats';
    section.className = 'about-stats';
    section.innerHTML = `
      <h2 class="about-stats__title" data-reveal-lines>Numbers that shaped my path</h2>
      <p class="about-stats__intro" data-reveal-lines>From leading global teams to shipping products and building tools, here are a few milestones from my design journey.</p>
      <div class="about-stats__grid">
        <article class="about-stats__item">
          <p class="about-stats__value" data-count="15" data-suffix="+">0+</p>
          <p class="about-stats__label">Years in design</p>
        </article>
        <article class="about-stats__item">
          <p class="about-stats__value" data-count="50" data-suffix="+">0+</p>
          <p class="about-stats__label">Digital launches</p>
        </article>
        <article class="about-stats__item">
          <p class="about-stats__value" data-count="100" data-suffix="+">0+</p>
          <p class="about-stats__label">Logos designed</p>
        </article>
        <article class="about-stats__item">
          <p class="about-stats__value" data-count="500" data-suffix="K+">0K+</p>
          <p class="about-stats__label">Peace Sans downloads</p>
        </article>
      </div>
    `;

    grid.insertAdjacentElement('afterend', section);
}

function initScrollReveal() {
    const cards = document.querySelectorAll('.card:not(#addCardPlaceholder):not(.card--add):not([data-reveal-ready="1"])');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        gsap.set(cards, { opacity: 1, clearProps: 'transform' });
        const sidebarStatic = document.querySelector('.sidebar');
        if (sidebarStatic) {
            gsap.set(sidebarStatic, { opacity: 1, x: 0, clearProps: 'transform' });
        }
        cards.forEach((card) => { card.dataset.revealReady = '1'; });
        return;
    }

    cards.forEach((card, index) => {
        card.dataset.revealReady = '1';
        gsap.set(card, { opacity: 0 });
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

    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth > 768 && sidebar.dataset.revealReady !== '1') {
        sidebar.dataset.revealReady = '1';
        gsap.from(sidebar, {
            opacity: 0,
            x: -20,
            duration: 0.6,
            ease: 'power2.out',
            clearProps: 'transform' // Clear transform after animation to avoid stacking context issues
        });
    }
}

function initLineReveal() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = document.querySelectorAll('[data-reveal-lines]:not([data-lines-ready="1"])');
    if (!targets.length) return;

    targets.forEach((el) => {
        el.dataset.linesReady = '1';

        if (prefersReducedMotion) return;

        if (typeof window.SplitType === 'undefined') {
            gsap.fromTo(el, { opacity: 0, y: 16 }, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 88%',
                    once: true
                }
            });
            return;
        }

        const split = new window.SplitType(el, {
            types: 'lines',
            lineClass: 'reveal-line'
        });

        const lines = split.lines || [];
        if (!lines.length) return;

        lines.forEach((line) => {
            if (line.parentElement && line.parentElement.classList.contains('reveal-line-mask')) return;
            const mask = document.createElement('span');
            mask.className = 'reveal-line-mask';
            line.parentNode.insertBefore(mask, line);
            mask.appendChild(line);
        });

        gsap.set(lines, { yPercent: 105 });
        gsap.to(lines, {
            yPercent: 0,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                once: true
            }
        });
    });
}

function initCountUpStats() {
    const counters = document.querySelectorAll('[data-count]:not([data-count-ready="1"])');
    if (!counters.length) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    counters.forEach((el) => {
        el.dataset.countReady = '1';

        const target = Number(el.dataset.count || 0);
        const suffix = el.dataset.suffix || '';
        const decimals = Number(el.dataset.decimals || 0);
        const triggerEl = el.closest('.about-stats') || el;
        const state = { value: 0 };

        const render = () => {
            const rounded = decimals > 0 ? state.value.toFixed(decimals) : Math.round(state.value);
            const formatted = Number(rounded).toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
            el.textContent = `${formatted}${suffix}`;
        };

        if (prefersReducedMotion) {
            state.value = target;
            render();
            return;
        }

        render();

        gsap.to(state, {
            value: target,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: render,
            scrollTrigger: {
                trigger: triggerEl,
                start: 'top 82%',
                once: true
            }
        });
    });
}
