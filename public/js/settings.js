(function(){
    function createPanel(){
        const wrapper = document.createElement('div');
        wrapper.className = 'api-settings-wrapper';
        wrapper.innerHTML = `
            <button id="api-settings-toggle" class="btn btn-outline-secondary btn-sm" type="button" aria-expanded="false">
                Connection
            </button>
            <div id="api-settings-panel" class="card shadow-sm d-none">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h2 class="h6 mb-0">Backend connection</h2>
                        <button type="button" class="btn-close" aria-label="Close"></button>
                    </div>
                    <p class="small text-muted mb-3">Enter the IP (or hostname) and port of the server running on your Wi‑Fi. Leave blank to use the default.</p>
                    <form id="api-settings-form" class="row g-2">
                        <div class="col-8">
                            <label class="form-label small" for="api-host">IP / Host</label>
                            <input id="api-host" class="form-control form-control-sm" placeholder="192.168.1.31" />
                        </div>
                        <div class="col-4">
                            <label class="form-label small" for="api-port">Port</label>
                            <input id="api-port" class="form-control form-control-sm" placeholder="2000" />
                        </div>
                        <div class="col-12 d-flex justify-content-end gap-2 mt-1">
                            <button id="api-reset" type="button" class="btn btn-link btn-sm">Use default</button>
                            <button id="api-save" class="btn btn-primary btn-sm" type="submit">Save</button>
                        </div>
                        <div class="col-12">
                            <div id="api-settings-status" class="small text-muted"></div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(wrapper);
        return wrapper;
    }

    function parseBase(base){
        try {
            const url = new URL(base);
            return { host: url.hostname || '', port: url.port || '' };
        } catch (e){
            return { host: '', port: '' };
        }
    }

    function updateStatus(statusEl, base, isCustom){
        statusEl.textContent = base ? `Currently using ${base}${isCustom ? ' (saved locally)' : ''}` : '';
    }

    function init(){
        if (!window.apiConfig?.setBase) return;

        const panel = createPanel();
        const toggle = panel.querySelector('#api-settings-toggle');
        const container = panel.querySelector('#api-settings-panel');
        const closeBtn = container.querySelector('.btn-close');
        const form = panel.querySelector('#api-settings-form');
        const hostInput = panel.querySelector('#api-host');
        const portInput = panel.querySelector('#api-port');
        const resetBtn = panel.querySelector('#api-reset');
        const statusEl = panel.querySelector('#api-settings-status');

        function fillInputs(){
            statusEl.classList.remove('text-danger');
            const base = window.apiConfig.getBase();
            const parsed = parseBase(base);
            hostInput.value = parsed.host;
            portInput.value = parsed.port || '2000';
            updateStatus(statusEl, base, Boolean(window.apiConfig.getStoredBase()));
        }

        function hide(){
            container.classList.add('d-none');
            toggle.setAttribute('aria-expanded', 'false');
        }

        toggle.addEventListener('click', () => {
            const isHidden = container.classList.contains('d-none');
            if (isHidden) {
                fillInputs();
                container.classList.remove('d-none');
                toggle.setAttribute('aria-expanded', 'true');
            } else {
                hide();
            }
        });
        closeBtn.addEventListener('click', hide);

        resetBtn.addEventListener('click', () => {
            window.apiConfig.setBase('');
            fillInputs();
            updateStatus(statusEl, window.apiConfig.getBase(), false);
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const host = hostInput.value.trim();
            const port = portInput.value.trim();
            if (!host) {
                statusEl.textContent = 'Please enter an IP/hostname or click "Use default".';
                statusEl.classList.add('text-danger');
                return;
            }
            if (port && !/^\d+$/.test(port)) {
                statusEl.textContent = 'Port must be numeric.';
                statusEl.classList.add('text-danger');
                return;
            }

            const base = `${window.location.protocol}//${host}${port ? ':' + port : ''}`;
            const result = window.apiConfig.setBase(base);
            if (!result) {
                statusEl.textContent = 'Invalid address. Please double-check the IP and port.';
                statusEl.classList.add('text-danger');
                return;
            }
            statusEl.classList.remove('text-danger');
            updateStatus(statusEl, result, true);
        });

        fillInputs();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
