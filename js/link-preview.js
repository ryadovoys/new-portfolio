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
        },
        "assets/Peace Sans.zip": {
            title: "Peace Sans Free Font",
            image: "assets/images/peace-sans-link.jpg"
        },
        "https://www.amway.com/": {
            title: "Amway Official Website",
            image: "assets/images/amway-link.jpg"
        },
        "assets/sergey-ryadovoy-context.md": {
            title: "This is a file that you can download or copy and paste into your favorite AI tool to ask questions about me.",
            image: null
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
            <p class="link-preview__description"></p>
            <span class="link-preview__domain"></span>
        </div>
    `;
    document.body.appendChild(tooltip);

    const previewImageContainer = tooltip.querySelector('.link-preview__image-container');
    const previewImage = tooltip.querySelector('.link-preview__image');
    const previewTitle = tooltip.querySelector('.link-preview__title');
    const previewDescription = tooltip.querySelector('.link-preview__description');
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
        // Decode URL to handle spaces (e.g. %20 -> space)
        const decodedUrl = decodeURIComponent(url);
        let data = PREVIEWS[url] || PREVIEWS[decodedUrl];

        // If not exact match, try matching end of URL (for relative paths)
        if (!data) {
            for (const key in PREVIEWS) {
                if (url.endsWith(key) || decodedUrl.endsWith(key)) {
                    data = PREVIEWS[key];
                    break;
                }
            }
        }

        if (!data) return; // Only show for known links

        // Populate Data
        if (data.image) {
            previewImage.src = data.image;
            previewImageContainer.style.display = 'block';
        } else {
            previewImageContainer.style.display = 'none';
        }

        previewTitle.textContent = data.title;

        if (data.description) {
            previewDescription.textContent = data.description;
            previewDescription.style.display = 'block';
        } else {
            previewDescription.style.display = 'none';
        }

        previewDomain.textContent = getDomain(url);

        // Show
        tooltip.classList.add('is-visible');
        updatePosition(e);
    };

    const hideTooltip = () => {
        tooltip.classList.remove('is-visible');
    };

    const updatePosition = (e) => {
        const gap = 20;
        const margin = 16;
        const rect = tooltip.getBoundingClientRect();

        // Center horizontally
        let x = e.clientX - rect.width / 2;
        // Position below by default
        let y = e.clientY + gap;

        // Horizontal boundaries
        if (x < margin) x = margin;
        if (x + rect.width > window.innerWidth - margin) {
            x = window.innerWidth - rect.width - margin;
        }

        // Vertical boundaries (Flip if hits bottom)
        if (y + rect.height > window.innerHeight - margin) {
            y = e.clientY - rect.height - gap; // Flip to above pointer
        }

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    };

    // Event Delegation
    document.body.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a');
        if (link) {
            // Check if it's a real link with href
            const url = link.href;
            if (url) {
                showTooltip(e, url);
            }
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        const link = e.target.closest('a');
        if (link) {
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
