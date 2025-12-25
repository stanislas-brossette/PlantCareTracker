export async function api(method, url, body){
  const options = {
    method,
    headers: {'Content-Type':'application/json'},
    body: body ? JSON.stringify(body) : undefined
  };
  try{
    const res = await fetch(url, options);
    if (!res.ok) {
      const detail = await res.text().catch(()=> '');
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
    return JSON.parse(text || '{}');
  }catch(err){
    window.offlineUI?.setOffline('request-failed');
    return { offline: true };
  }
}
