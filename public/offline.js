(function(){
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.textContent = 'Offline – read only';
    banner.style.display = 'none';
    document.addEventListener('DOMContentLoaded', () => {
        document.body.prepend(banner);
        update();
    });

    function update(){
        const offline = !navigator.onLine;
        banner.style.display = offline ? 'block' : 'none';
        document.documentElement.classList.toggle('offline-mode', offline);
        document.dispatchEvent(new CustomEvent('offline-state-changed', { detail: { offline } }));
    }

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
})();
