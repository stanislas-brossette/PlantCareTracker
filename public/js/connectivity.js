const listeners = new Set();
let state = 'unknown';

function withBase(path){
    if (window.API_BASE){
        return window.API_BASE.replace(/\/$/, '') + path;
    }
    return path;
}

function notify(){
    listeners.forEach(fn => fn(state));
}

function setState(newState){
    if (state === newState) return;
    state = newState;
    notify();
}

async function pingServer(timeout = 2000){
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(withBase('/ping'), { method: 'GET', cache: 'no-store', signal: controller.signal });
        clearTimeout(id);
        setState(res.ok ? 'online' : 'offline');
    } catch (err){
        clearTimeout(id);
        setState('offline');
    }
    return state;
}

export const connectivity = {
    isOffline: () => state === 'offline',
    mode: () => state,
    setOffline: () => setState('offline'),
    setOnline: () => setState('online'),
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    checkServer: () => pingServer(),
};

window.addEventListener('online', () => pingServer());
window.addEventListener('offline', () => setState('offline'));

// Perform an initial ping so UI reflects local server reachability
pingServer();
