/**
 * AI Chat Overlay Experiment
 * - Start typing to activate overlay
 * - Press Enter to send to AI
 * - Press Escape to close
 */

(function () {

    // State
    let isActive = false;
    let inputText = '';
    let isLoading = false;
    let showingResponse = false;
    let isContextLoading = false;
    let contextLoadPromise = null;
    const CORE_CONTEXT_FILE = '/assets/sergey-ryadovoy-context.md';
    const CHARACTER_CONTEXT_FILE = '/assets/character.md';
    const CHAT_DEFAULT_HEIGHT_RATIO = 1 / 2;
    const CHAT_MIN_HEIGHT_RATIO = 0.24;
    const CHAT_MAX_HEIGHT_RATIO = 0.9;
    const PLAYGROUND_ROOT = document.documentElement;
    const PLAYGROUND_TARGET_SELECTOR = '.page';
    const AI_KNOWN_TAGS = ['skill', 'project', 'personal', 'experience', 'experiment'];

    let chatHistory = [];
    let suggestionIndex = -1;
    let resizeState = null;
    let activeCardFilter = 'all';

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

    const SUGGESTED_QUESTIONS = [
        "What you can do?",
        "Make website in light mode.",
        "Make website in dark mode.",
        "Shuffle cards.",
        "Reset playground.",
        "Who is Sergey?",
        "What is your tech stack?",
        "Show me your best projects.",
        "Tell me about Digitas.",
        "What is Journely?",
        "How do you use AI in design?",
        "Do you like fish?",
        "How can I contact Sergey?",
        "What is your design philosophy?",
        "Show me mobile app designs.",
        "Show me web design projects.",
        "What awards have you won?",
        "Tell me a joke.",
        "Who are you?",
        "What is 'mindcomplete'?",
        "Show me the VISA project.",
        "What tools do you use daily?",
        "Can you write code?",
        "Tell me about your experience.",
        "What are you working on now?"
    ];

    // Create overlay elements
    const overlay = document.createElement('div');
    overlay.className = 'ai-chat-overlay';
    overlay.innerHTML = `
        <button type="button" class="ai-chat__close-btn" aria-label="Close AI Chat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
        <div class="ai-chat__response-area" aria-live="polite"></div>
        <div class="ai-chat__input-bar">
            <span class="ai-chat__prompt">&gt;</span>
            <input type="text" class="ai-chat__input" placeholder="What's on your mind?" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>
        <div class="ai-chat__footer">
            <span class="ai-chat__hint">Press up or down key for suggestions</span>
        </div>
        <div class="ai-chat__resize-handle" role="separator" aria-label="Resize chat panel" aria-orientation="horizontal" tabindex="0"></div>
    `;
    document.body.appendChild(overlay);


    const inputEl = overlay.querySelector('.ai-chat__input');
    const responseEl = overlay.querySelector('.ai-chat__response-area');
    const resizeHandleEl = overlay.querySelector('.ai-chat__resize-handle');
    const playgroundTargetEl = document.querySelector(PLAYGROUND_TARGET_SELECTOR) || document.body;
    const cardGridEl = document.querySelector('.card-grid');

    function isPlainTypingKey(e) {
        return e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;
    }

    function focusInputAndAppend(text) {
        inputEl.focus({ preventScroll: true });
        if (!text) return;
        inputEl.value += text;
        inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
    }

    function getViewportHeight() {
        return Math.max(window.innerHeight || 0, window.visualViewport?.height || 0, 1);
    }

    function getHeightBounds() {
        const viewportHeight = getViewportHeight();
        const min = Math.round(viewportHeight * CHAT_MIN_HEIGHT_RATIO);
        const max = Math.round(viewportHeight * CHAT_MAX_HEIGHT_RATIO);
        return { min, max };
    }

    function clampChatHeight(nextHeight) {
        const { min, max } = getHeightBounds();
        return Math.min(max, Math.max(min, Math.round(nextHeight)));
    }

    function applyChatHeight(nextHeight) {
        const clamped = clampChatHeight(nextHeight);
        overlay.style.height = `${clamped}px`;
        return clamped;
    }

    function initChatHeight() {
        const initialHeight = getViewportHeight() * CHAT_DEFAULT_HEIGHT_RATIO;
        applyChatHeight(initialHeight);
    }

    function startResize(event) {
        if (event.button !== 0) return;
        event.preventDefault();

        resizeState = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startHeight: overlay.getBoundingClientRect().height
        };

        overlay.classList.add('is-resizing');
        document.body.classList.add('ai-chat-resizing');

        if (resizeHandleEl.setPointerCapture) {
            resizeHandleEl.setPointerCapture(event.pointerId);
        }
    }

    function moveResize(event) {
        if (!resizeState || event.pointerId !== resizeState.pointerId) return;
        event.preventDefault();

        const deltaY = event.clientY - resizeState.startY;
        const nextHeight = resizeState.startHeight + deltaY;
        applyChatHeight(nextHeight);
    }

    function endResize(event) {
        if (!resizeState) return;
        if (event && event.pointerId !== undefined && event.pointerId !== resizeState.pointerId) return;

        if (resizeHandleEl.releasePointerCapture && resizeHandleEl.hasPointerCapture(resizeState.pointerId)) {
            resizeHandleEl.releasePointerCapture(resizeState.pointerId);
        }

        resizeState = null;
        overlay.classList.remove('is-resizing');
        document.body.classList.remove('ai-chat-resizing');
    }

    function handleResizeByKeyboard(event) {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();

        const step = event.shiftKey ? 48 : 24;
        const delta = event.key === 'ArrowDown' ? step : -step;
        const currentHeight = overlay.getBoundingClientRect().height;
        applyChatHeight(currentHeight + delta);
    }

    function syncChatHeightToViewport() {
        const currentHeight = overlay.getBoundingClientRect().height || getViewportHeight() * CHAT_DEFAULT_HEIGHT_RATIO;
        applyChatHeight(currentHeight);
    }

    function handleOverlayWheel(event) {
        if (!isActive) return;
        if (!overlay.contains(event.target)) return;

        const maxScrollTop = responseEl.scrollHeight - responseEl.clientHeight;
        if (maxScrollTop > 0) {
            responseEl.scrollTop += event.deltaY;
        }

        // Keep wheel control inside chat and bypass global smooth-scroll handlers.
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
    }

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
        const isDefault = hueRotate === 0
            && saturate === 100
            && contrast === 100
            && brightness === 100;

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
        const nextHue = clampNumber(payload.hue_rotate ?? payload.hue ?? payload.hueDeg, -180, 180, styleState.visual.hueRotate);
        const nextSaturate = clampNumber(payload.saturate, 0, 400, styleState.visual.saturate);
        const nextContrast = clampNumber(payload.contrast, 0, 300, styleState.visual.contrast);
        const nextBrightness = clampNumber(payload.brightness, 0, 300, styleState.visual.brightness);

        styleState.visual.hueRotate = nextHue;
        styleState.visual.saturate = nextSaturate;
        styleState.visual.contrast = nextContrast;
        styleState.visual.brightness = nextBrightness;

        applyVisualStyles();
        return `${Math.round(nextHue)}deg / sat ${Math.round(nextSaturate)}% / con ${Math.round(nextContrast)}% / bri ${Math.round(nextBrightness)}%`;
    }

    function applyLayoutStyles() {
        const { scale, rotateDeg, skewDeg } = styleState.layout;
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
        const nextScale = clampNumber(payload.scale, 0.6, 1.4, styleState.layout.scale);
        const nextRotate = clampNumber(payload.rotate_deg ?? payload.rotate, -20, 20, styleState.layout.rotateDeg);
        const nextSkew = clampNumber(payload.skew_deg ?? payload.skew, -20, 20, styleState.layout.skewDeg);

        styleState.layout.scale = nextScale;
        styleState.layout.rotateDeg = nextRotate;
        styleState.layout.skewDeg = nextSkew;

        applyLayoutStyles();
        return `scale ${nextScale.toFixed(2)}, rotate ${Math.round(nextRotate)}deg, skew ${Math.round(nextSkew)}deg`;
    }

    function isValidTokenName(tokenName) {
        return typeof tokenName === 'string'
            && tokenName.startsWith('--')
            && tokenName.length >= 3
            && tokenName.length <= 64;
    }

    function applyTokenOverride(tokenName, tokenValue) {
        if (!isValidTokenName(tokenName) || typeof tokenValue !== 'string' || !tokenValue.trim()) {
            return false;
        }
        PLAYGROUND_ROOT.style.setProperty(tokenName, tokenValue.trim());
        playgroundState.tokenOverrides.add(tokenName);
        return true;
    }

    function applyTokenOverrides(tokenMap) {
        if (!tokenMap || typeof tokenMap !== 'object' || Array.isArray(tokenMap)) {
            return { applied: 0, total: 0 };
        }

        let applied = 0;
        const entries = Object.entries(tokenMap);
        entries.forEach(([tokenName, tokenValue]) => {
            if (applyTokenOverride(tokenName, String(tokenValue))) {
                applied += 1;
            }
        });

        return { applied, total: entries.length };
    }

    function captureInitialCardOrder() {
        if (playgroundState.cardOrderCaptured) return;
        getFilterableCards().forEach((card, index) => {
            card.dataset.aiOriginalOrder = String(index);
        });
        playgroundState.cardOrderCaptured = true;
    }

    function restoreCardOrder() {
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

        if (activeCardFilter !== 'all') {
            applyCardFilter(activeCardFilter);
        }
        return shuffled.length;
    }

    function getCurrentTheme() {
        if (typeof window.getThemeGlobal === 'function') {
            return window.getThemeGlobal();
        }
        return normalizeThemeValue(document.documentElement.getAttribute('data-theme')) || 'dark';
    }

    function resetPlayground() {
        clearCardFilter();

        styleState.visual = {
            hueRotate: 0,
            saturate: 100,
            contrast: 100,
            brightness: 100
        };
        applyVisualStyles();

        styleState.layout = {
            scale: 1,
            rotateDeg: 0,
            skewDeg: 0
        };
        applyLayoutStyles();

        playgroundState.tokenOverrides.forEach((tokenName) => {
            PLAYGROUND_ROOT.style.removeProperty(tokenName);
        });
        playgroundState.tokenOverrides.clear();

        restoreCardOrder();

        if (playgroundState.initialTheme) {
            setThemeFromChat(playgroundState.initialTheme);
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

        // Optional token chaos to make the UI feel intentionally "broken" but recoverable on refresh/reset.
        const tagHue = Math.round(Math.random() * 360);
        const linkHue = Math.round(Math.random() * 360);
        applyTokenOverride('--tag-bg', `hsl(${tagHue} 90% 68%)`);
        applyTokenOverride('--tag-text', `hsl(${(tagHue + 170) % 360} 70% 18%)`);
        applyTokenOverride('--link-color', `hsl(${linkHue} 85% 50%)`);

        return intensity.toFixed(2);
    }

    // Activate overlay (start typing)
    function activate() {
        if (isActive) return;
        isActive = true;
        inputText = '';
        showingResponse = false;
        inputEl.value = '';
        overlay.classList.add('active');
        document.body.classList.add('ai-chat-active');

        // Always render history (restored or empty)
        renderHistory();
    }

    // Deactivate overlay
    function deactivate() {
        if (!isActive) return;
        isActive = false;
        isLoading = false;
        showingResponse = false;
        overlay.classList.remove('active');
        document.body.classList.remove('ai-chat-active');
        inputText = '';
        inputEl.value = '';
        inputEl.blur();
        // Do NOT clear responseEl or chatHistory here to persist context until reload
    }

    // Render conversation history (terminal-style)
    function renderHistory() {
        let html = '';
        chatHistory.forEach(msg => {
            const isUser = msg.role === 'user';
            let content = msg.content
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

            // Parse assets
            content = content.replace(/\(asset:(\w+)\)/g, (match, assetKey) => {
                const asset = ASSETS[assetKey.toLowerCase()];
                if (!asset) return '';
                if (asset.type === 'video') {
                    return `<div class="ai-chat__media-block"><video src="${asset.src}" autoplay loop muted playsinline></video></div>`;
                }
                return `<div class="ai-chat__media-block"><img src="${asset.src}" alt="${assetKey}"></div>`;
            });

            if (isUser) {
                html += `<div class="ai-chat__line ai-chat__line--user"><span class="ai-chat__prompt">&gt;</span><span class="ai-chat__content">${content}</span></div>`;
            } else {
                html += `<div class="ai-chat__line ai-chat__line--assistant"><span class="ai-chat__avatar-wrap"><img class="ai-chat__avatar" src="/assets/terminal-me.png" alt="Sergey avatar"></span><span class="ai-chat__content">${content}</span></div>`;
            }
        });
        responseEl.innerHTML = html;
        // Auto-scroll to bottom
        responseEl.scrollTop = responseEl.scrollHeight;
    }

    // Asset mapping - keys match context file instructions
    const ASSETS = {
        // Video assets
        'visa': { type: 'video', src: '/assets/visa-website-showcase-video.mp4' },
        'mindcomplete': { type: 'video', src: '/assets/mindcomplete-plugin-showcase-video.mp4' },

        // Personal projects
        'journely': { type: 'image', src: '/assets/journely-ipad-app-preview.jpg' },
        'peace': { type: 'image', src: '/assets/peace-sans-font-preview.jpg' },
        'type': { type: 'image', src: '/assets/36-days-of-type-creative-coding.gif' },

        // Agency work
        'digitas': { type: 'image', src: '/assets/digitas-ai-agentic-platform.gif' },
        'amway': { type: 'image', src: '/assets/amway-website-redesign.gif' },
        'delta': { type: 'image', src: '/assets/delta-ces-campaign-overview.webp' },
        'loreal': { type: 'image', src: '/assets/loreal-beauty-ai-project.webp' },
        'racetrac': { type: 'image', src: '/assets/racetrac-app-design-system.jpg' },
        'logos': { type: 'image', src: '/assets/logo-design-collection-animated.gif' },
        'genmedia': { type: 'video', src: '/assets/generative-media/1-video.mp4' }
    };



    // System prompt placeholder - will be fetched
    let SYSTEM_PROMPT = '';
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
        '- {"type":"set_visual_filter","hue_rotate":-180..180,"saturate":0..400,"contrast":0..300,"brightness":0..300}',
        '- {"type":"set_layout_transform","scale":0.6..1.4,"rotate_deg":-20..20,"skew_deg":-20..20}',
        '- {"type":"set_token","token":"--token-name","value":"any css value"}',
        '- {"type":"set_tokens","tokens":{"--token":"value","--token-2":"value"}}',
        '- {"type":"shuffle_cards"}',
        '- {"type":"chaos_mode","intensity":0..1}',
        '- {"type":"reset_playground"}',
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
            const trimmedText = text ? text.trim() : '';
            return trimmedText || null;
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
                if (coreContext) {
                    promptParts.push(coreContext);
                }
                if (characterContext) {
                    promptParts.push(characterContext);
                }
                SYSTEM_PROMPT = promptParts.join('\n\n');
            } catch (err) {
                console.error('Failed to load context file:', err);
                SYSTEM_PROMPT = [
                    `You are Sergey Ryadovoy's digital assistant.`,
                    `Speak in first person and keep answers short, professional, helpful, and proactive.`,
                    `Be direct and clear in your communication.`,
                    `You are helping people learn about Sergey's work and projects.`
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
    loadContextFile();
    captureInitialCardOrder();
    playgroundState.initialTheme = getCurrentTheme();
    initChatHeight();
    window.addEventListener('resize', syncChatHeightToViewport);
    window.addEventListener('wheel', handleOverlayWheel, { passive: false, capture: true });

    resizeHandleEl.addEventListener('pointerdown', startResize);
    resizeHandleEl.addEventListener('pointermove', moveResize);
    resizeHandleEl.addEventListener('pointerup', endResize);
    resizeHandleEl.addEventListener('pointercancel', endResize);
    resizeHandleEl.addEventListener('lostpointercapture', endResize);
    resizeHandleEl.addEventListener('keydown', handleResizeByKeyboard);

    function buildChatRequestPayload() {
        return {
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'system', content: AI_ACTIONS_SYSTEM_PROMPT },
                ...chatHistory
            ]
        };
    }

    function parseJsonObject(rawValue) {
        if (typeof rawValue !== 'string') return null;

        try {
            return JSON.parse(rawValue);
        } catch {
            const withoutFence = rawValue
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/, '')
                .trim();

            if (!withoutFence) return null;
            try {
                return JSON.parse(withoutFence);
            } catch {
                return null;
            }
        }
    }

    function normalizeThemeValue(value) {
        if (typeof value !== 'string') return null;
        const normalized = value.trim().toLowerCase();
        return normalized === 'dark' || normalized === 'light' ? normalized : null;
    }

    function extractAppActions(text) {
        if (typeof text !== 'string') {
            return {
                cleanText: '',
                actions: [],
                hadActionTag: false
            };
        }

        const actionTagRegex = /<app-actions>([\s\S]*?)<\/app-actions>/gi;
        const actions = [];
        let hadActionTag = false;
        let match;

        while ((match = actionTagRegex.exec(text)) !== null) {
            hadActionTag = true;
            const parsed = parseJsonObject(match[1].trim());
            if (!parsed || !Array.isArray(parsed.actions)) continue;
            parsed.actions.forEach(action => actions.push(action));
        }

        return {
            cleanText: text.replace(/<app-actions>[\s\S]*?<\/app-actions>/gi, '').trim(),
            actions,
            hadActionTag
        };
    }

    function setThemeFromChat(theme) {
        const normalizedTheme = normalizeThemeValue(theme);
        if (!normalizedTheme) return false;

        if (typeof window.setThemeGlobal === 'function') {
            return !!window.setThemeGlobal(normalizedTheme, { persist: false });
        }

        document.documentElement.setAttribute('data-theme', normalizedTheme);
        return true;
    }

    function toggleThemeFromChat() {
        const currentTheme = getCurrentTheme();
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        const wasApplied = setThemeFromChat(nextTheme);
        return wasApplied ? nextTheme : null;
    }

    function runAppActions(actions) {
        const result = {
            applied: [],
            rejected: []
        };

        if (!Array.isArray(actions) || actions.length === 0) {
            return result;
        }

        actions.forEach(action => {
            if (!action || typeof action !== 'object') {
                result.rejected.push('invalid action payload');
                return;
            }

            switch (action.type) {
                case 'set_theme': {
                    const theme = normalizeThemeValue(action.theme);
                    if (!theme) {
                        result.rejected.push('set_theme requires theme light or dark');
                        return;
                    }

                    const wasApplied = setThemeFromChat(theme);
                    if (wasApplied) {
                        result.applied.push(`theme set to ${theme}`);
                    } else {
                        result.rejected.push(`failed to set theme to ${theme}`);
                    }
                    return;
                }

                case 'toggle_theme': {
                    const theme = toggleThemeFromChat();
                    if (theme) {
                        result.applied.push(`theme toggled to ${theme}`);
                    } else {
                        result.rejected.push('failed to toggle theme');
                    }
                    return;
                }

                case 'filter_cards': {
                    const tag = normalizeTagValue(action.tag || action.filter || action.value || '');
                    if (!tag) {
                        result.rejected.push('filter_cards requires tag');
                        return;
                    }

                    const outcome = applyCardFilter(tag);
                    if (tag !== 'all' && !AI_KNOWN_TAGS.includes(tag)) {
                        result.applied.push(`card filter "${tag}" (${outcome.shown}/${outcome.total} shown; custom tag)`);
                    } else {
                        result.applied.push(`card filter "${outcome.activeFilter}" (${outcome.shown}/${outcome.total} shown)`);
                    }
                    return;
                }

                case 'clear_card_filter': {
                    const restored = clearCardFilter();
                    result.applied.push(`card filter cleared (${restored} cards visible)`);
                    return;
                }

                case 'set_visual_filter': {
                    const summary = setVisualFilters(action);
                    result.applied.push(`visual filter updated (${summary})`);
                    return;
                }

                case 'set_layout_transform': {
                    const summary = setLayoutTransform(action);
                    result.applied.push(`layout transform updated (${summary})`);
                    return;
                }

                case 'set_token': {
                    const tokenName = action.token;
                    const tokenValue = action.value;
                    const wasApplied = applyTokenOverride(tokenName, typeof tokenValue === 'string' ? tokenValue : String(tokenValue ?? ''));
                    if (wasApplied) {
                        result.applied.push(`token ${tokenName} updated`);
                    } else {
                        result.rejected.push('set_token requires valid token and value');
                    }
                    return;
                }

                case 'set_tokens': {
                    const stats = applyTokenOverrides(action.tokens);
                    if (stats.total === 0) {
                        result.rejected.push('set_tokens requires a tokens object');
                        return;
                    }
                    if (stats.applied === 0) {
                        result.rejected.push('set_tokens had no valid token/value pairs');
                        return;
                    }
                    result.applied.push(`${stats.applied}/${stats.total} tokens updated`);
                    return;
                }

                case 'shuffle_cards': {
                    const shuffledCount = shuffleCards();
                    result.applied.push(`${shuffledCount} cards shuffled`);
                    return;
                }

                case 'chaos_mode': {
                    const intensity = runChaosMode(action.intensity);
                    result.applied.push(`chaos mode applied (intensity ${intensity})`);
                    return;
                }

                case 'reset_playground': {
                    resetPlayground();
                    result.applied.push('playground reset');
                    return;
                }

                default:
                    result.rejected.push(`unsupported action "${String(action.type)}"`);
            }
        });

        return result;
    }

    // Send message to AI
    // Send message
    async function sendMessage() {
        const question = inputEl.value.trim();
        if (!question || isLoading) return;

        inputText = question;
        isLoading = true;
        inputEl.value = '';

        // Add user message to history and render immediately
        chatHistory.push({ role: 'user', content: question });
        renderHistory();

        // Show loading indicator after user message

        // Show loading indicator after user message
        // Show loading indicator after user message
        const randomNum = Math.floor(Math.random() * 20) + 1;
        // On error, increment number and try next (loops 1-20)
        const onErrorScript = "let next = (parseInt(this.dataset.index) % 20) + 1; this.dataset.index = next; this.src = '/assets/thinking/' + next + '.gif';";

        responseEl.innerHTML += `<div class="ai-chat__loading"><img class="ai-chat__thinking" src="/assets/thinking/${randomNum}.gif" data-index="${randomNum}" onerror="${onErrorScript}" alt="thinking"></div>`;
        responseEl.scrollTop = responseEl.scrollHeight;

        try {
            let response;
            try {
                response = await fetch('/api/ai-chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(buildChatRequestPayload())
                });
            } catch (networkError) {
                console.warn('First attempt failed, retrying...', networkError);
                // Simple retry logic for "Load failed" or network issues
                await new Promise(resolve => setTimeout(resolve, 1000));
                response = await fetch('/api/ai-chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(buildChatRequestPayload())
                });
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const aiResponseRaw = data.choices?.[0]?.message?.content || 'No response';
            const { cleanText, actions, hadActionTag } = extractAppActions(aiResponseRaw);
            const actionResults = runAppActions(actions);

            let assistantText = cleanText;
            if (actionResults.applied.length > 0) {
                const appliedText = `Applied: ${actionResults.applied.join(', ')}.`;
                assistantText = assistantText ? `${assistantText}\n\n${appliedText}` : appliedText;
            }

            if (actionResults.rejected.length > 0) {
                const rejectedText = `Ignored action${actionResults.rejected.length > 1 ? 's' : ''}: ${actionResults.rejected.join('; ')}.`;
                assistantText = assistantText ? `${assistantText}\n\n${rejectedText}` : rejectedText;
            }

            if (!assistantText && hadActionTag) {
                assistantText = 'Done.';
            } else if (!assistantText) {
                assistantText = aiResponseRaw;
            }

            // Add assistant response to history and re-render
            chatHistory.push({ role: 'assistant', content: assistantText });
            renderHistory();

        } catch (error) {
            console.error('AI Chat error:', error);
            // Add error as assistant message
            chatHistory.push({ role: 'assistant', content: 'Error: ' + error.message });
            renderHistory();
        }

        isLoading = false;
        inputEl.focus();
    }

    // Handle input events
    inputEl.addEventListener('keydown', (e) => {
        // Enter to send
        if (e.key === 'Enter' && inputEl.value.trim()) {
            e.preventDefault();
            sendMessage();
            return;
        }

        // Escape to close
        if (e.key === 'Escape') {
            e.preventDefault();
            deactivate();
            return;
        }

        if (e.key === 'Backspace' && inputEl.value === '') {
            e.preventDefault();
            deactivate();
            return;
        }

        // Arrow keys for suggestions
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();

            // If starting fresh or index out of bounds, reset
            if (suggestionIndex === -1) {
                suggestionIndex = 0;
            } else {
                if (e.key === 'ArrowUp') {
                    suggestionIndex = (suggestionIndex - 1 + SUGGESTED_QUESTIONS.length) % SUGGESTED_QUESTIONS.length;
                } else {
                    suggestionIndex = (suggestionIndex + 1) % SUGGESTED_QUESTIONS.length;
                }
            }

            inputEl.value = SUGGESTED_QUESTIONS[suggestionIndex];
            // Move cursor to end
            setTimeout(() => {
                inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
            }, 0);
            return;
        }
    });

    // Document-level Escape to close (when showing response)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Backquote') {
            e.preventDefault();
            isActive ? deactivate() : activate();
            return;
        }

        if (e.key === 'Escape' && isActive) {
            deactivate();
            return;
        }

        if (!isActive || e.target === inputEl) {
            return;
        }

        if (e.key === 'Backspace') {
            e.preventDefault();
            deactivate();
            return;
        }

        if (isPlainTypingKey(e)) {
            e.preventDefault();
            focusInputAndAppend(e.key);
            return;
        }


    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay && !isLoading) {
            deactivate();
        }
    });

    // Close button click handler
    const closeBtn = overlay.querySelector('.ai-chat__close-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent overlay click
        deactivate();
    });

    // Global click handler for chat triggers (using delegation for dynamic content)
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.console-button, .trigger-ai-chat, a[href="#chat"]');
        if (trigger) {
            e.preventDefault();
            activate();
        }
    });

})();
