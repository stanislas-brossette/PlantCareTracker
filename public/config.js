(function(){
    const DEFAULT_BASE = (() => {
        const origin = window.location.port === '2000'
            ? window.location.origin
            : `http://${window.location.hostname}:2000`;
        return `${origin}/api`;
    })();

    const storedBase = localStorage.getItem('plantcare_api_base');
    window.API_BASE = storedBase || DEFAULT_BASE;

    window.apiConfig = {
        getBase(){
            return window.API_BASE;
        },
        setBase(base){
            if (base){
                window.API_BASE = base;
                localStorage.setItem('plantcare_api_base', base);
            } else {
                window.API_BASE = DEFAULT_BASE;
                localStorage.removeItem('plantcare_api_base');
            }
            return window.API_BASE;
        }
    };
})();
