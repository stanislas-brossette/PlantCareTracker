import { queue } from './storage.js';

export async function api(method, url, body){
  try{
    const res = await fetch(url, { method,
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
    if (!contentType.includes('application/json')) {
      const error = new Error(text?.slice(0, 200) || 'Unexpected response format');
      error.status = res.status;
      throw error;
    }

    try {
      return JSON.parse(text || '{}');
    } catch (e) {
      const error = new Error('Unexpected response from server. Please ensure the API server is running.');
      error.status = res.status;
      error.detail = text?.slice(0, 200);
      throw error;
    }
  }catch(err){
    if (!navigator.onLine){
      await queue({method,url,body,ts:Date.now()});
      return { offline:true };
    }
    throw err;
  }
}
