(function(){
    function parseBase(base){
        try {
            const url = new URL(base);
            return { host: url.hostname || '', port: url.port || '' };
        } catch (e){
            return { host: '', port: '' };
        }
    }

    function updateStatus(statusEl, base, isCustom, defaultBase){
        if (!statusEl) return;
        if (!base){
            statusEl.textContent = defaultBase ? `Using default (${defaultBase}).` : '';
            statusEl.classList.remove('text-danger');
            return;
        }
        const sourceLabel = isCustom ? 'custom' : 'default';
        statusEl.textContent = `Currently using ${base} (${sourceLabel}).`;
        statusEl.classList.remove('text-danger');
    }

    function initConnectionForm(){
        const form = document.getElementById('api-settings-form');
        const hostInput = document.getElementById('api-host');
        const portInput = document.getElementById('api-port');
        const resetBtn = document.getElementById('api-reset');
        const statusEl = document.getElementById('api-settings-status');

        if (!form || !hostInput || !portInput || !window.apiConfig?.setBase) return;

        const defaultBase = window.apiConfig.getDefaultBase?.() || '';

        function fillInputs(){
            statusEl.classList.remove('text-danger');
            const base = window.apiConfig.getBase();
            const parsed = parseBase(base);
            hostInput.value = parsed.host;
            portInput.value = parsed.port || '2000';
            updateStatus(statusEl, base, Boolean(window.apiConfig.getStoredBase?.()), defaultBase);
        }

        resetBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            window.apiConfig.setBase('');
            fillInputs();
            updateStatus(statusEl, window.apiConfig.getBase(), false, defaultBase);
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const host = hostInput.value.trim();
            const port = portInput.value.trim();
            if (!host){
                statusEl.textContent = 'Please enter an IP/hostname or click "Use default".';
                statusEl.classList.add('text-danger');
                return;
            }
            if (port && !/^\d+$/.test(port)){
                statusEl.textContent = 'Port must be numeric.';
                statusEl.classList.add('text-danger');
                return;
            }

            const base = `${window.location.protocol}//${host}${port ? ':' + port : ''}`;
            const result = window.apiConfig.setBase(base);
            if (!result){
                statusEl.textContent = 'Invalid address. Please double-check the IP and port.';
                statusEl.classList.add('text-danger');
                return;
            }
            updateStatus(statusEl, result, true, defaultBase);
        });

        fillInputs();
    }

    document.addEventListener('DOMContentLoaded', initConnectionForm);
})();
