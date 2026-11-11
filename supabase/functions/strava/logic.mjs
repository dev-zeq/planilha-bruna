export const APP_ORIGIN='https://treinos.paceplus.app';
export const CALLBACK=APP_ORIGIN+'/';
export const RUN_TYPES=new Set(['Run','TrailRun','VirtualRun']);
export class PublicError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export function scopesFrom(value){return String(value||'').split(/[ ,]+/).filter(Boolean);}
export function requireScopes(scopes){if(!scopes.includes('activity:read')&&!scopes.includes('activity:read_all'))throw new PublicError('Autorize a leitura das suas atividades no Strava.');}
export function normalizeActivity(a){
 if(!a||!RUN_TYPES.has(a.sport_type||a.type))return null;
 const id=Number(a.id),distance=Number(a.distance),moving=Number(a.moving_time),elapsed=Number(a.elapsed_time);
 if(!Number.isSafeInteger(id)||id<=0||!Number.isFinite(distance)||distance<0||distance>1000000||!Number.isInteger(moving)||moving<0||moving>31536000||!Number.isInteger(elapsed)||elapsed<0||elapsed>31536000||!Number.isFinite(Date.parse(a.start_date))||!/^\d{4}-\d{2}-\d{2}T/.test(a.start_date_local||''))throw new PublicError('O Strava retornou uma atividade inválida.',502);
 return {activity_id:id,name:String(a.name||'Corrida').slice(0,200),sport_type:a.sport_type||a.type,start_date:new Date(a.start_date).toISOString(),local_date:a.start_date_local.slice(0,10),distance_m:distance,moving_seconds:moving,elapsed_seconds:elapsed};
}
export function validateTokens(data,nowSeconds){
 if(!data||typeof data.access_token!=='string'||!data.access_token||typeof data.refresh_token!=='string'||!data.refresh_token||!Number.isSafeInteger(data.expires_at)||data.expires_at<=nowSeconds)throw new PublicError('Resposta de autorização inválida do Strava.',502);
 return {access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at};
}
export function uuid(value){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value||''))throw new PublicError('Identificador inválido.');return value;}
export function linkInput(body){
 const activity=Number(body.activity_id),version=Number(body.version);
 if(!Number.isSafeInteger(activity)||activity<=0||!Number.isSafeInteger(version)||version<0)throw new PublicError('Atividade ou versão inválida.');
 return {activity,version,session:uuid(body.session_id)};
}
export function dbError(error){
 if(!error)return;
 const m=String(error.message||'');
 if(m.includes('CONFLICT'))throw new PublicError('O resultado mudou. Atualize a agenda e revise antes de vincular.',409);
 if(m.includes('BUSY'))throw new PublicError('Já há uma sincronização em andamento. Aguarde e tente novamente.',409);
 if(error.code==='23505')throw new PublicError('Esta conta ou atividade do Strava já está vinculada. Confira os vínculos existentes.',409);
 throw new PublicError('Não foi possível concluir a operação com o Strava. Tente novamente.',500);
}
export async function sha256(text,cryptoAPI=crypto){return Array.from(new Uint8Array(await cryptoAPI.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');}
export function newState(cryptoAPI=crypto){return Array.from(cryptoAPI.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');}

export function createHandler({createClient,env,fetcher=fetch,cryptoAPI=crypto,now=()=>Date.now()}){
 const url=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default;
 const clientId=env('STRAVA_CLIENT_ID'),clientSecret=env('STRAVA_CLIENT_SECRET');
 const configured=Boolean(clientId&&/^\d+$/.test(clientId)&&clientSecret);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const rpc=async(name,args)=>{const r=await admin.rpc(name,args);dbError(r.error);return r.data;};
 async function provider(path,options={},invalidRefresh=false){
  const response=await fetcher('https://www.strava.com'+path,{...options,signal:AbortSignal.timeout(12000)});
  if(response.status===429)throw new PublicError('Limite do Strava atingido. Aguarde a próxima janela de sincronização.',429);
  if(response.status===401||(invalidRefresh&&response.status===400))throw new PublicError('A conexão com o Strava foi revogada. Conecte novamente.',401);
  if(!response.ok)throw new PublicError('O Strava não concluiu a operação. Tente novamente mais tarde.',502);
  return response.json();
 }
 const postToken=body=>provider('/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,...body})},body.grant_type==='refresh_token');
 async function withToken(uid,fn){
  const lease=cryptoAPI.randomUUID();let acquired=false;
  try{
   let tokens=await rpc('strava_server_token',{p_user:uid,p_lease:lease});acquired=true;
   if(tokens.expires_at<Math.floor(now()/1000)+120){tokens=validateTokens(await postToken({grant_type:'refresh_token',refresh_token:tokens.refresh_token}),Math.floor(now()/1000));await rpc('strava_server_token',{p_user:uid,p_lease:lease,p_update:tokens});}
   return await fn(tokens.access_token,lease);
  }catch(e){
   // A provider 401 means consent was withdrawn; erase imported API data/tokens.
   if(e instanceof PublicError&&e.status===401)await rpc('strava_server_disconnect',{p_user:uid});
   throw e;
  }finally{if(acquired){try{await rpc('strava_server_token',{p_user:uid,p_lease:lease,p_release:true});}catch{/* lease expires automatically */}}}
 }
 return async request=>{
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':APP_ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&origin!==APP_ORIGIN)return reply({error:'Origem não permitida.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
  try{
   const bearer=request.headers.get('Authorization');
   if(!bearer?.startsWith('Bearer '))throw new PublicError('Entre no aplicativo para usar o Strava.',401);
   const auth=await admin.auth.getUser(bearer.slice(7));
   if(auth.error||!auth.data.user)throw new PublicError('Sua sessão expirou. Entre novamente.',401);
   const uid=auth.data.user.id;
   const member=await admin.from('training_members').select('user_id').eq('user_id',uid).limit(1);
   if(member.error||!member.data?.length)throw new PublicError('Acesso ao grupo não autorizado.',403);
   if(Number(request.headers.get('Content-Length')||0)>8192)throw new PublicError('Pedido muito grande.',413);
   const text=await request.text();if(text.length>8192)throw new PublicError('Pedido muito grande.',413);
   let body;try{body=JSON.parse(text);}catch{throw new PublicError('Pedido inválido.');}if(!body||typeof body!=='object'||Array.isArray(body))throw new PublicError('Pedido inválido.');
   if(body.action==='status'){
    const connection=await admin.from('training_strava_connections').select('athlete_id,athlete_name,connected_at,last_synced_at').eq('user_id',uid).maybeSingle();dbError(connection.error);
    return reply({configured,connection:connection.data});
   }
   if(!configured)throw new PublicError('O responsável ainda precisa configurar o aplicativo Strava.',503);
   if(body.action==='start'){
    const state=newState(cryptoAPI);await rpc('strava_server_state',{p_user:uid,p_hash:await sha256(state,cryptoAPI)});
    const authURL=new URL('https://www.strava.com/oauth/authorize');
    for(const [k,v] of Object.entries({client_id:clientId,redirect_uri:CALLBACK,response_type:'code',approval_prompt:'force',scope:'read,activity:read_all',state}))authURL.searchParams.set(k,v);
    return reply({url:authURL.href,state});
   }
   if(body.action==='exchange'){
    if(typeof body.state!=='string'||!/^[a-f0-9]{64}$/.test(body.state)||typeof body.code!=='string'||!body.code||body.code.length>512)throw new PublicError('Retorno de autorização inválido.');
    const scopes=scopesFrom(body.scope);requireScopes(scopes);
    const valid=await rpc('strava_server_state',{p_user:uid,p_hash:await sha256(body.state,cryptoAPI),p_consume:true});
    if(!valid)throw new PublicError('Autorização expirada, reutilizada ou iniciada em outra conta. Conecte novamente.');
    const token=await postToken({grant_type:'authorization_code',code:body.code}),tokens=validateTokens(token,Math.floor(now()/1000));
    if(!Number.isSafeInteger(token.athlete?.id)||token.athlete.id<=0)throw new PublicError('Atleta não identificado pelo Strava.',502);
    await rpc('strava_server_connect',{p_user:uid,p_athlete:token.athlete.id,p_name:[token.athlete.firstname,token.athlete.lastname].filter(Boolean).join(' ').slice(0,160),p_scopes:scopes,p_tokens:tokens});
    return reply({connected:true});
   }
   if(body.action==='sync'){
    const imported=await withToken(uid,async(token,lease)=>{
     const items=[],after=Math.floor(now()/1000)-30*86400;
     for(let page=1;page<=3;page++){
      const batch=await provider('/api/v3/athlete/activities?after='+after+'&per_page=100&page='+page,{headers:{Authorization:'Bearer '+token}});
      if(!Array.isArray(batch))throw new PublicError('Resposta de atividades inválida.',502);
      for(const a of batch){const normalized=normalizeActivity(a);if(normalized)items.push(normalized);}
      if(batch.length<100)break;
     }
     return rpc('strava_server_import',{p_user:uid,p_lease:lease,p_items:items});
    });return reply({imported,days:30});
   }
   if(body.action==='link'){
    const v=linkInput(body);await rpc('strava_server_link',{p_user:uid,p_activity:v.activity,p_session:v.session,p_version:v.version});return reply({linked:true});
   }
   if(body.action==='disconnect'){
    if(body.confirm!==true)throw new PublicError('Confirme a desconexão e a remoção dos dados importados.');
    try{await withToken(uid,async token=>provider('/oauth/deauthorize',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({access_token:token})}));}catch(e){if(!(e instanceof PublicError&&e.status===401))throw e;}
    await rpc('strava_server_disconnect',{p_user:uid});return reply({disconnected:true});
   }
   throw new PublicError('Ação inválida.');
  }catch(error){return reply({error:error instanceof PublicError?error.message:'Não foi possível conectar ao Strava. Tente novamente.'},error instanceof PublicError?error.status:500);}
 };
}
