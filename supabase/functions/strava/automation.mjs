import {PublicError,normalizeActivity,sha256} from './logic.mjs';
export const AUTO_ADMIN='e4bf523a-a9e5-4c12-beec-d3218360f733';
export function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export function webhookEvent(body,nowSeconds){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new PublicError('Evento inválido.');
 for(const key of ['object_id','owner_id','subscription_id','event_time'])if(!Number.isSafeInteger(body[key])||body[key]<=0)throw new PublicError('Evento inválido.');
 if(body.event_time<nowSeconds-7*86400||body.event_time>nowSeconds+300)throw new PublicError('Evento expirado.');
 if(!['create','update','delete'].includes(body.aspect_type))throw new PublicError('Evento inválido.');
 const kind=body.object_type==='activity'?'activity':body.object_type==='athlete'&&body.updates?.authorized==='false'&&body.aspect_type==='update'&&body.object_id===body.owner_id?'revoke':null;
 if(!kind)return null;
 // No titles, maps, GPS, heart rate or other API fields in the durable inbox.
 return {p_subscription:body.subscription_id,p_owner:body.owner_id,p_object:body.object_id,p_kind:kind,p_aspect:body.aspect_type,p_time:body.event_time};
}
export function createAutomation({rpc,provider,withToken,env,cryptoAPI=crypto,now=()=>Date.now(),background=task=>{void task.catch(()=>{});}}){
 const secret=env('STRAVA_CLIENT_SECRET'),clientId=env('STRAVA_CLIENT_ID'),base=env('SUPABASE_URL');
 const capabilities=secret?Promise.all(['hook','verify','worker'].map(p=>sha256('treinos:strava:'+p+':'+secret,cryptoAPI))):null;
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 async function processQueue(){
  for(let i=0;i<5;i++){
   const claim=cryptoAPI.randomUUID(),job=await rpc('strava_server_claim',{p_claim:claim});if(!job)break;
   const finish=(action,extra={})=>rpc('strava_server_finish',{p_id:job.id,p_claim:claim,p_action:action,...extra});
   try{
    if(job.kind==='revoke'){await finish('revoke');continue;}
    await withToken(job.user_id,async(token,lease)=>{
     const data=await provider('/api/v3/activities/'+job.object_id,{headers:{Authorization:'Bearer '+token}},false,true);
     const item=data?normalizeActivity(data):null;
     if(item&&data.athlete?.id!==job.owner_id)throw new PublicError('Atleta da atividade inválido.',502);
     await finish(item?'upsert':'remove',{p_token_lease:lease,p_item:item});
    },job.connection_epoch);
   }catch(error){
    // Provider errors never enter the inbox; a revoked connection may already
    // have cascaded its events away. A lost process is reclaimed after the lease.
    try{await finish('retry',{p_error:error instanceof PublicError?'HTTP_'+error.status:'TEMPORARY'});}catch{/* gone or reclaimed */}
   }
  }
 }
 return {
  async status(uid){return rpc('strava_server_auto_status',{p_user:uid});},
  async enable(uid){
   if(uid!==AUTO_ADMIN)throw new PublicError('Somente o responsável pode ativar a sincronização automática.',403);
   if(!capabilities||!clientId)throw new PublicError('Configure primeiro o Strava.',503);
   const [hook,verify,worker]=await capabilities;
   const callback=base+'/functions/v1/strava/webhook/'+hook;
   // Idempotent setup: never remove a different subscription or another app.
   const list=await provider('/api/v3/push_subscriptions?'+new URLSearchParams({client_id:clientId,client_secret:secret}));
   if(!Array.isArray(list))throw new PublicError('Não foi possível consultar a sincronização automática.',502);
   if(list.some(x=>x.callback_url!==callback))throw new PublicError('Já existe outra notificação cadastrada neste aplicativo. Revise a configuração antes de alterar.',409);
   await rpc('strava_server_auto_config',{p_worker_url:base+'/functions/v1/strava/worker/'+worker});
   const subscription=list[0]||await provider('/api/v3/push_subscriptions',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:secret,callback_url:callback,verify_token:verify})});
   if(!Number.isSafeInteger(subscription.id)||subscription.id<=0)throw new PublicError('Cadastro automático inválido.',502);
   await rpc('strava_server_auto_config',{p_subscription:subscription.id});
   await rpc('strava_server_probe',{p_user:uid});
   return {enabled:true};
  },
  async route(request){
   const path=new URL(request.url).pathname,match=path.match(/\/strava\/(webhook|worker)\/([^/]+)$/);
   if(!path.includes('/strava/webhook')&&!path.includes('/strava/worker'))return null;
   if(!match||!capabilities)return reply({error:'Não encontrado.'},404);
   if(request.headers.get('Origin'))return reply({error:'Origem não permitida.'},403);
   const [hook,verify,worker]=await capabilities;
   if(!safeEqual(match[2],match[1]==='webhook'?hook:worker))return reply({error:'Não autorizado.'},403);
   try{
    if(match[1]==='worker'){
     if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
     background(processQueue());return reply({accepted:true});
    }
    if(request.method==='GET'){
     const p=new URL(request.url).searchParams,challenge=p.get('hub.challenge');
     if(p.get('hub.mode')!=='subscribe'||!safeEqual(p.get('hub.verify_token'),verify)||!challenge||challenge.length>512)return reply({error:'Verificação inválida.'},403);
     return reply({'hub.challenge':challenge});
    }
    if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
    if(Number(request.headers.get('Content-Length')||0)>8192)return reply({error:'Evento muito grande.'},413);
    const text=await request.text();if(text.length>8192)return reply({error:'Evento muito grande.'},413);
    let body;try{body=JSON.parse(text);}catch{return reply({error:'Evento inválido.'},400);}
    const event=webhookEvent(body,Math.floor(now()/1000));if(!event)return reply({accepted:true});
    const changes=Object.fromEntries(['authorized','private','title','type'].filter(k=>typeof body.updates?.[k]==='string').map(k=>[k,body.updates[k]]));
    const key=await sha256(JSON.stringify({event,changes}),cryptoAPI);
    await rpc('strava_server_enqueue',{...event,p_key:key});
    background(processQueue());return reply({accepted:true});
   }catch(error){return reply({error:error instanceof PublicError?error.message:'Não foi possível receber o evento.'},error instanceof PublicError?error.status:503);}
  }
 };
}
