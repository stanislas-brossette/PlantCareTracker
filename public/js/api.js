const API_PREFIX = '/api';

const normalizeUrl = (url) => {
  if (typeof url !== 'string') return url;
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith('/api/') ? url : `${API_PREFIX}${url.startsWith('/') ? '' : '/'}${url.replace(/^\//, '')}`;
  return path;
};

export async function api(method, url, body){
  const options = {
    method,
    headers: {'Content-Type':'application/json'},
    body: body ? JSON.stringify(body) : undefined
  };
  try{
    const res = await fetch(normalizeUrl(url), options);
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const preview = text.slice(0, 200);
      const error = new Error(`Expected JSON from ${res.url} but got HTML (status ${res.status}). Likely route collision. Preview: ${preview}`);
      error.status = res.status;
      throw error;
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
    return JSON.parse(text || '{}');
  }catch(err){
    const isNetworkError = err?.name === 'AbortError' || err instanceof TypeError;
    if (isNetworkError) {
      window.offlineUI?.setOffline('request-failed');
      return { offline: true };
    }
    throw err;
  }
}
