export async function api(method, url, body){
  const options = {
    method,
    headers: {'Content-Type':'application/json'},
    body: body ? JSON.stringify(body) : undefined
  };
  try{
    const res = await fetch(url, options);
    const text = await res.text();
    if (!res.ok) {
      const error = new Error(text || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    const contentType = res.headers.get('content-type') || '';
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
