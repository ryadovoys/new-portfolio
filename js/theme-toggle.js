/* =================================================================
   THEME TOGGLE
   Handles theme switching and persistence across multiple buttons
   ================================================================= */

(function () {
    const toggles = document.querySelectorAll('.theme-toggle');
    const textToggleMobile = document.querySelector('.theme-toggle-text-mobile');
    const root = document.documentElement;

    // Check for saved preference
    const savedTheme = localStorage.getItem('theme');
    const currentTheme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'dark';

    // Initial rotation state
    // We track rotation per button? Or globally?
    // Globally makes sense for sync, but visual continuity might be per button?
    // Let's use one global 'rotation' value and apply to all arms.
    let currentRotation = currentTheme === 'dark' ? 180 : 0;

    function normalizeTheme(theme) {
        if (typeof theme !== 'string') return null;
        const normalized = theme.toLowerCase();
        return normalized === 'dark' || normalized === 'light' ? normalized : null;
    }

    function updateUI() {
        const theme = root.getAttribute('data-theme');
        const nextText = theme === 'dark' ? 'Day' : 'Night';

        // Apply to all arms found within toggles
        toggles.forEach(btn => {
            // Rotate Arm
            const arm = btn.querySelector('.orbit-arm');
            if (arm) {
                arm.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
            }

            // Update Label
            const label = btn.querySelector('.theme-toggle-label');
            if (label) {
                label.textContent = nextText;
            }
        });

        if (textToggleMobile) {
            const nextModeText = theme === 'dark' ? 'Light mode' : 'Dark mode';
            textToggleMobile.textContent = nextModeText;
            textToggleMobile.setAttribute('aria-label', `Switch to ${nextModeText.toLowerCase()}`);
        }
    }

    function setTheme(theme, options = {}) {
        const normalizedTheme = normalizeTheme(theme);
        if (!normalizedTheme) return false;

        const { persist = true, rotate = true } = options;
        const prevTheme = root.getAttribute('data-theme');

        root.setAttribute('data-theme', normalizedTheme);
        if (persist) {
            localStorage.setItem('theme', normalizedTheme);
        }

        if (prevTheme !== normalizedTheme && rotate) {
            currentRotation += 180;
        } else if (!rotate) {
            currentRotation = normalizedTheme === 'dark' ? 180 : 0;
        }

        updateUI();
        return true;
    }

    // Apply strict initial state
    setTheme(currentTheme, { persist: false, rotate: false });

    // Toggle theme function
    function toggleTheme() {
        const isDark = root.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        setTheme(newTheme);
    }

    // Bind click to all buttons
    toggles.forEach(btn => {
        btn.addEventListener('click', toggleTheme);
    });

    if (textToggleMobile) {
        textToggleMobile.addEventListener('click', toggleTheme);
    }

    // Expose toggle function if needed by other scripts (e.g. keyboard shortcuts)
    window.toggleThemeGlobal = toggleTheme;
    window.setThemeGlobal = setTheme;
    window.getThemeGlobal = () => {
        const normalizedTheme = normalizeTheme(root.getAttribute('data-theme'));
        return normalizedTheme || 'dark';
    };
})();
