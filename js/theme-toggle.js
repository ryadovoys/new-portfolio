/* =================================================================
   THEME TOGGLE
   Handles theme switching and persistence across multiple buttons
   ================================================================= */

(function () {
    const toggles = document.querySelectorAll('.theme-toggle');
    const root = document.documentElement;
    // We update arms individually per button structure

    if (toggles.length === 0) return;

    // Check for saved preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let currentTheme = 'light';
    if (savedTheme) {
        currentTheme = savedTheme;
    } else if (systemPrefersDark) {
        currentTheme = 'dark';
    }

    // Initialize state
    root.setAttribute('data-theme', currentTheme);

    // Initial rotation state
    // We track rotation per button? Or globally?
    // Globally makes sense for sync, but visual continuity might be per button?
    // Let's use one global 'rotation' value and apply to all arms.
    let currentRotation = currentTheme === 'dark' ? 180 : 0;

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
    }

    // Apply strict initial state
    updateUI();

    // Toggle theme function
    function toggleTheme() {
        const isDark = root.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';

        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Continuous clockwise rotation
        currentRotation += 180;
        updateUI();
    }

    // Bind click to all buttons
    toggles.forEach(btn => {
        btn.addEventListener('click', toggleTheme);
    });

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newSystemTheme = e.matches ? 'dark' : 'light';
            root.setAttribute('data-theme', newSystemTheme);

            currentRotation = newSystemTheme === 'dark' ? 180 : 0;
            updateUI();
        }
    });

    // Expose toggle function if needed by other scripts (e.g. keyboard shortcuts)
    window.toggleThemeGlobal = toggleTheme;
})();
