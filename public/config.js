(function(){
    const STORAGE_KEY = 'plantcare_api_base';

    function normalizeBase(input){
        if (!input) return '';
        let base = input.trim();
        if (!base) return '';
        if (!/^https?:\/\//i.test(base)) {
            base = `${window.location.protocol}//${base}`;
        }
        try {
            const url = new URL(base);
            return `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
        } catch (e){
            return '';
        }
    }

    const origin = window.location.origin;
    const localhostApi = `${window.location.protocol}//${window.location.hostname}:2000`;
    const isBackendOrigin = window.location.port === '2000';
    const defaultBase = isBackendOrigin ? origin : localhostApi;
    const storedBase = normalizeBase(localStorage.getItem(STORAGE_KEY) || '');

    function setBase(input){
        const normalized = normalizeBase(input);
        if (input && !normalized) {
            return null;
        }
        if (normalized) {
            localStorage.setItem(STORAGE_KEY, normalized);
            window.API_BASE = normalized;
            return normalized;
        }
        localStorage.removeItem(STORAGE_KEY);
        window.API_BASE = defaultBase;
        return window.API_BASE;
    }

    window.API_BASE = window.API_BASE || storedBase || defaultBase;
    window.apiConfig = {
        getBase: () => window.API_BASE,
        getDefaultBase: () => defaultBase,
        getStoredBase: () => localStorage.getItem(STORAGE_KEY) || '',
        setBase,
    };

    function withTimeout(promise, ms){
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        return Promise.race([
            promise(controller),
            Promise.reject(Object.assign(new Error('timeout'), { name: 'AbortError' }))
        ]).finally(() => clearTimeout(timer));
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async function(input, init){
        let requestUrl = input;
        if (typeof input === 'string' && input.startsWith('/')) {
            requestUrl = window.API_BASE + input;
        } else if (input instanceof Request && input.url.startsWith('/')) {
            requestUrl = new Request(window.API_BASE + new URL(input.url, window.location.origin).pathname, input);
        }

        try {
            const result = await withTimeout(
                (controller) => originalFetch(requestUrl, { ...(init || {}), signal: controller.signal }),
                5000
            );
            window.offlineUI?.setOnline();
            return result;
        } catch (err) {
            window.offlineUI?.setOffline('unreachable');
            throw err;
        }
    };
})();
