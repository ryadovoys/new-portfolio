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
        <div class="ai-chat__hint">Enter to send · Esc to close</div>
        <div class="ai-chat__text-wrapper">
            <span class="ai-chat__text"></span><span class="ai-chat__cursor"></span>
        </div>
        <div class="ai-chat__history"></div>
    `;
    document.body.appendChild(overlay);


    const textEl = overlay.querySelector('.ai-chat__text');
    const cursorEl = overlay.querySelector('.ai-chat__cursor');
    const historyEl = overlay.querySelector('.ai-chat__history');

    // Activate overlay (start typing)
    function activate() {
        if (isActive) return;
        isActive = true;
        inputText = '';
        showingResponse = false;
        textEl.textContent = '';
        cursorEl.style.display = 'inline-block';
        overlay.classList.add('active');
        document.body.classList.add('ai-chat-active');
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
        textEl.textContent = '';
        historyEl.innerHTML = '';
        chatHistory = []; // Reset history on close checking "session"
    }

    function startTyping() {
        showingResponse = false;
        cursorEl.style.display = 'inline-block';
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

    // Thinking animations - random one is shown while AI is processing
    const THINKING_ANIMATIONS = [
        '/assets/thinking/1.gif',
        '/assets/thinking/2.gif',
        '/assets/thinking/3.gif',
        '/assets/thinking/4.gif',
        '/assets/thinking/5.gif',
        '/assets/thinking/6.gif',
        '/assets/thinking/7.gif'
    ];

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

    // Render conversation history in sidebar
    function renderHistory() {
        historyEl.innerHTML = chatHistory.map(msg => {
            const isUser = msg.role === 'user';
            let content = msg.content
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

            // Parse assets for small thumbnails in history
            content = content.replace(/\(asset:(\w+)\)/g, (match, assetKey) => {
                const asset = ASSETS[assetKey.toLowerCase()];
                if (!asset) return '';
                if (asset.type === 'video') {
                    return `<video class="ai-chat__history-video" src="${asset.src}" autoplay loop muted playsinline></video>`;
                }
                return `<img class="ai-chat__history-img" src="${asset.src}" alt="${assetKey}">`;
            });

            return `<div class="ai-chat__history-msg ai-chat__history-msg--${isUser ? 'user' : 'assistant'}">${content}</div>`;
        }).join('');

        // Scroll to bottom
        historyEl.scrollTop = historyEl.scrollHeight;
    }

    // Send message to AI
    async function sendMessage() {
        if (!inputText.trim() || isLoading) return;

        const question = inputText;
        isLoading = true;
        showingResponse = true;

        // Clear input and show random thinking animation
        const randomAnim = THINKING_ANIMATIONS[Math.floor(Math.random() * THINKING_ANIMATIONS.length)];
        textEl.innerHTML = `<img class="ai-chat__thinking" src="${randomAnim}" alt="thinking">`;
        cursorEl.style.display = 'none';
        inputText = '';

        // Add user message to history
        chatHistory.push({ role: 'user', content: question });
        renderHistory();

        // Log payload to debug
        console.log('Sending payload:', JSON.stringify({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...chatHistory
            ]
        }));

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

            // Add assistant response to history
            chatHistory.push({ role: 'assistant', content: aiResponse });
            renderHistory();

            // 1. Parse Markdown links: [text](url) -> <a href="url" target="_blank">text</a>
            let formattedResponse = aiResponse
                .replace(/</g, '&lt;') // Simple XSS prevention for non-link tags
                .replace(/>/g, '&gt;')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

            // 2. Parse Inline Assets: (asset:name)
            formattedResponse = formattedResponse.replace(/\(asset:(\w+)\)/g, (match, assetKey) => {
                const asset = ASSETS[assetKey.toLowerCase()];
                if (!asset) return ''; // Hide invalid assets

                if (asset.type === 'video') {
                    return `<div class="ai-chat__media-block"><video src="${asset.src}" autoplay loop muted playsinline></video></div>`;
                } else {
                    return `<div class="ai-chat__media-block"><img src="${asset.src}" alt="${assetKey}"></div>`;
                }
            });

            textEl.innerHTML = formattedResponse;

        } catch (error) {
            console.error('AI Chat error:', error);
            textEl.textContent = 'Error: ' + error.message;
        }

        isLoading = false;
    }

    // Handle keydown events
    document.addEventListener('keydown', (e) => {
        // Ignore if in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        // Escape to close
        if (e.key === 'Escape') {
            deactivate();
            return;
        }

        // Don't allow typing while loading
        if (isLoading) {
            e.preventDefault();
            return;
        }

        // Enter to send
        if (e.key === 'Enter' && isActive && inputText.trim()) {
            e.preventDefault();
            sendMessage();
            return;
        }

        // Backspace
        if (e.key === 'Backspace' && isActive && !showingResponse) {
            e.preventDefault();
            inputText = inputText.slice(0, -1);
            textEl.textContent = inputText;
            if (inputText.length === 0) {
                deactivate();
            }
            return;
        }

        // Printable characters - activate and type
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();

            // If showing response, clear it and start new input
            if (showingResponse) {
                startTyping();
                inputText = '';
                textEl.textContent = '';
            }

            if (!isActive) {
                activate();
            }

            inputText += e.key;
            textEl.textContent = inputText;
        }
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay && !isLoading) {
            deactivate();
        }
    });

})();
