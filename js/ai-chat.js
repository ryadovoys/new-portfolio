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
    const CONTEXT_FILES = [
        '/assets/sergey-ryadovoy-context-2.md',
        '/assets/sergey-ryadovoy-context.md'
    ];
    const CHAT_HEIGHT_STORAGE_KEY = 'ai-chat-height-px';
    const CHAT_DEFAULT_HEIGHT_RATIO = 1 / 3;
    const CHAT_MIN_HEIGHT_RATIO = 0.24;
    const CHAT_MAX_HEIGHT_RATIO = 0.9;

    let chatHistory = [];
    let suggestionIndex = -1;
    let resizeState = null;

    const SUGGESTED_QUESTIONS = [
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
        "Who is Snow the cat?",
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

    function getSavedChatHeight() {
        try {
            const rawValue = localStorage.getItem(CHAT_HEIGHT_STORAGE_KEY);
            const parsed = Number(rawValue);
            return Number.isFinite(parsed) ? parsed : null;
        } catch (err) {
            console.warn('Could not read chat height from localStorage:', err);
            return null;
        }
    }

    function persistChatHeight(height) {
        try {
            localStorage.setItem(CHAT_HEIGHT_STORAGE_KEY, String(height));
        } catch (err) {
            console.warn('Could not persist chat height:', err);
        }
    }

    function applyChatHeight(nextHeight, options = {}) {
        const { persist = true } = options;
        const clamped = clampChatHeight(nextHeight);
        overlay.style.height = `${clamped}px`;
        if (persist) {
            persistChatHeight(clamped);
        }
        return clamped;
    }

    function initChatHeight() {
        const savedHeight = getSavedChatHeight();
        const initialHeight = Number.isFinite(savedHeight)
            ? savedHeight
            : getViewportHeight() * CHAT_DEFAULT_HEIGHT_RATIO;
        applyChatHeight(initialHeight, { persist: false });
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
        applyChatHeight(nextHeight, { persist: false });
    }

    function endResize(event) {
        if (!resizeState) return;
        if (event && event.pointerId !== undefined && event.pointerId !== resizeState.pointerId) return;

        const finalHeight = overlay.getBoundingClientRect().height;
        persistChatHeight(clampChatHeight(finalHeight));

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
        applyChatHeight(currentHeight, { persist: false });
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

    // Activate overlay (start typing)
    function activate() {
        if (isActive) return;
        isActive = true;
        inputText = '';
        showingResponse = false;
        inputEl.value = '';
        overlay.classList.add('active');
        document.body.classList.add('ai-chat-active');

        // Initial welcome message (only if history is empty)
        if (chatHistory.length === 0) {
            const welcomeMsg = "Hello! My name is Snow. I'm Sergey's cat. He's not home right now. I don't know where he is, but I hope he comes back soon. I've been watching him work a lot, though, so I can tell you more about him and what he's doing. Feel free to ask me anything. I'll do my best to help you out. Meow.";
            chatHistory.push({ role: 'assistant', content: welcomeMsg });
        }

        // Always render history (restored or new)
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
        'When a user asks to change website UI state, append exactly one block at the end of your message:',
        '<app-actions>{"actions":[{"type":"set_theme","theme":"dark"}]}</app-actions>',
        'Rules:',
        '- Allowed actions only: {"type":"set_theme","theme":"light|dark"} and {"type":"toggle_theme"}.',
        '- Never output CSS, JS, HTML, or any other action types.',
        '- If a request is unsupported, explain it in plain text and omit <app-actions>.',
        '- Keep normal conversational text outside the tag.'
    ].join('\n');

    async function loadContextFile() {
        if (contextLoadPromise) return contextLoadPromise;

        contextLoadPromise = (async () => {
            if (isContextLoading) return;
            isContextLoading = true;

            try {
                for (const path of CONTEXT_FILES) {
                    try {
                        const response = await fetch(path);
                        if (!response.ok) continue;
                        const text = await response.text();
                        if (!text || !text.trim()) continue;
                        SYSTEM_PROMPT = text;
                        return;
                    } catch (err) {
                        console.warn(`Context fetch failed for ${path}:`, err);
                    }
                }

                throw new Error('No context file could be loaded');
            } catch (err) {
                console.error('Failed to load context file:', err);
                SYSTEM_PROMPT = `You are Sergey Ryadovoy's digital twin. You speak in first person. You are a Design VP at Digitas.`;
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
            return !!window.setThemeGlobal(normalizedTheme);
        }

        document.documentElement.setAttribute('data-theme', normalizedTheme);
        try {
            localStorage.setItem('theme', normalizedTheme);
        } catch (err) {
            console.warn('Theme persistence failed:', err);
        }
        return true;
    }

    function toggleThemeFromChat() {
        if (typeof window.toggleThemeGlobal === 'function') {
            window.toggleThemeGlobal();
            const current = document.documentElement.getAttribute('data-theme');
            return normalizeThemeValue(current);
        }

        const currentTheme = normalizeThemeValue(document.documentElement.getAttribute('data-theme')) || 'dark';
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

            if (action.type === 'set_theme') {
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

            if (action.type === 'toggle_theme') {
                const theme = toggleThemeFromChat();
                if (theme) {
                    result.applied.push(`theme toggled to ${theme}`);
                } else {
                    result.rejected.push('failed to toggle theme');
                }
                return;
            }

            result.rejected.push(`unsupported action "${String(action.type)}"`);
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
