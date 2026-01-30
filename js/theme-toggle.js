/* =================================================================
   THEME TOGGLE
   Handles theme switching and persistence
   ================================================================= */

(function () {
    const toggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    const orbitArm = document.querySelector('.orbit-arm');

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

    // Set initial rotation (0 for light/right, 180 for dark/left)
    // We keep track of total rotation to ensure it always goes forward (clockwise)
    let currentRotation = currentTheme === 'dark' ? 180 : 0;
    if (orbitArm) {
        orbitArm.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
    }

    // Toggle theme on click
    toggle.addEventListener('click', () => {
        const isDark = root.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';

        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Continuous clockwise rotation
        currentRotation += 180;
        if (orbitArm) {
            orbitArm.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
        }
    });

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newSystemTheme = e.matches ? 'dark' : 'light';
            root.setAttribute('data-theme', newSystemTheme);

            // Sync rotation to system change if user hasn't overridden
            // We just ensure it snaps to the "correct" orientation relative to 0 or 180 mod 360?
            // Or just animate to the nearest valid state.
            // For simplicity, let's just match the theme state distantly.
            currentRotation = newSystemTheme === 'dark' ? 180 : 0;
            if (orbitArm) {
                orbitArm.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
            }
        }
    });
})();
