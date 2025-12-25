import { queue } from './storage.js';

function buildUrl(url){
  if (url.startsWith('/api')) return url;
  if (url.startsWith('/')) return `/api${url}`;
  return `/api/${url}`;
}

function signalOnline(){
  window.dispatchEvent(new Event('app:online'));
}

function signalOffline(){
  window.dispatchEvent(new Event('app:offline'));
}

export async function api(method, url, body){
  try{
    const res = await fetch(buildUrl(url), { method,
                                   headers:{'Content-Type':'application/json'},
                                   body: body?JSON.stringify(body):undefined });
    if (!res.ok) {
      let detail = '';
      try {
        detail = await res.text();
      } catch (e) {}
      const error = new Error(detail || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const error = new Error('Unexpected HTML response from API; is the server running at the same origin?');
      error.status = res.status;
      error.detail = text?.slice(0, 200);
      throw error;
    }
    if (!contentType.includes('application/json')) {
      const error = new Error(text?.slice(0, 200) || 'Unexpected response format');
      error.status = res.status;
      throw error;
    }

    try {
      const parsed = JSON.parse(text || '{}');
      signalOnline();
      return parsed;
    } catch (e) {
      const error = new Error('Unexpected response from server. Please ensure the API server is running.');
      error.status = res.status;
      error.detail = text?.slice(0, 200);
      throw error;
    }
  }catch(err){
    signalOffline();
    if (!navigator.onLine){
      await queue({method: method, url: buildUrl(url), body, ts:Date.now()});
      return { offline:true };
    }
    throw err;
  }
}
