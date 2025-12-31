
/*
 * js/offlineState.js
 * Handles offline detection and global UI states for read-only mode.
 */

export function initOfflineState() {
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.textContent = 'Offline - Read Only';
    document.body.prepend(banner);

    const updateState = () => {
        if (navigator.onLine) {
            document.body.classList.remove('offline-mode');
        } else {
            document.body.classList.add('offline-mode');
        }
    };

    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);
    updateState(); // Init on load
}
