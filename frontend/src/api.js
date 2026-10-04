const B=import.meta.env.VITE_API||'http://localhost:8080/api';
const IDLE_TIMEOUT_MS=5*60*1000;
const ENCRYPTION_ENABLED=import.meta.env.VITE_API_ENCRYPTION_ENABLED==='true';
const ENCRYPTION_KEY=import.meta.env.VITE_API_ENCRYPTION_KEY||'';
let tk=sessionStorage.getItem('t');
let refreshInFlight;
let cryptoKeyPromise;
let lastActivityWrite=0;

function encryptionKey(){
  if(!ENCRYPTION_ENABLED)return null;
  if(!crypto.subtle)throw new Error('Encrypted API requests require a secure browser context (HTTPS or localhost).');
  if(!ENCRYPTION_KEY)throw new Error('VITE_API_ENCRYPTION_KEY is required when API payload encryption is enabled.');
  if(!cryptoKeyPromise){
    const raw=Uint8Array.from(atob(ENCRYPTION_KEY),character=>character.charCodeAt(0));
    if(raw.length!==32)throw new Error('VITE_API_ENCRYPTION_KEY must be Base64-encoded 32-byte AES-256 key material.');
    cryptoKeyPromise=crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
  }
  return cryptoKeyPromise;
}

function toBase64(bytes){
  let binary='';
  for(let offset=0;offset<bytes.length;offset+=0x8000)
    binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
  return btoa(binary);
}

async function encryptPayload(value){
  const key=await encryptionKey();
  if(!key)return value;
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const clear=new TextEncoder().encode(value);
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key,clear);
  const payload=new Uint8Array(iv.length+ciphertext.byteLength);
  payload.set(iv);
  payload.set(new Uint8Array(ciphertext),iv.length);
  return toBase64(payload);
}

async function decryptPayload(response){
  const text=await response.text();
  if(!text)return null;
  if(!ENCRYPTION_ENABLED)return JSON.parse(text);
  if(response.headers.get('X-Payload-Encryption')!=='AES-256-GCM')
    throw new Error('The server did not return the required encrypted API response.');
  const payload=Uint8Array.from(atob(text.trim()),character=>character.charCodeAt(0));
  if(payload.length<=12+16)throw new Error('The server returned an invalid encrypted API response.');
  const clear=await crypto.subtle.decrypt(
    {name:'AES-GCM',iv:payload.subarray(0,12)},
    await encryptionKey(),
    payload.subarray(12)
  );
  return JSON.parse(new TextDecoder().decode(clear));
}

async function multipartPayload(form){
  const entries=[];
  for(const [name,value] of form.entries()){
    if(value instanceof File){
      const bytes=new Uint8Array(await value.arrayBuffer());
      entries.push({name,fileName:value.name,contentType:value.type||'application/octet-stream',value:toBase64(bytes)});
    }else entries.push({name,value});
  }
  return JSON.stringify({__multipart:true,entries});
}

async function send(path,method,body,token=tk){
  const multipart=body instanceof FormData;
  const headers={...(ENCRYPTION_ENABLED?{'X-Payload-Encryption':'AES-256-GCM'}:{}),...(token?{Authorization:'Bearer '+token}:{})};
  let payload;
  if(multipart){
    if(ENCRYPTION_ENABLED){
      headers['Content-Type']='text/plain';
      payload=await encryptPayload(await multipartPayload(body));
    }else payload=body;
  }else if(body!==undefined&&body!==null){
    headers['Content-Type']=ENCRYPTION_ENABLED?'text/plain':'application/json';
    payload=ENCRYPTION_ENABLED?await encryptPayload(JSON.stringify(body)):JSON.stringify(body);
  }else if(!ENCRYPTION_ENABLED)headers['Content-Type']='application/json';
  return fetch(B+path,{method,headers,body:payload});
}

export const tokenExpiry=(token=tk)=>{
  if(!token)return 0;
  try{
    const payload=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const claims=JSON.parse(atob(payload));
    return Number.isFinite(claims.exp)?claims.exp*1000:0;
  }catch{return 0}
};

export function setSession(session){
  tk=session?.token||null;
  if(tk){
    sessionStorage.setItem('t',tk);
    sessionStorage.setItem('r',session.refreshToken);
    sessionStorage.setItem('rk_last_activity',String(Date.now()));
    localStorage.removeItem('u');
  }else clearSession();
}

export function clearSession(){
  tk=null;
  sessionStorage.removeItem('t');
  sessionStorage.removeItem('r');
  sessionStorage.removeItem('u');
  sessionStorage.removeItem('rk_last_activity');
  localStorage.removeItem('u');
}

export function markActivity(){
  const now=Date.now();
  if(tk&&now-lastActivityWrite>=1000){
    sessionStorage.setItem('rk_last_activity',String(now));
    lastActivityWrite=now;
  }
}

export function isSessionIdle(){
  const last=Number(sessionStorage.getItem('rk_last_activity')||0);
  return !last||Date.now()-last>=IDLE_TIMEOUT_MS;
}

export async function refreshSession(){
  if(refreshInFlight)return refreshInFlight;
  const refreshToken=sessionStorage.getItem('r');
  if(!refreshToken||isSessionIdle()){
    clearSession();
    throw new Error('Your session expired after 5 minutes of inactivity. Please sign in again.');
  }
  refreshInFlight=(async()=>{
    const response=await send('/auth/refresh','POST',{refreshToken},null);
    const session=await decryptPayload(response);
    if(!response.ok){
      clearSession();
      throw new Error(session?.message||'Your session expired. Please sign in again.');
    }
    tk=session.token;
    sessionStorage.setItem('t',session.token);
    sessionStorage.setItem('r',session.refreshToken);
    markActivity();
    return session;
  })();
  try{return await refreshInFlight}
  finally{refreshInFlight=null}
}

export async function logoutSession(){
  const refreshToken=sessionStorage.getItem('r');
  try{
    if(refreshToken)await send('/auth/logout','POST',{refreshToken},null);
  }finally{clearSession()}
}

export async function api(path,method='GET',body){
  if(tk&&path!=='/auth/refresh'&&tokenExpiry()-Date.now()<60*1000)await refreshSession();
  if(tk&&tokenExpiry()<=Date.now()){
    clearSession();
    throw new Error('Your session expired. Please sign in again.');
  }
  let response=await send(path,method,body);
  let result=await decryptPayload(response);
  if((response.status===401||response.status===403)&&tk&&path!=='/auth/refresh'){
    await refreshSession();
    response=await send(path,method,body);
    result=await decryptPayload(response);
  }
  if(!response.ok){
    const error=new Error(result?.message||'Something went wrong');
    error.status=response.status;
    throw error;
  }
  return result;
}
