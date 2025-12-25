export async function api(method, url, body){
  const target = url.startsWith('http') ? url : `${window.API_BASE || ''}${url.startsWith('/') ? url : '/' + url}`;
  try{
    const res = await fetch(target, { method,
                                   headers:{'Content-Type':'application/json'},
                                   body: body?JSON.stringify(body):undefined });
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (contentType.includes('text/html')) {
      throw new Error(`Expected JSON from ${target} but got HTML. Check routing/fallback.`);
    }

    if (!res.ok) {
      const error = new Error(text || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }

    if (!contentType.includes('application/json')) {
      const error = new Error(text?.slice(0, 200) || 'Unexpected response format');
      error.status = res.status;
      throw error;
    }

    try {
      const parsed = JSON.parse(text || '{}');
      if (window.offlineUI && navigator.onLine) window.offlineUI.markOnline();
      return parsed;
    } catch (e) {
      const error = new Error('Unexpected response from server. Please ensure the API server is running.');
      error.status = res.status;
      error.detail = text?.slice(0, 200);
      throw error;
    }
  }catch(err){
    if (window.offlineUI) {
      if (err.status === undefined) {
        window.offlineUI.markOffline();
      } else {
        window.offlineUI.markOnline();
      }
    }
    throw err;
  }
}
