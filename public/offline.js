(function(){
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.textContent = 'Offline mode: data is read-only and actions are disabled.';
    document.addEventListener('DOMContentLoaded', () => {
        document.body.prepend(banner);
        applyState();
    });

    let offline = !navigator.onLine;

    function setOffline(state){
        offline = state;
        document.body.classList.toggle('offline', offline);
        banner.hidden = !offline;
        document.querySelectorAll('[data-offline-disabled]').forEach(el => {
            el.disabled = offline;
            el.classList.toggle('offline-disabled', offline);
        });
    }

    function applyState(){
        setOffline(offline);
    }

    window.appOffline = {
        isOffline: () => offline,
        setOffline,
    };

    window.addEventListener('online', () => setOffline(false));
    window.addEventListener('offline', () => setOffline(true));

    if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'offline-mode') {
                setOffline(true);
            }
            if (event.data?.type === 'online-mode') {
                setOffline(false);
            }
        });
    }

    window.addEventListener('app:offline', () => setOffline(true));
    window.addEventListener('app:online', () => setOffline(false));
})();
