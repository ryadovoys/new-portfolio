document.addEventListener('DOMContentLoaded', () => {
    const shareLink = document.getElementById('shareLink');
    if (!shareLink) return;

    // Define fallback function outside to be clean
    async function copyToClipboard(text) {
        // 1. Try Modern Clipboard API (Requires Secure Context or Localhost)
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.warn('Clipboard API failed', err);
            }
        }

        // 2. Legacy Fallback (Hidden Textarea)
        // Works in most non-secure contexts (http dev servers)
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;

            // Ensure invisible but part of DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) return true;
        } catch (err) {
            console.error('Legacy copy failed', err);
        }

        return false;
    }

    // Feedback UI
    function showCopiedFeedback() {
        const label = shareLink.querySelector('span');
        if (!label) return;

        const originalText = label.textContent;
        label.textContent = 'Copied!';
        // Force opacity/color/style if needed?
        // shareLink.classList.add('is-copied');

        setTimeout(() => {
            label.textContent = originalText;
            // shareLink.classList.remove('is-copied');
        }, 2000);
    }

    // Event Listener
    shareLink.addEventListener('click', async (e) => {
        e.preventDefault();

        const shareData = {
            title: 'Sergey Ryadovoy — Design Leader',
            text: 'Check out this portfolio.',
            url: window.location.href
        };

        // Try Native Share
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                // Success (or user cancelled, which often doesn't throw or throws generic)
                return;
            } catch (err) {
                console.log('Native share failed/cancelled, falling back to copy.', err);
                // Continue to Copy Fallback? 
                // Usually if user CANCELS, we shouldn't Auto-Copy.
                // But if it FAILS (not supported error), we should.
                // It's hard to distinguish. Let's just return if it was a user event, 
                // but navigator.share usually only exists if supported.

                // If the error is "AbortError", user cancelled.
                if (err.name === 'AbortError') return;
            }
        }

        // Fallback: Copy Link
        const success = await copyToClipboard(window.location.href);
        if (success) {
            showCopiedFeedback();
        } else {
            prompt('Copy this link:', window.location.href);
        }
    });
});
