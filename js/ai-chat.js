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
    let chatHistory = [];

    // Create overlay elements
    const overlay = document.createElement('div');
    overlay.className = 'ai-chat-overlay';
    overlay.innerHTML = `
        <div class="ai-chat__response-area"></div>
        <div class="ai-chat__input-bar">
            <span class="ai-chat__prompt">&gt;</span>
            <input type="text" class="ai-chat__input" placeholder="What's on your mind?" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>
        <a href="/assets/sergey-ryadovoy-digital-twin-context.md" download class="ai-chat__context-link">Download Sergey's Context</a>
    `;
    document.body.appendChild(overlay);


    const inputEl = overlay.querySelector('.ai-chat__input');
    const responseEl = overlay.querySelector('.ai-chat__response-area');

    // Activate overlay (start typing)
    function activate() {
        if (isActive) return;
        isActive = true;
        inputText = '';
        showingResponse = false;
        inputEl.value = '';
        overlay.classList.add('active');
        document.body.classList.add('ai-chat-active');

        // Initial welcome message
        if (chatHistory.length === 0) {
            const welcomeMsg = "Hello! I'm Sergey's cat Snow. He is out now, but I've been watching him work a lot, so if you want to know anything about him, please ask me and I'll try to do my best to help you. Meow.";
            chatHistory.push({ role: 'assistant', content: welcomeMsg });
            renderHistory();
        }

        // Focus input after a short delay to ensure overlay is visible
        setTimeout(() => inputEl.focus(), 100);
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
        responseEl.innerHTML = '';
        chatHistory = []; // Reset history on close
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
                html += `<div class="ai-chat__line ai-chat__line--assistant"><span class="ai-chat__avatar-wrap"><img class="ai-chat__avatar" src="/assets/terminal-me.png" alt=""></span><span class="ai-chat__content">${content}</span></div>`;
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

    // Fetch system prompt
    fetch('/assets/sergey-ryadovoy-digital-twin-context.md')
        .then(response => response.text())
        .then(text => {
            SYSTEM_PROMPT = text;
        })
        .catch(err => {
            console.error('Failed to load system prompt:', err);
            // Fallback prompt if fetch fails
            SYSTEM_PROMPT = `You are Sergey Ryadovoy's digital twin. You speak in first person. You are a Design VP at Digitas.`;
        });

    // Send message to AI
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
        const randomNum = Math.floor(Math.random() * 20) + 1;
        // On error, increment number and try next (loops 1-20)
        const onErrorScript = "let next = (parseInt(this.dataset.index) % 20) + 1; this.dataset.index = next; this.src = '/assets/thinking/' + next + '.gif';";

        responseEl.innerHTML += `<div class="ai-chat__loading"><img class="ai-chat__thinking" src="/assets/thinking/${randomNum}.gif" data-index="${randomNum}" onerror="${onErrorScript}" alt="thinking"></div>`;
        responseEl.scrollTop = responseEl.scrollHeight;

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...chatHistory
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || 'No response';

            // Add assistant response to history and re-render
            chatHistory.push({ role: 'assistant', content: aiResponse });
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

        // Backspace on empty input closes
        if (e.key === 'Backspace' && inputEl.value === '') {
            e.preventDefault();
            deactivate();
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

        // Start typing to activate (desktop only)
        if (!isActive && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Ignore if in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            e.preventDefault();
            activate();
            // Add the typed character to input
            setTimeout(() => {
                inputEl.value = e.key;
            }, 100);
        }
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay && !isLoading) {
            deactivate();
        }
    });

    // Console button click handler (both desktop and mobile)
    const consoleButtons = document.querySelectorAll('.console-button');
    consoleButtons.forEach(button => {
        button.addEventListener('click', () => {
            activate();
        });
    });

})();
