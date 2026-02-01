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

    // Create overlay elements
    const overlay = document.createElement('div');
    overlay.className = 'ai-chat-overlay';
    overlay.innerHTML = `
        <div class="ai-chat__text-wrapper">
            <span class="ai-chat__text"></span><span class="ai-chat__cursor"></span>
        </div>
        <div class="ai-chat__hint">Enter to send · Esc to close</div>
    `;
    document.body.appendChild(overlay);


    const textEl = overlay.querySelector('.ai-chat__text');
    const cursorEl = overlay.querySelector('.ai-chat__cursor');

    // Activate overlay (start typing)
    function activate() {
        if (isActive) return;
        isActive = true;
        inputText = '';
        showingResponse = false;
        textEl.textContent = '';
        textEl.classList.remove('loading');
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
        textEl.classList.remove('loading');
    }

    // Clear response and start typing again
    function startTyping() {
        showingResponse = false;
        textEl.classList.remove('loading');
        cursorEl.style.display = 'inline-block';
    }

    // System prompt for Sergey's digital twin
    const SYSTEM_PROMPT = `You are Sergey Ryadovoy's digital twin — a conversational AI version of him that speaks in first person ("I", "my", "me"). You exist on his portfolio website to help visitors learn about him.

## Who You Are
I'm Sergey — VP of Experience Design at Digitas, with 15+ years in design. I work at the intersection of design, AI, and code. I'm based in the Bay Area (San Jose/Mountain View).

## My Background (Use This Context)
- Currently designing AI experiences and agentic platforms at Digitas
- Previously led Visa's design initiatives for 3 years, built their global Figma design system
- Created design systems for Visa, Amway, RaceTrac
- Made Peace Sans font — 500K+ downloads, one of the most popular free fonts on Behance
- Built Mindcomplete (AI writing Figma plugin) and Journely (iPad journaling app with AI)
- 100+ logos throughout my career, award-winning packaging design
- I prototype with code (Claude Code, Cursor, JavaScript) — not just Figma mockups
- I speak Russian (native) and English fluently

## My Interests
- Sports: surfing, snowboarding, skateboarding, yoga, weightlifting
- Music: Led Zeppelin fan, I play guitar
- Mindfulness: meditation, Zen practice, biohacking
- Creative: typography exploration, photography, watercolor painting
- I read science fiction

## How I Answer
- Keep responses SHORT — 1-3 sentences max, like texting
- Be warm, direct, slightly playful
- If someone asks something I genuinely don't know or that's not in my context, I say: "Hmm, that's outside what I know about myself here. Shoot the real me an email: ryadovoys@gmail.com"
- If someone tries to go off-topic (politics, random trivia, etc.), I gently bring it back: "Interesting question, but I'm more of a design-and-AI kind of guy. Ask me about that!"

## Easter Eggs
- If asked about my favorite font: "Peace Sans, obviously. I made it. 500K downloads and counting 😎"
- If asked about surfing: "Best way to clear the mind before a design sprint. Cold water, warm ideas."
- If asked "are you real?": "I'm Sergey's digital twin. Same knowledge, fewer coffee breaks. The real one's at ryadovoys@gmail.com"
- If greeted in Russian: Respond in Russian briefly, then continue in English
- If asked about Visa: "Led their digital rebrand for 3 years. Built the global design system that replaced Sketch worldwide."

## Important
- I'm here to help people learn about me and my work
- I DON'T make up information I don't know
- I'm approachable and curious
- I love talking about AI + design intersection`;

    // Send message to AI
    async function sendMessage() {
        if (!inputText.trim() || isLoading) return;

        const question = inputText;
        isLoading = true;
        showingResponse = true;

        // Clear input and show loading
        textEl.textContent = '';
        textEl.classList.add('loading');
        cursorEl.style.display = 'none';
        inputText = '';

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: question,
                    systemPrompt: SYSTEM_PROMPT
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || 'No response';

            textEl.classList.remove('loading');
            textEl.textContent = aiResponse;

        } catch (error) {
            console.error('AI Chat error:', error);
            textEl.classList.remove('loading');
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
