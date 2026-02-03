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
    let suggestionIndex = -1;

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
        <div class="ai-chat__close-btn" aria-label="Close AI Chat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </div>
        <div class="ai-chat__response-area"></div>
        <div class="ai-chat__input-bar">
            <span class="ai-chat__prompt">&gt;</span>
            <input type="text" class="ai-chat__input" placeholder="What's on your mind?" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>
        </div>
        <div class="ai-chat__footer">
            <a href="/assets/sergey-ryadovoy-context.md" download class="ai-chat__context-link">Download Sergey's Context</a>
            <span class="ai-chat__hint">Press up or down key for suggestions</span>
        </div>
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

        // Initial welcome message (only if history is empty)
        if (chatHistory.length === 0) {
            const welcomeMsg = "Hello! My name is Snow. I'm Sergey's cat. He's not home right now. I don't know where he is, but I hope he comes back soon. I've been watching him work a lot, though, so I can tell you more about him and what he's doing. Feel free to ask me anything. I'll do my best to help you out. Meow.";
            chatHistory.push({ role: 'assistant', content: welcomeMsg });
        }

        // Always render history (restored or new)
        renderHistory();

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
    fetch('/assets/sergey-ryadovoy-context.md')
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
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            ...chatHistory
                        ]
                    })
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
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            ...chatHistory
                        ]
                    })
                });
            }

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
