
document.addEventListener('DOMContentLoaded', () => {
    const resumeLink = document.querySelector('.sidebar__nav-link--resume');
    const modal = document.getElementById('resumePreviewModal');
    const closeBtn = document.querySelector('.modal__close');
    const downloadBtn = document.querySelector('.modal__download-btn');
    const cancelBtn = document.querySelector('.modal__cancel-btn');
    const modalBackdrop = document.querySelector('.modal__backdrop');

    if (!resumeLink || !modal) return;

    // Open Modal
    resumeLink.addEventListener('click', (e) => {
        e.preventDefault();

        // Check screen size - if mobile, might be better to just let it download/open normally
        // But for now, we force modal as requested

        modal.classList.add('modal--active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling background
    });

    // Close Modal Function
    const closeModal = () => {
        modal.classList.remove('modal--active');
        document.body.style.overflow = '';
    };

    // Close Event Listeners
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modalBackdrop?.addEventListener('click', closeModal);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('modal--active')) {
            closeModal();
        }
    });

    // Download Action
    downloadBtn?.addEventListener('click', () => {
        // Trigger the actual download
        const url = resumeLink.getAttribute('href');
        const link = document.createElement('a');
        link.href = url;
        link.download = ''; // Force download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        closeModal();
    });
});
