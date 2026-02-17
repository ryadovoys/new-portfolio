/**
 * Command Palette - Quick Action Input + AI Chat
 * - Fixed input at bottom center
 * - Shows suggestions on focus
 * - Executes actions or sends to AI
 */

(function () {
    const ALL_SUGGESTIONS = [
        'Turn on light mode',
        'Turn on dark mode',
        'Show only projects',
        'Show only skills',
        'Show only experience',
        'Show only experiments',
        'Show all cards',
        'Download Context'
    ];

    const CORE_CONTEXT_FILE = '/assets/sergey-ryadovoy-context.md';
    const CHARACTER_CONTEXT_FILE = '/assets/character.md';

    let SYSTEM_PROMPT = '';
    let isContextLoading = false;
    let contextLoadPromise = null;
    let chatHistory = [];
    let isLoading = false;

    const AI_ACTIONS_SYSTEM_PROMPT = [
        'You can optionally control website behavior using a strict action tag.',
        'When a user asks to change UI state, append exactly one block at the end of your reply:',
        '<app-actions>{"actions":[{"type":"set_theme","theme":"dark"}]}</app-actions>',
        'These actions are temporary and should not be persisted across page refresh.',
        'Allowed actions:',
        '- {"type":"set_theme","theme":"light|dark"}',
        '- {"type":"toggle_theme"}',
        '- {"type":"filter_cards","tag":"project|skill|personal|experience|experiment|all"}',
        '- {"type":"clear_card_filter"}',
        'Rules:',
        '- Never output CSS, JS, HTML, shell commands, or non-allowed actions.',
        '- If unsupported, answer in plain text and omit <app-actions>.',
        '- Keep normal conversational text outside the tag.'
    ].join('\n');

    async function fetchPromptFile(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) return null;
            const text = await response.text();
            return text ? text.trim() : null;
        } catch (err) {
            console.warn(`Context fetch failed for ${path}:`, err);
            return null;
        }
    }

    async function loadContextFile() {
        if (contextLoadPromise) return contextLoadPromise;

        contextLoadPromise = (async () => {
            if (isContextLoading) return;
            isContextLoading = true;

            try {
                const [coreContext, characterContext] = await Promise.all([
                    fetchPromptFile(CORE_CONTEXT_FILE),
                    fetchPromptFile(CHARACTER_CONTEXT_FILE)
                ]);

                if (!coreContext && !characterContext) {
                    throw new Error('No prompt file could be loaded');
                }

                const promptParts = [];
                if (coreContext) promptParts.push(coreContext);
                if (characterContext) promptParts.push(characterContext);
                SYSTEM_PROMPT = promptParts.join('\n\n');
            } catch (err) {
                console.error('Failed to load context file:', err);
                SYSTEM_PROMPT = [
                    `You are Sergey Ryadovoy's digital assistant.`,
                    `Speak in first person and keep answers short, professional, helpful, and proactive.`,
                    `Be direct and clear in your communication.`
                ].join(' ');
            } finally {
                isContextLoading = false;
            }
        })();

        try {
            await contextLoadPromise;
        } finally {
            contextLoadPromise = null;
        }
    }

    function getSuggestions() {
        const theme = getCurrentTheme();
        return ALL_SUGGESTIONS.filter(s => {
            if (theme === 'dark' && s.toLowerCase().includes('dark mode')) return false;
            if (theme === 'light' && s.toLowerCase().includes('light mode')) return false;
            if (activeCardFilter === 'project' && s.toLowerCase().includes('projects')) return false;
            if (activeCardFilter === 'skill' && s.toLowerCase().includes('skills')) return false;
            if (activeCardFilter === 'experience' && s.toLowerCase().includes('experience')) return false;
            if (activeCardFilter === 'experiment' && s.toLowerCase().includes('experiments')) return false;
            if (activeCardFilter === 'all' && s.toLowerCase().includes('all cards')) return false;
            return true;
        });
    }

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

    function parseJsonObject(rawValue) {
        if (typeof rawValue !== 'string') return null;
        try {
            return JSON.parse(rawValue);
        } catch {
            const withoutFence = rawValue.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            if (!withoutFence) return null;
            try {
                return JSON.parse(withoutFence);
            } catch {
                return null;
            }
        }
    }

    function extractAppActions(text) {
        if (typeof text !== 'string') return { cleanText: '', actions: [] };

        const actionTagRegex = /<app-actions>([\s\S]*?)<\/app-actions>/gi;
        const actions = [];
        let match;

        while ((match = actionTagRegex.exec(text)) !== null) {
            const parsed = parseJsonObject(match[1].trim());
            if (parsed && Array.isArray(parsed.actions)) {
                parsed.actions.forEach(action => actions.push(action));
            }
        }

        return {
            cleanText: text.replace(/<app-actions>[\s\S]*?<\/app-actions>/gi, '').trim(),
            actions
        };
    }

    function runAppActions(actions) {
        if (!Array.isArray(actions)) return;

        actions.forEach(action => {
            if (!action || typeof action !== 'object') return;

            switch (action.type) {
                case 'set_theme':
                    setThemeFromCommand(action.theme);
                    break;
                case 'toggle_theme': {
                    const current = getCurrentTheme();
                    setThemeFromCommand(current === 'dark' ? 'light' : 'dark');
                    break;
                }
                case 'filter_cards':
                    applyCardFilter(action.tag);
                    break;
                case 'clear_card_filter':
                    clearCardFilter();
                    break;
            }
        });
    }

    const shortcutText = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘/' : 'Ctrl+/';

    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.innerHTML = `
        <div class="command-palette__response" role="status" aria-live="polite"></div>
        <div class="command-palette__suggestions" role="listbox"></div>
        <div class="command-palette__input-wrap" role="combobox" aria-expanded="false">
            <div class="command-palette__input-area">
                <input type="text" class="command-palette__input" placeholder="Ask anything" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Command input">
            </div>
            <span class="command-palette__shortcut" role="button" tabindex="0" aria-label="Close command palette">${shortcutText}</span>
            <span class="command-palette__clear" role="button" tabindex="0" aria-label="Clear input">Clear</span>
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
    const responseEl = palette.querySelector('.command-palette__response');
    const shortcutEl = palette.querySelector('.command-palette__shortcut');
    const clearEl = palette.querySelector('.command-palette__clear');

    let feedbackTimeout = null;

    function showFeedback(message) {
        feedbackEl.textContent = message;
        feedbackEl.classList.add('is-visible');

        if (feedbackTimeout) clearTimeout(feedbackTimeout);
        feedbackTimeout = setTimeout(() => {
            feedbackEl.classList.remove('is-visible');
        }, 2000);
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function showResponse(text) {
        responseEl.innerHTML = `<div class="command-palette__response-content">${escapeHtml(text)}</div>`;
        responseEl.classList.add('is-visible');
        suggestionsEl.classList.remove('is-visible');
        inputWrap.setAttribute('aria-expanded', 'false');
        updateShortcutState();
    }

    function hideResponse() {
        responseEl.classList.remove('is-visible');
        responseEl.innerHTML = '';
    }

    function showLoading() {
        responseEl.innerHTML = `<div class="command-palette__loading"><span class="command-palette__loading-dot"></span><span class="command-palette__loading-dot"></span><span class="command-palette__loading-dot"></span></div>`;
        responseEl.classList.add('is-visible');
        suggestionsEl.classList.remove('is-visible');
        updateShortcutState();
    }

    function isOpen() {
        return isFocused || responseEl.classList.contains('is-visible') || suggestionsEl.classList.contains('is-visible');
    }

    function closePalette() {
        isFocused = false;
        suggestionsEl.classList.remove('is-visible');
        responseEl.classList.remove('is-visible');
        inputWrap.setAttribute('aria-expanded', 'false');
        selectedIndex = -1;
        input.blur();
        updateShortcutState();
    }

    function updateShortcutState() {
        const hasInput = input.value.length > 0;
        
        if (hasInput) {
            clearEl.classList.add('is-visible');
            shortcutEl.classList.add('is-hidden');
        } else {
            clearEl.classList.remove('is-visible');
            shortcutEl.classList.remove('is-hidden');
        }

        if (isOpen() && !hasInput) {
            shortcutEl.classList.add('is-close');
            shortcutEl.textContent = 'Esc';
        } else if (!hasInput) {
            shortcutEl.classList.remove('is-close');
            shortcutEl.textContent = shortcutText;
        }
    }

    function renderSuggestions(filter = '') {
        if (isLoading) return;

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
        updateShortcutState();
    }

    function hideSuggestions() {
        suggestionsEl.classList.remove('is-visible');
        inputWrap.setAttribute('aria-expanded', 'false');
        selectedIndex = -1;
    }

    async function sendToAI(message, isSpecialPrompt = false) {
        if (isLoading) return;
        isLoading = true;
        showLoading();

        // Only add to visible chat history if not a special prompt
        if (!isSpecialPrompt) {
            chatHistory.push({ role: 'user', content: message });
        }

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'system', content: AI_ACTIONS_SYSTEM_PROMPT },
                        ...chatHistory
                    ]
                })
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();
            const aiResponseRaw = data.choices?.[0]?.message?.content || 'No response';
            const { cleanText, actions } = extractAppActions(aiResponseRaw);

            runAppActions(actions);

            const assistantText = cleanText || aiResponseRaw;
            chatHistory.push({ role: 'assistant', content: assistantText });

            showResponse(assistantText);
        } catch (error) {
            console.error('Command palette AI error:', error);
            chatHistory.pop();
            showResponse('Error: ' + error.message);
        }

        isLoading = false;
    }

    async function submitCommand(text) {
        const commandText = text || input.value.trim();
        if (!commandText) return;

        input.value = '';

        await loadContextFile();

        // Handle special suggestions
        if (commandText === 'Download Context') {
            const downloadPrompt = `Provide a download link for Sergey's context file. Reply with: "Here is a full context about Sergey in markdown format that is easy to read for any LLM. [Download Context.md](/assets/sergey-ryadovoy-context.md)". Make "Download Context.md" underlined to indicate it's a link.`;
            await sendToAI(downloadPrompt, true);
            return;
        }

        await sendToAI(commandText);
    }

    inputWrap.addEventListener('click', (e) => {
        if (e.target === shortcutEl) return;
        input.focus();
    });

    input.addEventListener('focus', () => {
        isFocused = true;
        inputWrap.classList.add('is-focused');
        if (!responseEl.classList.contains('is-visible')) {
            renderSuggestions(input.value);
        }
        updateShortcutState();
    });

    input.addEventListener('blur', (e) => {
        if (palette.contains(e.relatedTarget)) return;
        isFocused = false;
        inputWrap.classList.remove('is-focused');
        setTimeout(() => {
            if (!isFocused && !responseEl.classList.contains('is-visible')) {
                hideSuggestions();
            }
            updateShortcutState();
        }, 150);
    });

    input.addEventListener('input', () => {
        if (responseEl.classList.contains('is-visible')) {
            hideResponse();
        }
        selectedIndex = -1;
        renderSuggestions(input.value);
        updateShortcutState();
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
            closePalette();
            return;
        }

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            if (responseEl.classList.contains('is-visible')) return;
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
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
            e.preventDefault();
            if (isOpen()) {
                closePalette();
            } else {
                input.focus();
            }
        }
    });

    shortcutEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isOpen()) {
            closePalette();
        } else {
            input.focus();
        }
    });

    shortcutEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isOpen()) {
                closePalette();
            } else {
                input.focus();
            }
        }
    });

    clearEl.addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = '';
        input.focus();
        updateShortcutState();
    });

    clearEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            input.value = '';
            input.focus();
            updateShortcutState();
        }
    });

    document.addEventListener('click', (e) => {
        if (!palette.contains(e.target) && isOpen() && !isLoading) {
            closePalette();
        }
    });

    loadContextFile();

})();
