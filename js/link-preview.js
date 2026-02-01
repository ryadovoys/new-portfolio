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
            // For relative assets, use the site domain as shown in the image
            if (url.includes('assets/')) return 'ryadovoy.com';
            
            const domain = new URL(url).hostname.replace('www.', '');
            return domain || 'ryadovoy.com';
        } catch (e) {
            return 'ryadovoy.com';
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
        updatePosition(e, target);
    };

    const hideTooltip = () => {
        tooltip.classList.remove('is-visible');
    };

    const updatePosition = (e, target = null) => {
        const gap = 24; // Distance from link
        const margin = 16;
        const rect = tooltip.getBoundingClientRect();
        
        let x, y;

        // Check if the hovered element is a sidebar link (or inside one)
        const sidebarLink = target?.closest('.sidebar__nav-link');

        if (sidebarLink && window.innerWidth > 768) {
            // Sidebar specific positioning
            const linkRect = sidebarLink.getBoundingClientRect();
            
            // Align to the right of the link highlight
            x = linkRect.right + gap;
            
            // Align vertically with the link text/highlight
            // Image shows it slightly offset downwards
            y = linkRect.top - 8;

            // Stop following mouse for anchored links
            rafId && cancelAnimationFrame(rafId);
        } else {
            // Default behavior for other links: center horizontally relative to mouse/link
            x = e.clientX - rect.width / 2;
            y = e.clientY + 20;
        }

        // Horizontal boundaries
        if (x < margin) x = margin;
        if (x + rect.width > window.innerWidth - margin) {
            x = window.innerWidth - rect.width - margin;
            
            // If it hits right edge and it's a sidebar link, maybe show on left?
            // But usually sidebar is on the far left, so this is unlikely.
        }

        // Vertical boundaries (Flip if hits bottom)
        if (y + rect.height > window.innerHeight - margin) {
            y = window.innerHeight - rect.height - margin;
            
            // If it's a sidebar link and it's hitting the bottom, we might want to 
            // align its bottom with the link's bottom instead of just clamping.
            if (sidebarLink && window.innerWidth > 768) {
                const linkRect = sidebarLink.getBoundingClientRect();
                y = linkRect.bottom - rect.height + 8;
            }
        }
        
        // Ensure it doesn't go off the top
        if (y < margin) y = margin;

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    };

    // Event Delegation
    document.body.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a');
        if (link) {
            const url = link.getAttribute('href'); // Use getAttribute to get raw value
            if (url) {
                showTooltip(e, url, link);
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
            const link = e.target.closest('a');
            const isSidebarLink = link?.closest('.sidebar__nav-link');
            
            // Only follow mouse if NOT a sidebar link
            if (!isSidebarLink || window.innerWidth <= 768) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => updatePosition(e, link));
            }
        }
    });
});
