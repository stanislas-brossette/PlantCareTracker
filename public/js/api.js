function buildUrl(path){
  if (path.startsWith('http')) return path;
  const base = window.API_BASE || '';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function offlineResponse(method){
  if (method !== 'GET'){
    const err = new Error('Offline');
    err.offline = true;
    throw err;
  }
  return { offline: true };
}

export async function api(method, url, body){
  if (!navigator.onLine){
    return offlineResponse(method);
  }

  try {
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
      return offlineResponse(method);
    }
    try {
      return JSON.parse(text || '{}');
    } catch (err){
      err.status = res.status;
      throw err;
    }
  } catch (err){
    if (err.offline){
      throw err;
    }
    return offlineResponse(method);
  }
}
