document.addEventListener('DOMContentLoaded', () => {
    // 1. Config & Data
    const PREVIEWS = {
        "https://www.digitas.com/en-us/pressroom/digitas-unveils-new-generative-ai-platform-digitas-ai": {
            title: "Digitas Unveils New Generative AI Platform",
            image: "assets/images/digitas-learn-more-link.jpg"
        },
        "https://apps.apple.com/us/app/journely/id6744461713": {
            title: "Journely: Handwriting Journal AI",
            image: "assets/images/journely-link.jpg"
        },
        "https://www.figma.com/community/plugin/1593731353807484611/mindcomplete": {
            title: "Mindcomplete - AI Writing Assistant",
            image: "assets/images/mindcomplete-figma-plugin-link.jpg"
        }
    };

    // 2. Create Tooltip Element
    const tooltip = document.createElement('div');
    tooltip.className = 'link-preview';
    tooltip.innerHTML = `
        <div class="link-preview__image-container">
            <img class="link-preview__image" src="" alt="Preview">
        </div>
        <div class="link-preview__content">
            <h4 class="link-preview__title"></h4>
            <span class="link-preview__domain"></span>
        </div>
    `;
    document.body.appendChild(tooltip);

    const previewImage = tooltip.querySelector('.link-preview__image');
    const previewTitle = tooltip.querySelector('.link-preview__title');
    const previewDomain = tooltip.querySelector('.link-preview__domain');

    // 3. Hover Logic
    // Attach to all links inside card descriptions
    // Note: Since cards might be dynamically loaded on build, but this runs clientside, it's fine. 
    // If cards were loaded via AJAX we'd need delegation, but here they are static in HTML.
    
    // Helper to get domain
    const getDomain = (url) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch (e) {
            return '';
        }
    };

    // Store RAF id for performance
    let rafId = null;

    const showTooltip = (e, url) => {
        const data = PREVIEWS[url];
        if (!data) return; // Only show for known links

        // Populate Data
        previewImage.src = data.image;
        previewTitle.textContent = data.title;
        previewDomain.textContent = getDomain(url);

        // Show
        tooltip.classList.add('is-visible');
        updatePosition(e);
    };

    const hideTooltip = () => {
        tooltip.classList.remove('is-visible');
    };

    const updatePosition = (e) => {
        // Offset from cursor
        const offsetX = 20;
        const offsetY = 20;
        
        let x = e.clientX + offsetX;
        let y = e.clientY + offsetY;

        // Boundary checks (keep on screen)
        const rect = tooltip.getBoundingClientRect();
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;

        // Flip left if too close to right edge
        if (x + rect.width > winWidth) {
            x = e.clientX - rect.width - offsetX;
        }

        // Flip up if too close to bottom
        if (y + rect.height > winHeight) {
            y = e.clientY - rect.height - offsetY;
        }

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    };

    // Event Delegation
    document.body.addEventListener('mouseover', (e) => {
        if (e.target.tagName === 'A') {
            const url = e.target.href;
            if (PREVIEWS[url]) {
                showTooltip(e, url);
            }
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        if (e.target.tagName === 'A') {
            hideTooltip();
        }
    });

    document.body.addEventListener('mousemove', (e) => {
        if (tooltip.classList.contains('is-visible')) {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => updatePosition(e));
        }
    });
});
