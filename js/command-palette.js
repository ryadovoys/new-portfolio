/**
 * Command Palette - Quick Action Input
 * - Fixed input at bottom center
 * - Shows suggestions on focus
 * - Executes actions without opening full chat
 */

(function () {
    const ALL_SUGGESTIONS = [
        'Light mode',
        'Dark mode',
        'Show projects',
        'Show skills',
        'Show experience',
        'Show experiments',
        'Show all'
    ];

    function getSuggestions() {
        const theme = getCurrentTheme();
        return ALL_SUGGESTIONS.filter(s => {
            if (theme === 'dark' && s.toLowerCase().includes('dark mode')) return false;
            if (theme === 'light' && s.toLowerCase().includes('light mode')) return false;
            if (activeCardFilter === 'project' && s.toLowerCase().includes('show projects')) return false;
            if (activeCardFilter === 'skill' && s.toLowerCase().includes('show skills')) return false;
            if (activeCardFilter === 'experience' && s.toLowerCase().includes('show experience')) return false;
            if (activeCardFilter === 'experiment' && s.toLowerCase().includes('show experiments')) return false;
            if (activeCardFilter === 'all' && s.toLowerCase().includes('show all')) return false;
            return true;
        });
    }

    const AI_KNOWN_TAGS = ['skill', 'project', 'personal', 'experience', 'experiment'];

    const styleState = {
        visual: {
            hueRotate: 0,
            saturate: 100,
            contrast: 100,
            brightness: 100
        },
        layout: {
            scale: 1,
            rotateDeg: 0,
            skewDeg: 0
        }
    };

    const playgroundState = {
        initialTheme: null,
        tokenOverrides: new Set(),
        cardOrderCaptured: false
    };

    const PLAYGROUND_ROOT = document.documentElement;
    const PLAYGROUND_TARGET_SELECTOR = '.page';

    let isFocused = false;
    let selectedIndex = -1;
    let filteredSuggestions = [];
    let activeCardFilter = 'all';

    function clampNumber(value, min, max, fallback = null) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return fallback;
        return Math.min(max, Math.max(min, numericValue));
    }

    function normalizeTagValue(rawTag) {
        if (typeof rawTag !== 'string') return null;
        const normalized = rawTag.trim().toLowerCase();
        if (!normalized) return null;
        if (normalized === 'all' || normalized === '*' || normalized === 'any') return 'all';
        return normalized;
    }

    function getFilterableCards() {
        return Array.from(document.querySelectorAll('.card:not(#addCardPlaceholder):not(.card--add)'));
    }

    function getCardTag(cardEl) {
        const tagText = cardEl.querySelector('.card__tag')?.textContent?.trim();
        const category = cardEl.dataset.category;
        return normalizeTagValue(tagText || category || '');
    }

    function clearCardFilter() {
        const cards = getFilterableCards();
        cards.forEach((card) => {
            card.style.removeProperty('display');
            card.classList.remove('is-filtered-out');
        });
        activeCardFilter = 'all';
        return cards.length;
    }

    function applyCardFilter(tag) {
        const normalizedTag = normalizeTagValue(tag);
        if (!normalizedTag || normalizedTag === 'all') {
            activeCardFilter = 'all';
            return { shown: clearCardFilter(), total: getFilterableCards().length, activeFilter: 'all' };
        }

        let shown = 0;
        const cards = getFilterableCards();
        cards.forEach((card) => {
            const cardTag = getCardTag(card);
            const shouldShow = cardTag === normalizedTag;
            if (shouldShow) {
                shown += 1;
                card.style.removeProperty('display');
                card.classList.remove('is-filtered-out');
            } else {
                card.classList.add('is-filtered-out');
                card.style.display = 'none';
            }
        });

        activeCardFilter = normalizedTag;
        return { shown, total: cards.length, activeFilter: normalizedTag };
    }

    function applyVisualStyles() {
        const { hueRotate, saturate, contrast, brightness } = styleState.visual;
        const playgroundTargetEl = document.querySelector(PLAYGROUND_TARGET_SELECTOR);
        if (!playgroundTargetEl) return;

        const isDefault = hueRotate === 0 && saturate === 100 && contrast === 100 && brightness === 100;

        if (isDefault) {
            playgroundTargetEl.style.removeProperty('filter');
            return;
        }

        playgroundTargetEl.style.filter = [
            `hue-rotate(${hueRotate}deg)`,
            `saturate(${saturate}%)`,
            `contrast(${contrast}%)`,
            `brightness(${brightness}%)`
        ].join(' ');
    }

    function setVisualFilters(payload = {}) {
        styleState.visual.hueRotate = clampNumber(payload.hue_rotate ?? payload.hue ?? payload.hueDeg, -180, 180, styleState.visual.hueRotate);
        styleState.visual.saturate = clampNumber(payload.saturate, 0, 400, styleState.visual.saturate);
        styleState.visual.contrast = clampNumber(payload.contrast, 0, 300, styleState.visual.contrast);
        styleState.visual.brightness = clampNumber(payload.brightness, 0, 300, styleState.visual.brightness);
        applyVisualStyles();
    }

    function applyLayoutStyles() {
        const { scale, rotateDeg, skewDeg } = styleState.layout;
        const playgroundTargetEl = document.querySelector(PLAYGROUND_TARGET_SELECTOR);
        if (!playgroundTargetEl) return;

        const isDefault = scale === 1 && rotateDeg === 0 && skewDeg === 0;

        if (isDefault) {
            playgroundTargetEl.style.removeProperty('transform');
            playgroundTargetEl.style.removeProperty('transform-origin');
            return;
        }

        playgroundTargetEl.style.transformOrigin = 'top center';
        playgroundTargetEl.style.transform = `scale(${scale}) rotate(${rotateDeg}deg) skew(${skewDeg}deg)`;
    }

    function setLayoutTransform(payload = {}) {
        styleState.layout.scale = clampNumber(payload.scale, 0.6, 1.4, styleState.layout.scale);
        styleState.layout.rotateDeg = clampNumber(payload.rotate_deg ?? payload.rotate, -20, 20, styleState.layout.rotateDeg);
        styleState.layout.skewDeg = clampNumber(payload.skew_deg ?? payload.skew, -20, 20, styleState.layout.skewDeg);
        applyLayoutStyles();
    }

    function applyTokenOverride(tokenName, tokenValue) {
        if (typeof tokenName !== 'string' || !tokenName.startsWith('--') || typeof tokenValue !== 'string' || !tokenValue.trim()) {
            return false;
        }
        PLAYGROUND_ROOT.style.setProperty(tokenName, tokenValue.trim());
        playgroundState.tokenOverrides.add(tokenName);
        return true;
    }

    function captureInitialCardOrder() {
        if (playgroundState.cardOrderCaptured) return;
        const cardGridEl = document.querySelector('.card-grid');
        if (!cardGridEl) return;
        getFilterableCards().forEach((card, index) => {
            card.dataset.aiOriginalOrder = String(index);
        });
        playgroundState.cardOrderCaptured = true;
    }

    function restoreCardOrder() {
        const cardGridEl = document.querySelector('.card-grid');
        if (!cardGridEl) return 0;
        const cards = getFilterableCards();
        if (!cards.length) return 0;

        const placeholder = document.getElementById('addCardPlaceholder');
        cards
            .sort((a, b) => {
                const aOrder = Number(a.dataset.aiOriginalOrder ?? Number.MAX_SAFE_INTEGER);
                const bOrder = Number(b.dataset.aiOriginalOrder ?? Number.MAX_SAFE_INTEGER);
                return aOrder - bOrder;
            })
            .forEach((card) => {
                if (placeholder && placeholder.parentNode === cardGridEl) {
                    cardGridEl.insertBefore(card, placeholder);
                } else {
                    cardGridEl.appendChild(card);
                }
            });

        return cards.length;
    }

    function shuffleCards() {
        const cardGridEl = document.querySelector('.card-grid');
        if (!cardGridEl) return 0;
        const cards = getFilterableCards();
        if (cards.length < 2) return cards.length;

        const shuffled = [...cards];
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const placeholder = document.getElementById('addCardPlaceholder');
        const fragment = document.createDocumentFragment();
        shuffled.forEach((card) => fragment.appendChild(card));

        if (placeholder && placeholder.parentNode === cardGridEl) {
            cardGridEl.insertBefore(fragment, placeholder);
        } else {
            cardGridEl.appendChild(fragment);
        }

        return shuffled.length;
    }

    function getCurrentTheme() {
        if (typeof window.getThemeGlobal === 'function') {
            return window.getThemeGlobal();
        }
        const theme = document.documentElement.getAttribute('data-theme');
        return (theme === 'light' || theme === 'dark') ? theme : 'dark';
    }

    function setThemeFromCommand(theme) {
        const normalizedTheme = (theme === 'light' || theme === 'dark') ? theme : null;
        if (!normalizedTheme) return false;

        if (typeof window.setThemeGlobal === 'function') {
            return !!window.setThemeGlobal(normalizedTheme, { persist: false });
        }

        document.documentElement.setAttribute('data-theme', normalizedTheme);
        return true;
    }

    function toggleThemeFromCommand() {
        const currentTheme = getCurrentTheme();
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        const wasApplied = setThemeFromCommand(nextTheme);
        return wasApplied ? nextTheme : null;
    }

    function resetPlayground() {
        clearCardFilter();

        styleState.visual = { hueRotate: 0, saturate: 100, contrast: 100, brightness: 100 };
        applyVisualStyles();

        styleState.layout = { scale: 1, rotateDeg: 0, skewDeg: 0 };
        applyLayoutStyles();

        playgroundState.tokenOverrides.forEach((tokenName) => {
            PLAYGROUND_ROOT.style.removeProperty(tokenName);
        });
        playgroundState.tokenOverrides.clear();

        restoreCardOrder();

        if (playgroundState.initialTheme) {
            setThemeFromCommand(playgroundState.initialTheme);
        }
    }

    function runChaosMode(intensityValue) {
        const intensity = clampNumber(intensityValue, 0, 1, 0.65);
        const amplitude = intensity || 0.65;

        setVisualFilters({
            hue_rotate: (Math.random() * 360 - 180) * amplitude,
            saturate: 100 + (Math.random() * 250 * amplitude),
            contrast: 100 + (Math.random() * 80 * amplitude),
            brightness: 90 + (Math.random() * 45 * amplitude)
        });

        setLayoutTransform({
            scale: 1 + ((Math.random() * 0.4 - 0.2) * amplitude),
            rotate_deg: (Math.random() * 24 - 12) * amplitude,
            skew_deg: (Math.random() * 16 - 8) * amplitude
        });

        shuffleCards();

        const tagHue = Math.round(Math.random() * 360);
        const linkHue = Math.round(Math.random() * 360);
        applyTokenOverride('--tag-bg', `hsl(${tagHue} 90% 68%)`);
        applyTokenOverride('--tag-text', `hsl(${(tagHue + 170) % 360} 70% 18%)`);
        applyTokenOverride('--link-color', `hsl(${linkHue} 85% 50%)`);

        return intensity.toFixed(2);
    }

    function parseCommand(input) {
        const text = input.toLowerCase().trim();

        if (text.includes('light mode') || text.includes('light theme')) {
            return { type: 'set_theme', theme: 'light' };
        }
        if (text.includes('dark mode') || text.includes('dark theme')) {
            return { type: 'set_theme', theme: 'dark' };
        }

        if (text.includes('show projects') || text.includes('projects')) {
            return { type: 'filter_cards', tag: 'project' };
        }
        if (text.includes('show skills') || text.includes('skills')) {
            return { type: 'filter_cards', tag: 'skill' };
        }
        if (text.includes('show experience') || text.includes('experience')) {
            return { type: 'filter_cards', tag: 'experience' };
        }
        if (text.includes('show experiments') || text.includes('experiments')) {
            return { type: 'filter_cards', tag: 'experiment' };
        }
        if (text.includes('show all') || text === 'all') {
            return { type: 'clear_card_filter' };
        }

        return null;
    }

    function executeCommand(command) {
        if (!command) return 'Command not recognized';

        switch (command.type) {
            case 'set_theme': {
                const wasApplied = setThemeFromCommand(command.theme);
                return wasApplied ? `Theme set to ${command.theme}` : 'Failed to set theme';
            }
            case 'toggle_theme': {
                const theme = toggleThemeFromCommand();
                return theme ? `Theme toggled to ${theme}` : 'Failed to toggle theme';
            }
            case 'filter_cards': {
                const outcome = applyCardFilter(command.tag);
                return outcome.activeFilter === 'all'
                    ? `Showing all ${outcome.total} cards`
                    : `Filtered to ${outcome.shown} ${outcome.activeFilter} cards`;
            }
            case 'clear_card_filter': {
                const count = clearCardFilter();
                return `Showing all ${count} cards`;
            }
            case 'shuffle_cards': {
                const count = shuffleCards();
                return `Shuffled ${count} cards`;
            }
            case 'chaos_mode': {
                const intensity = runChaosMode(command.intensity);
                return `Chaos mode activated (intensity ${intensity})`;
            }
            case 'reset_playground': {
                resetPlayground();
                return 'Playground reset';
            }
            default:
                return 'Unknown command';
        }
    }

    const shortcutText = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘K' : 'Ctrl+K';

    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.innerHTML = `
        <div class="command-palette__suggestions" role="listbox"></div>
        <div class="command-palette__input-wrap" role="combobox" aria-expanded="false">
            <div class="command-palette__input-area">
                <input type="text" class="command-palette__input" placeholder="Type action" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Command input">
            </div>
            <span class="command-palette__shortcut">${shortcutText}</span>
        </div>
    `;

    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'command-palette__feedback';
    feedbackEl.setAttribute('aria-live', 'polite');

    document.body.appendChild(palette);
    document.body.appendChild(feedbackEl);

    const inputWrap = palette.querySelector('.command-palette__input-wrap');
    const input = palette.querySelector('.command-palette__input');
    const suggestionsEl = palette.querySelector('.command-palette__suggestions');

    let feedbackTimeout = null;

    function showFeedback(message) {
        feedbackEl.textContent = message;
        feedbackEl.classList.add('is-visible');

        if (feedbackTimeout) clearTimeout(feedbackTimeout);
        feedbackTimeout = setTimeout(() => {
            feedbackEl.classList.remove('is-visible');
        }, 2000);
    }

    function renderSuggestions(filter = '') {
        const SUGGESTIONS = getSuggestions();
        const filterLower = filter.toLowerCase().trim();
        filteredSuggestions = filterLower
            ? SUGGESTIONS.filter(s => s.toLowerCase().includes(filterLower))
            : [...SUGGESTIONS];

        if (filteredSuggestions.length === 0) {
            suggestionsEl.classList.remove('is-visible');
            inputWrap.setAttribute('aria-expanded', 'false');
            return;
        }

        suggestionsEl.innerHTML = filteredSuggestions
            .map((s, i) => `<div class="command-palette__suggestion${i === selectedIndex ? ' is-selected' : ''}" role="option">${s}</div>`)
            .join('');

        suggestionsEl.classList.add('is-visible');
        inputWrap.setAttribute('aria-expanded', 'true');
    }

    function hideSuggestions() {
        suggestionsEl.classList.remove('is-visible');
        inputWrap.setAttribute('aria-expanded', 'false');
        selectedIndex = -1;
    }

    function submitCommand(text) {
        const commandText = text || input.value.trim();
        if (!commandText) return;

        const command = parseCommand(commandText);
        const result = executeCommand(command);

        showFeedback(result);
        input.value = '';
        hideSuggestions();
        input.blur();
    }

    inputWrap.addEventListener('click', () => input.focus());

    input.addEventListener('focus', () => {
        isFocused = true;
        inputWrap.classList.add('is-focused');
        renderSuggestions(input.value);
    });

    input.addEventListener('blur', (e) => {
        if (palette.contains(e.relatedTarget)) return;
        isFocused = false;
        inputWrap.classList.remove('is-focused');
        setTimeout(hideSuggestions, 150);
    });

    input.addEventListener('input', () => {
        selectedIndex = -1;
        renderSuggestions(input.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
                submitCommand(filteredSuggestions[selectedIndex]);
            } else {
                submitCommand();
            }
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            input.blur();
            hideSuggestions();
            return;
        }

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const len = filteredSuggestions.length;
            if (len === 0) return;

            if (e.key === 'ArrowUp') {
                selectedIndex = selectedIndex <= 0 ? len - 1 : selectedIndex - 1;
            } else {
                selectedIndex = selectedIndex >= len - 1 ? 0 : selectedIndex + 1;
            }

            renderSuggestions(input.value);

            const selectedEl = suggestionsEl.querySelector('.is-selected');
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest' });
            }
            return;
        }

        if (e.key === 'Tab' && filteredSuggestions.length > 0) {
            e.preventDefault();
            const idx = selectedIndex >= 0 ? selectedIndex : 0;
            input.value = filteredSuggestions[idx];
            renderSuggestions(input.value);
        }
    });

    suggestionsEl.addEventListener('click', (e) => {
        const suggestion = e.target.closest('.command-palette__suggestion');
        if (!suggestion) return;
        submitCommand(suggestion.textContent);
    });

    suggestionsEl.addEventListener('mouseover', (e) => {
        const suggestion = e.target.closest('.command-palette__suggestion');
        if (!suggestion) return;
        const items = suggestionsEl.querySelectorAll('.command-palette__suggestion');
        items.forEach(item => item.classList.remove('is-selected'));
        suggestion.classList.add('is-selected');
        selectedIndex = Array.from(items).indexOf(suggestion);
    });

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            input.focus();
        }
    });

    captureInitialCardOrder();
    playgroundState.initialTheme = getCurrentTheme();

})();
