const API_BASE = '/api';

function buildUrl(path){
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

export async function api(method, url, body){
  if (!navigator.onLine && method !== 'GET'){
    const err = new Error('Offline');
    err.offline = true;
    throw err;
  }
  if (!navigator.onLine){
    return { offline: true };
  }

  const res = await fetch(buildUrl(url), {
    method,
    headers:{'Content-Type':'application/json'},
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok){
    const text = await res.text().catch(()=> '');
    const error = new Error(text || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!contentType.includes('application/json')){
    const error = new Error(text?.slice(0,200) || 'Unexpected response format');
    error.status = res.status;
    throw error;
  }
  return JSON.parse(text || '{}');
}
