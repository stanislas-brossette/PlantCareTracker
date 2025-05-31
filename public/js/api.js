import { queue } from './storage.js';

export async function api(method, url, body){
  try{
    const res = await fetch(url, { method,
                                   headers:{'Content-Type':'application/json'},
                                   body: body?JSON.stringify(body):undefined });
    if (!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }catch(err){
    if (!navigator.onLine){
      await queue({method,url,body,ts:Date.now()});
      return { offline:true };
    }
    throw err;
  }
}
