(function(){
    const TIMEOUT_MS = 5000;
    const originalFetch = window.fetch.bind(window);
    const STORAGE_KEY = 'plantcare_api_base';

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        // ignore cleanup failures
    }

    window.fetch = async function(input, init){
        const controller = new AbortController();
        const mergedInit = { ...(init || {}) };
        if (init?.signal) {
            if (init.signal.aborted) controller.abort();
            init.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        mergedInit.signal = controller.signal;

        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await originalFetch(input, mergedInit);
            window.offlineUI?.setOnline();
            return response;
        } catch (err) {
            window.offlineUI?.setOffline('unreachable');
            throw err;
        } finally {
            clearTimeout(timer);
        }
    };

    window.API_BASE = window.location.origin;
    window.apiConfig = {
        getBase: () => window.location.origin,
        getDefaultBase: () => window.location.origin,
        getStoredBase: () => '',
        setBase: () => window.location.origin,
    };
})();
