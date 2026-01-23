/* =================================================================
   THEME TOGGLE
   Handles theme switching and persistence
   ================================================================= */

(function () {
    const toggle = document.getElementById('themeToggle');
    const root = document.documentElement;

    // Check for saved preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Set initial theme
    if (savedTheme) {
        root.setAttribute('data-theme', savedTheme);
    } else if (systemPrefersDark) {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.setAttribute('data-theme', 'light');
    }

    // Toggle theme on click
    toggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
})();
