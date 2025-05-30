(function(){
    // Base URL of the backend API. Update if the server IP or port changes.
    window.API_BASE = window.API_BASE || 'http://192.168.1.20:3000';
    const origFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
        try {
            if (typeof input === 'string' && input.startsWith('/')) {
                input = window.API_BASE + input;
            } else if (input instanceof Request && input.url.startsWith('/')) {
                input = new Request(window.API_BASE + input.url, input);
            }
        } catch (e) {
            // ignore and fall back to original input
        }
        return origFetch(input, init);
    };
})();
