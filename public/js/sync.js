import { flushQueue, cachePlants } from './storage.js';
import { api } from './api.js';

async function pushOp(op){ await api(op.method, op.url, op.body); }

export async function sync(){
  await flushQueue(pushOp);
  const changed = await api('GET', '/plants/changes?since='+(localStorage.lastSynced || 0));
  if (!changed.offline){
    await cachePlants(changed.plants);
    localStorage.lastSynced = Date.now();
  }
}

window.addEventListener('online', sync);
