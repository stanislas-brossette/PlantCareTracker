(function(){
    const OFFLINE_MESSAGE = 'Unavailable offline (read-only)';
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.className = 'offline-banner d-none';
    banner.textContent = 'Offline (read-only)';
    document.body.prepend(banner);

    const toast = document.createElement('div');
    toast.id = 'offline-toast';
    toast.className = 'offline-toast d-none';
    toast.textContent = OFFLINE_MESSAGE;
    document.body.appendChild(toast);

    let isOffline = !navigator.onLine;
    const offlineTargets = new Set();

    function showToast(){
        toast.classList.remove('d-none');
        toast.classList.add('show');
        setTimeout(() => toast.classList.add('d-none'), 2000);
    }

    function collectTargets(){
        document.querySelectorAll('[data-offline-disabled]').forEach(el => offlineTargets.add(el));
    }

    function applyState(){
        collectTargets();
        banner.classList.toggle('d-none', !isOffline);
        offlineTargets.forEach(el => {
            const tag = el.tagName.toLowerCase();
            if (isOffline){
                el.classList.add('offline-disabled');
                el.setAttribute('aria-disabled', 'true');
                if (tag === 'button' || tag === 'input' || tag === 'select') {
                    if (!el.dataset._offlineLocked){
                        el.dataset._offlineLocked = el.disabled ? 'persist' : 'temp';
                    }
                    el.disabled = true;
                }
            } else {
                el.classList.remove('offline-disabled');
                el.removeAttribute('aria-disabled');
                if (el.dataset._offlineLocked === 'temp') {
                    el.disabled = false;
                }
                delete el.dataset._offlineLocked;
            }
        });
    }

    function setOffline(reason){
        isOffline = true;
        banner.dataset.reason = reason || 'offline';
        applyState();
    }

    function setOnline(){
        isOffline = false;
        applyState();
    }

    document.addEventListener('click', (evt) => {
        if (!isOffline) return;
        const target = evt.target.closest('[data-offline-disabled]');
        if (target){
            evt.preventDefault();
            evt.stopPropagation();
            showToast();
        }
    }, true);

    window.addEventListener('offline', () => setOffline('navigator'));
    window.addEventListener('online', () => setOnline());

    window.offlineUI = {
        setOffline,
        setOnline,
        refresh: applyState,
        isOffline: () => isOffline,
        notifyIfOffline: () => { if (isOffline) showToast(); }
    };

    applyState();
})();
