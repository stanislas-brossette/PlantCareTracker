const listeners = new Set();
let state = 'unknown';
let consecutiveFailures = 0;

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

async function pingServer(timeout = 3000){
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(withBase('/ping'), { method: 'GET', cache: 'no-store', signal: controller.signal });
        clearTimeout(id);
        if (res.ok){
            consecutiveFailures = 0;
            setState('online');
        } else {
            consecutiveFailures += 1;
            if (consecutiveFailures >= 2) setState('offline');
        }
    } catch (err){
        clearTimeout(id);
        consecutiveFailures += 1;
        if (consecutiveFailures >= 2) setState('offline');
    }
    return state;
}

function startMonitor(){
    setInterval(() => pingServer(), 10000);
}

export const connectivity = {
    isOffline: () => state === 'offline',
    mode: () => state,
    setOffline: () => setState('offline'),
    setOnline: () => setState('online'),
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    checkServer: () => pingServer(),
    startMonitor,
};

window.addEventListener('online', () => pingServer());
window.addEventListener('offline', () => setState('offline'));

// Perform an initial ping so UI reflects local server reachability
pingServer();
startMonitor();
