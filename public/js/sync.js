import { cachePlants, readPlants } from './storage.js';
import { api } from './api.js';

let renderer = null;
export function setRenderer(fn){ renderer = fn; }

export async function sync(renderFn = renderer){
  const cached = await readPlants();
  if (renderFn) renderFn(cached);
  if (!navigator.onLine) return;

  const plants = await api('GET', '/plants');
  if (!plants.offline){
    await cachePlants(plants);
    if (renderFn) renderFn(plants);
  }
}

window.addEventListener('online', () => sync());
