const listeners = new Set();
let state = navigator.onLine ? 'online' : 'offline';

function notify(){
    listeners.forEach(fn => fn(state));
}

function setState(newState){
    if (state === newState) return;
    state = newState;
    notify();
}

export const connectivity = {
    isOffline: () => state === 'offline',
    mode: () => state,
    setOffline: () => setState('offline'),
    setOnline: () => setState('online'),
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
};

window.addEventListener('online', () => setState('online'));
window.addEventListener('offline', () => setState('offline'));
