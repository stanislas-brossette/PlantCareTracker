(function(){
    let offline = !navigator.onLine;
    const listeners = new Set();
    let banner;

    function ensureBanner(){
        if (banner) return banner;
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.textContent = 'Offline (read-only)';
        banner.className = 'offline-banner';
        banner.style.display = 'none';
        document.body.prepend(banner);
        return banner;
    }

    function render(){
        if (!banner) return;
        banner.style.display = offline ? 'block' : 'none';
    }

    function setOffline(){
        offline = true;
        ensureBanner();
        render();
        listeners.forEach(fn => fn(true));
    }

    function setOnline(){
        offline = false;
        ensureBanner();
        render();
        listeners.forEach(fn => fn(false));
    }

    document.addEventListener('DOMContentLoaded', () => {
        ensureBanner();
        render();
    });

    window.addEventListener('online', () => setOnline());
    window.addEventListener('offline', () => setOffline());

    window.offlineUI = {
        isOffline: () => offline,
        markOffline: () => setOffline(),
        markOnline: () => setOnline(),
        showReadOnlyMessage: () => alert('Unavailable offline (read-only)'),
        onStatusChange(cb){
            listeners.add(cb);
            cb(offline);
            return () => listeners.delete(cb);
        }
    };
})();
