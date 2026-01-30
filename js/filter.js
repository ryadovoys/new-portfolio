// Filter Controller
// Handles filtering of cards based on tags
// NOTE: UI (Choose category) is currently removed from index.html but logic is kept for future use.

class FilterController {
    constructor() {
        this.activeFilter = 'all';
        this.tags = new Set();
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initObserver();
    }

    cacheDOM() {
        this.grid = document.querySelector('.card-grid');
        this.dropdown = document.querySelector('.filter-dropdown');
        if (this.dropdown) {
            this.trigger = this.dropdown.querySelector('.filter-dropdown__trigger');
            this.label = this.dropdown.querySelector('.filter-label');
            this.menu = this.dropdown.querySelector('.filter-dropdown__menu');
            this.optionsContainer = this.dropdown.querySelector('.filter-dropdown__options');

            // Initial state
            if (this.label) this.label.classList.add('is-placeholder');
        }
    }

    bindEvents() {
        if (this.trigger) {
            this.trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        document.addEventListener('click', (e) => {
            if (this.dropdown && !this.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Delegate click for options (static + dynamic)
        if (this.menu) {
            this.menu.addEventListener('click', (e) => {
                const option = e.target.closest('.filter-option');
                if (option) {
                    this.handleFilterSelect(option.dataset.filter);
                }
            });
        }
    }

    initObserver() {
        if (!this.grid) return;

        // Watch for cards being added/removed
        const observer = new MutationObserver(() => {
            this.updateTags();
            this.applyFilter(); // Re-apply current filter to new cards
        });

        observer.observe(this.grid, {
            childList: true,
            subtree: true
        });

        // Initial update
        this.updateTags();
    }

    toggleDropdown() {
        this.dropdown.classList.toggle('is-open');
    }

    closeDropdown() {
        if (this.dropdown) {
            this.dropdown.classList.remove('is-open');
        }
    }

    updateTags() {
        const cards = document.querySelectorAll('.card:not(#addCardPlaceholder)');
        const newTags = new Set();

        cards.forEach(card => {
            const tagEl = card.querySelector('.card__tag');
            if (tagEl) {
                const tag = tagEl.textContent.trim();
                if (tag) newTags.add(tag);
            }
        });

        // Check if tags changed
        if (this.areSetsEqual(this.tags, newTags)) return;

        this.tags = newTags;
        this.renderOptions();
    }

    areSetsEqual(a, b) {
        if (a.size !== b.size) return false;
        for (const item of a) if (!b.has(item)) return false;
        return true;
    }

    renderOptions() {
        if (!this.optionsContainer) return;

        // Keep "All" option if it exists, or re-render everything?
        // Let's re-render everything to be safe, but "All" is usually hardcoded or always first.
        // Assuming HTML has a static "All" button, we just append dynamic ones?
        // Or we enable the container to be cleared.

        // Let's assume the container is for dynamic options only, or we clear it.
        // implementation_plan said: "Populate dropdown options"
        // Let's clear and rebuild to keep order.

        this.optionsContainer.innerHTML = '';

        // Add "All" option
        const allBtn = document.createElement('button');
        allBtn.className = `filter-option ${this.activeFilter === 'all' ? 'is-selected' : ''}`;
        allBtn.dataset.filter = 'all';
        allBtn.textContent = 'All';
        this.optionsContainer.appendChild(allBtn);

        // Add tags
        Array.from(this.tags).sort().forEach(tag => {
            const btn = document.createElement('button');
            const isActive = this.activeFilter === tag;
            btn.className = `filter-option ${isActive ? 'is-selected' : ''}`;
            btn.dataset.filter = tag;
            btn.textContent = tag;
            this.optionsContainer.appendChild(btn);
        });
    }

    handleFilterSelect(filter) {
        this.activeFilter = filter;
        const isAll = filter === 'all';
        this.label.textContent = isAll ? 'Choose category' : filter;

        if (isAll) {
            this.label.classList.add('is-placeholder');
        } else {
            this.label.classList.remove('is-placeholder');
        }

        // Update selected state in UI
        const options = this.optionsContainer.querySelectorAll('.filter-option');
        options.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('is-selected');
            } else {
                btn.classList.remove('is-selected');
            }
        });

        this.closeDropdown();
        this.applyFilter();
    }

    applyFilter() {
        const cards = document.querySelectorAll('.card:not(#addCardPlaceholder)');

        cards.forEach(card => {
            if (this.activeFilter === 'all') {
                this.showCard(card);
                return;
            }

            const tagEl = card.querySelector('.card__tag');
            const cardTag = tagEl ? tagEl.textContent.trim() : '';

            if (cardTag === this.activeFilter) {
                this.showCard(card);
            } else {
                this.hideCard(card);
            }
        });

        // Dispatch event for layout recalculations (e.g., if needed by Masonry or similar?)
        // The CSS grid handles layout automatically, but animations might need help.
        // We can add a class to body or grid if needed.
    }

    showCard(card) {
        card.style.display = '';
        requestAnimationFrame(() => {
            card.classList.remove('is-filtered-out');
        });
    }

    hideCard(card) {
        card.classList.add('is-filtered-out');
        // Wait for transition before display: none? 
        // For simple filtering, just toggling a class that does opacity/pointer-events is often smoother.
        // If we want them to effectively disappear from layout, display: none is needed.
        // But display: none isn't animatable.

        // Let's use display: none for now to reflow the grid.
        card.style.display = 'none';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.filterController = new FilterController();
});
