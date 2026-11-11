import {setupStrava,takeStravaReturn} from './strava-client.mjs';
import {LEGACY_KEY, escapeHTML as esc, isoLocal, monday, durationSeconds, durationText, paceText, numberOrNull, validateLegacy, legacyOperations, legacyUUID, projectSnapshot} from './core.mjs';

const stravaReturn=takeStravaReturn();
const $=id=>document.getElementById(id);
const URL_API='https://hzcqlygvzxxnvpywzppp.supabase.co';
const PUBLIC_KEY='sb_publishable_CVtGBZ41EnVTtVsD4yu-Ug_AdiK2J-l';
let stravaUI=null;let client,user=null,group=null,members=[],base={sessions:[],results:[]},week=monday(),filter='all',generation=0,refreshPromise=null,authMode='login',formVersion=0,resultVersion=0;
const snapshotKey=uid=>`treinos:cloud:v2:${uid}`;
const queueKey=uid=>`treinos:queue:v2:${uid}`;
const read=(key,fallback)=>{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);};
const queue=uid=>read(queueKey(uid),[]);
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
function message(text,error=false){$('statusMessage').textContent=text;$('statusMessage').classList.toggle('error',error);}
function errorText(error){
 const m=error?.message||String(error);
 if(/Invalid login credentials/i.test(m))return 'E-mail ou senha incorretos.';
 if(/Email not confirmed/i.test(m))return 'Confirme seu e-mail antes de entrar.';
 if(/email address not authorized|email_provider_disabled|sending confirmation email/i.test(m))return 'O envio de confirmação ainda precisa ser configurado pelo responsável do aplicativo. Seus dados antigos continuam preservados.';
 if(/rate limit/i.test(m))return 'Limite de tentativas atingido. Aguarde alguns minutos.';
 if(/CONFLICT/.test(m))return 'Há uma alteração mais recente. Exporte as pendências, descarte a operação em conflito e refaça a edição com os dados atuais.';
 if(/fetch|network|offline/i.test(m))return 'Sem conexão com o servidor. Seus dados locais e pendências foram preservados.';
 return m;
}
async function guarded(fn,button){
 if(button)button.disabled=true;
 try{await fn();}catch(e){message(errorText(e),true);}finally{if(button)button.disabled=false;}
}
function lock(name,fn){return navigator.locks?navigator.locks.request(name,fn):fn();}
async function editQueue(uid,fn){return lock('treinos-queue-'+uid,()=>{const q=queue(uid);const next=fn(q)||q;write(queueKey(uid),next);return next;});}
function view(){return projectSnapshot(base,user?queue(user.id):[],user?.id);}
function download(data,name){const url=window.URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>window.URL.revokeObjectURL(url),2000);}
const dayFormat=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'});
const resultLabels={done:'Realizado',planned:'Planejado',skipped:'Não realizado'};
function render(){
 if(!user||!group)return;
 const q=queue(user.id),v=view(),end=new Date(week);end.setDate(end.getDate()+6);
 $('period').textContent=`Semana de ${dayFormat.format(week)} a ${dayFormat.format(end)}/${end.getFullYear()}`;
 $('accountName').textContent=(members.find(m=>m.user_id===user.id)?.display_name||user.email)+' · Agenda compartilhada';
 $('filters').innerHTML=[{user_id:'all',display_name:'Todos'},...members].map(m=>`<button data-filter="${esc(m.user_id)}" class="${filter===m.user_id?'active':''}" aria-pressed="${filter===m.user_id}">${esc(m.display_name)}</button>`).join('');
 const selected=members.filter(m=>filter==='all'||m.user_id===filter);
 const sessions=v.sessions.filter(s=>s.training_date>=isoLocal(week)&&s.training_date<=isoLocal(end)&&(filter==='all'||!s.target_user_ids.length||s.target_user_ids.includes(filter)));
 const relevant=[];for(const s of sessions)for(const m of selected)if(!s.target_user_ids.length||s.target_user_ids.includes(m.user_id))relevant.push(v.results.find(r=>r.session_id===s.id&&r.user_id===m.user_id)||{status:'planned'});
 $('done').textContent=relevant.filter(r=>r.status==='done').length;
 $('pending').textContent=relevant.filter(r=>r.status==='planned').length;
 $('km').textContent=relevant.filter(r=>r.status==='done').reduce((sum,r)=>sum+(Number(r.actual_km)||0),0).toLocaleString('pt-BR',{maximumFractionDigits:2})+' km';
 $('days').innerHTML=Array.from({length:7},(_,i)=>{
  const d=new Date(week);d.setDate(d.getDate()+i);
  const rows=sessions.filter(s=>s.training_date===isoLocal(d)).sort((a,b)=>a.period.localeCompare(b.period)||a.id.localeCompare(b.id));
  return `<section class="day"><h2>${esc(new Intl.DateTimeFormat('pt-BR',{weekday:'long'}).format(d))}<small>${dayFormat.format(d)}</small></h2>${rows.length?rows.map(s=>{
   const targets=selected.filter(m=>!s.target_user_ids.length||s.target_user_ids.includes(m.user_id));
   const my=v.results.find(r=>r.session_id===s.id&&r.user_id===user.id),canComplete=!s.target_user_ids.length||s.target_user_ids.includes(user.id);
   return `<article class="entry ${s.state==='open'?'open':'plan'}"><div class="head"><strong>${esc(s.title)}</strong><span class="tag">${s.pending?'Pendente de envio':s.state==='open'?'A definir':'Planejado'}</span></div><p class="who">${esc(s.period)}${s.planned_km!=null?' · '+esc(s.planned_km)+' km planejados':''}</p><p>${esc(s.description)}</p><div class="results">${targets.map(m=>{
    const r=v.results.find(r=>r.session_id===s.id&&r.user_id===m.user_id);
    return `<p><b>${esc(m.display_name)}:</b> ${r?resultLabels[r.status]:'Planejado'}${r?.actual_km!=null?' · '+esc(r.actual_km)+' km':''}${r?.duration_seconds!=null?' · '+durationText(r.duration_seconds)+' · '+paceText(r.actual_km,r.duration_seconds):''}${r?.source==='strava'?' · Strava (privado)':''}${r?.pending?' · envio pendente':''}${r?.notes?'<br>'+esc(r.notes):''}</p>`;
   }).join('')}</div><div class="actions">${canComplete?`<button data-result="${s.id}">${my?.status==='done'?'Meu resultado':'Concluir treino'}</button>`:''}<button class="secondary" data-edit="${s.id}">Editar</button><button class="danger" data-delete="${s.id}">Excluir</button></div></article>`;
  }).join(''):'<p class="muted">Nenhum treino registrado</p>'}</section>`;
 }).join('');
 $('queuePanel').hidden=!q.length;
 $('queuePanel').innerHTML=`<strong>${q.length} operação(ões) pendente(s) neste aparelho</strong><p>Os dados abaixo ainda precisam ser confirmados pelo servidor.</p>${q.some(o=>o.error)?'<p>Uma operação parou a fila. Exporte as pendências antes de descartá-la. Depois revise o treino atualizado.</p>':''}<ul>${q.filter(o=>o.error).map(o=>`<li>${esc(o.body.data.title||o.body.kind)}: ${esc(o.error)} <button class="danger" data-discard="${o.id}">Descartar esta operação</button></li>`).join('')}</ul><button id="sendPending">Tentar enviar</button><button class="secondary" id="backupPending">Exportar pendências</button>`;
 if($('sendPending'))$('sendPending').onclick=()=>guarded(async()=>{await editQueue(user.id,q=>q.map(({error,...op})=>op));await refresh(true);},$('sendPending'));
 if($('backupPending'))$('backupPending').onclick=exportCloud;
}
async function enqueueMany(bodies){
 if(!user||!group)throw Error('Entre no grupo antes de salvar.');
 const uid=user.id;
 const ops=await Promise.all(bodies.map(async body=>({id:body.kind==='import'||body.legacy?await legacyUUID(group,body.kind+':'+(body.data.id||body.data.session_id)+':'+uid):crypto.randomUUID(),body})));
 await editQueue(uid,q=>q.concat(ops.filter(op=>!q.some(existing=>existing.id===op.id))));
 if(user?.id!==uid)return;
 render();message('Alteração guardada neste aparelho. Aguardando confirmação do servidor.');
 void guarded(()=>refresh(true));
}
function check(result){if(result.error)throw result.error;return result.data;}
async function paged(table,setup){
 const rows=[];for(let start=0;;start+=500){const data=check(await setup(client.from(table).select('*')).range(start,start+499));rows.push(...data);if(data.length<500)return rows;}
}
async function refresh(send=true){
 if(refreshPromise)return refreshPromise;
 const uid=user?.id,gid=group,gen=generation;
 if(!uid||!gid)return;
 refreshPromise=lock('treinos-sync-'+uid,async()=>{
  if(!navigator.onLine){message('Sem internet — exibindo a última cópia deste aparelho. Alterações ficam pendentes.');render();return;}
  message('Sincronizando agenda…');
  const current=()=>user?.id===uid&&generation===gen;
  if(send){
   while(current()){
    const op=queue(uid)[0];if(!op)break;
    if(op.error)break;
    const {error}=await client.rpc('apply_training_operation',{op_id:op.id,body:op.body});
    if(!current())return;
    if(error){
     const transient=/fetch|network|timeout|JWT|session/i.test(error.message)||!navigator.onLine||Number(error.status)>=500;
     if(!transient)await editQueue(uid,q=>q.map(o=>o.id===op.id?{...o,error:errorText(error)}:o));
     message(errorText(error),true);break;
    }
    await editQueue(uid,q=>q.filter(o=>o.id!==op.id));
   }
  }
  const ms=check(await client.from('training_members').select('*').eq('group_id',gid).order('display_name'));
  if(!current())return;
  if(!ms.some(m=>m.user_id===uid)){
   localStorage.removeItem(snapshotKey(uid));base={sessions:[],results:[]};group=null;members=[];showPanel('access');throw Error('Seu acesso ao grupo foi removido.');
  }
  const sessions=await paged('training_sessions',q=>q.eq('group_id',gid).is('deleted_at',null).order('id'));
  // Results are filtered by the joined group, rather than fetching other groups.
  const results=[];
  for(let i=0;i<sessions.length;i+=100){
   results.push(...await paged('training_results',q=>q.in('session_id',sessions.slice(i,i+100).map(s=>s.id)).order('session_id').order('user_id')));
  }
  if(!current())return;
  members=ms;base={sessions,results};write(snapshotKey(uid),{group:gid,members,base,savedAt:new Date().toISOString()});
  render();const pending=queue(uid);
  message(pending.length?`${pending.length} operação(ões) aguardando envio ou revisão.`:'Agenda atualizada. Todas as alterações foram confirmadas.',pending.some(o=>o.error));
 }).finally(()=>{refreshPromise=null;});
 return refreshPromise;
}
function showPanel(name){for(const id of ['auth','access','app'])$(id+'Panel').hidden=id!==name;for(const id of ['exportCloud','migrate','importBtn'])$(id).hidden=name!=='app';}
async function handleSession(session){
 const uid=session?.user?.id;
 if(uid===user?.id&&group)return;
 generation++;stravaUI?.reset();const previousRefresh=refreshPromise;user=session?.user||null;group=null;members=[];base={sessions:[],results:[]};filter='all';
 $('days').innerHTML='';$('queuePanel').innerHTML='';$('email').value='';$('password').value='';
 if(!user){showPanel('auth');message('Entre para acessar a agenda compartilhada.');return;}
 const gen=generation;
 if(!navigator.onLine){
  const saved=read(snapshotKey(uid),null);
  if(saved){group=saved.group;members=saved.members;base=saved.base;showPanel('app');render();message('Sem internet — última cópia neste aparelho. O acesso será revalidado ao conectar.');return;}
  showPanel('access');message('Conecte-se à internet para verificar seu acesso.',true);return;
 }
 message('Verificando seu acesso ao grupo…');
 check(await client.rpc('claim_training_invitation'));
 const membership=check(await client.from('training_members').select('*').eq('user_id',uid).order('created_at').limit(1));
 if(gen!==generation)return;
 if(!membership.length){localStorage.removeItem(snapshotKey(uid));showPanel('access');message('E-mail sem autorização para o grupo ou confirmação pendente.');return;}
 if(previousRefresh)await previousRefresh.catch(()=>{});if(gen!==generation)return;group=membership[0].group_id;showPanel('app');await refresh(true);await stravaUI?.load();
}
function setAuthMode(mode){authMode=mode;$('authTitle').textContent=({login:'Sua agenda de treinos',signup:'Criar minha conta',recover:'Recuperar senha',password:'Definir nova senha'})[mode];$('authSubmit').textContent=({login:'Entrar',signup:'Cadastrar',recover:'Enviar link de recuperação',password:'Salvar nova senha'})[mode];$('passwordLabel').hidden=mode==='recover';$('password').required=mode!=='recover';$('password').autocomplete=mode==='login'?'current-password':'new-password';$('email').parentElement.hidden=mode==='password';$('email').required=mode!=='password';$('signup').hidden=mode!=='login';$('recover').hidden=mode!=='login';$('backLogin').hidden=mode==='login'||mode==='password';$('authMessage').textContent='';}
function openSession(id){
 const s=view().sessions.find(s=>s.id===id);formVersion=s?.version||0;$('sessionForm').reset();$('sessionTitle').textContent=s?'Editar treino':'Novo treino';$('sessionId').value=s?.id||'';$('trainingDate').value=s?.training_date||isoLocal(week);$('periodInput').value=s?.period||'Não definido';$('titleInput').value=s?.title||'';$('descriptionInput').value=s?.description||'';$('plannedInput').value=s?.planned_km??'';$('stateInput').value=s?.state||'planned';$('targets').innerHTML=members.map(m=>`<label><input type="checkbox" value="${m.user_id}" ${s?.target_user_ids.includes(m.user_id)?'checked':''}>${esc(m.display_name)}</label>`).join('');$('sessionDialog').showModal();
}
function openResult(id){const v=view(),s=v.sessions.find(s=>s.id===id),r=v.results.find(r=>r.session_id===id&&r.user_id===user.id);if(!s)return;resultVersion=r?.version||0;$('resultForm').reset();$('resultSession').value=id;$('resultTitle').textContent=s.title;$('resultStatus').value=r?.status||'done';$('actualInput').value=r?.actual_km??'';$('durationInput').value=durationText(r?.duration_seconds);$('notesInput').value=r?.notes||'';previewPace();$('resultDialog').showModal();}
function previewPace(){try{$('pacePreview').textContent='Pace: '+paceText(numberOrNull($('actualInput').value),durationSeconds($('durationInput').value));}catch{$('pacePreview').textContent='Pace: informe o tempo como 00:45:30.';}}
function exportCloud(){if(!user)return;download({version:2,exportedAt:new Date().toISOString(),group,user_id:user.id,members,...base,pending:queue(user.id)},'backup-agenda-'+isoLocal(new Date())+'.json');}
function exportLegacy(){const data=read(LEGACY_KEY,null);if(!data)throw Error('Não há treinos antigos guardados neste navegador. Use o aparelho onde registrou os treinos.');download({version:1,items:data},'backup-local-treinos-'+isoLocal(new Date())+'.json');}
async function importLegacy(data){
 if(!user||!group)throw Error('Entre no grupo para importar.');
 const items=validateLegacy(data);if(!items.length)throw Error('Este backup está vazio.');
 const bodies=await legacyOperations(items,group,members,user.id),v=view();
 const newSessions=bodies.filter(b=>b.kind==='import'&&!v.sessions.some(s=>s.id===b.data.id));
 const results=bodies.filter(b=>b.kind==='result'&&!v.results.some(r=>r.session_id===b.data.session_id&&r.user_id===user.id));
 if(!newSessions.length&&!results.length){message('Este backup já consta na agenda. Nenhuma duplicação foi criada.');return;}
 if(!confirm(`Importar ${newSessions.length} treino(s) e ${results.length} resultado(s) somente para você?\n\n“Ambos” significa Ezequiel e Bruna. A conclusão não será atribuída ao outro atleta. Os dados locais continuarão intactos. Exporte o backup antes de continuar.`))return;
 // Keep source order: create each session before its own result.
 const needed=bodies.filter(b=>newSessions.includes(b)||results.includes(b));await enqueueMany(needed);
}

$('signup').onclick=()=>setAuthMode('signup');$('recover').onclick=()=>setAuthMode('recover');$('backLogin').onclick=()=>setAuthMode('login');
$('authForm').onsubmit=e=>{e.preventDefault();void guarded(async()=>{
 if(!client)throw Error('Não foi possível carregar o serviço de login. Conecte-se à internet e recarregue.');
 const email=$('email').value.trim(),password=$('password').value,redirectTo=location.origin+location.pathname;
 if(authMode==='recover'){check(await client.auth.resetPasswordForEmail(email,{redirectTo}));$('authMessage').textContent='Se o e-mail estiver cadastrado, você receberá um link para recuperar a senha.';}
 else if(authMode==='password'){check(await client.auth.updateUser({password}));setAuthMode('login');await handleSession((await client.auth.getSession()).data.session);message('Senha atualizada.');}
 else if(authMode==='signup'){const data=check(await client.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}}));$('authMessage').textContent='Cadastro solicitado. Verifique seu e-mail e confirme a conta. O grupo exige autorização.';if(data.session)await handleSession(data.session);}
 else {const data=check(await client.auth.signInWithPassword({email,password}));await handleSession(data.session);}
 $('password').value='';
},$('authSubmit'));};
async function logout(){
 if(user&&queue(user.id).length&&!confirm('Há alterações pendentes neste aparelho. Elas serão preservadas para esta conta. Deseja sair?'))return;
 const uid=user?.id;check(await client.auth.signOut({scope:'local'}));if(uid)localStorage.removeItem(snapshotKey(uid));await handleSession(null);for(const d of document.querySelectorAll('dialog[open]'))d.close();setAuthMode('login');
}
$('logout').onclick=$('accessLogout').onclick=()=>guarded(logout);
$('checkAccess').onclick=()=>guarded(async()=>{group=null;await handleSession((await client.auth.getSession()).data.session);},$('checkAccess'));
$('refresh').onclick=()=>guarded(()=>refresh(true),$('refresh'));
$('new').onclick=()=>openSession();$('prev').onclick=()=>{week.setDate(week.getDate()-7);render();};$('next').onclick=()=>{week.setDate(week.getDate()+7);render();};$('today').onclick=()=>{week=monday();render();};
$('filters').onclick=e=>{const b=e.target.closest('[data-filter]');if(b){filter=b.dataset.filter;render();}};
$('days').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.edit)openSession(b.dataset.edit);if(b.dataset.result)openResult(b.dataset.result);if(b.dataset.delete)void guarded(async()=>{const s=view().sessions.find(s=>s.id===b.dataset.delete);if(s&&confirm('Excluir este treino da agenda de todos? Os resultados também deixarão de aparecer na agenda.'))await enqueueMany([{kind:'delete',version:s.version,data:{id:s.id}}]);});};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('sessionForm').onsubmit=e=>{e.preventDefault();void guarded(async()=>{const id=$('sessionId').value||crypto.randomUUID();const data={id,group_id:group,training_date:$('trainingDate').value,period:$('periodInput').value,title:$('titleInput').value.trim(),description:$('descriptionInput').value.trim(),planned_km:numberOrNull($('plannedInput').value),state:$('stateInput').value,target_user_ids:Array.from($('targets').querySelectorAll('input:checked'),x=>x.value)};if(!data.title)throw Error('Informe o nome do treino.');await enqueueMany([{kind:formVersion?'update':'create',version:formVersion,data}]);$('sessionDialog').close();},e.submitter);};
$('actualInput').oninput=$('durationInput').oninput=previewPace;
$('resultForm').onsubmit=e=>{e.preventDefault();void guarded(async()=>{const data={session_id:$('resultSession').value,status:$('resultStatus').value,actual_km:numberOrNull($('actualInput').value),duration_seconds:durationSeconds($('durationInput').value),notes:$('notesInput').value.trim()};await enqueueMany([{kind:'result',version:resultVersion,data}]);$('resultDialog').close();},e.submitter);};
$('queuePanel').onclick=e=>{const id=e.target.closest('[data-discard]')?.dataset.discard;if(id)void guarded(async()=>{if(!confirm('Descartar esta operação pendente? Exporte primeiro se quiser preservar o conteúdo. Operações posteriores dependentes poderão precisar de revisão.'))return;await editQueue(user.id,q=>q.filter(o=>o.id!==id));await refresh(true);render();});};
$('exportLegacy').onclick=()=>guarded(exportLegacy);$('exportCloud').onclick=()=>guarded(exportCloud);$('migrate').onclick=()=>guarded(()=>importLegacy(read(LEGACY_KEY,null)),$('migrate'));$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=e=>guarded(async()=>{const file=e.target.files[0];try{if(!file)return;if(file.size>2*1024*1024)throw Error('Arquivo maior que 2 MB.');await importLegacy(JSON.parse(await file.text()));}finally{e.target.value='';}});
window.addEventListener('online',()=>guarded(async()=>{if(user&&!group)await handleSession((await client.auth.getSession()).data.session);else await refresh(true);}));window.addEventListener('offline',()=>{message('Sem internet — alterações ficam pendentes neste aparelho.');render();});
window.addEventListener('storage',e=>{if(user&&e.key===queueKey(user.id)){render();void guarded(()=>refresh(true));}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void guarded(()=>refresh(true));});setInterval(()=>{if(!document.hidden&&navigator.onLine)void guarded(()=>refresh(true));},20000);

// Keep shell versions coherent: an installed worker activates only after a user action.
if('serviceWorker' in navigator){const controlledAtLoad=Boolean(navigator.serviceWorker.controller);navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{const offer=()=>{if(reg.waiting){$('updateApp').hidden=false;$('updateApp').onclick=()=>{if(user&&queue(user.id).length&&!confirm('Atualizar agora? Suas pendências serão preservadas.'))return;reg.waiting.postMessage({type:'ACTIVATE'});};}};offer();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',offer));navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlledAtLoad&&authMode!=='password')location.reload();});}).catch(()=>{$('pwaMessage').textContent='Não foi possível preparar o uso offline. A agenda continua disponível com internet.';});}
let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installBtn').hidden=false;});$('installBtn').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('installBtn').hidden=true;}};

try{
 if(!window.supabase)throw Error('Não foi possível carregar o serviço de login. Verifique a internet e recarregue.');
 const incoming=new URLSearchParams(location.hash.slice(1));
 const needsPassword=['recovery','invite'].includes(incoming.get('type'));
 if(needsPassword)setAuthMode('password');
 client=window.supabase.createClient(URL_API,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal||AbortSignal.timeout(15000)})}});
 stravaUI=setupStrava({client,getUser:()=>user,getSnapshot:view,refresh:()=>refresh(true),oauthReturn:stravaReturn});
 client.auth.onAuthStateChange((event,session)=>{setTimeout(()=>{if(event==='PASSWORD_RECOVERY'){generation++;user=session.user;group=null;showPanel('auth');setAuthMode('password');message('Defina sua nova senha.');}else if(authMode!=='password')void guarded(()=>handleSession(session));},0);});
 const {data,error}=await client.auth.getSession();if(error)throw error;
 if(needsPassword&&data.session){user=data.session.user;showPanel('auth');setAuthMode('password');message('Defina sua nova senha.');}else {setAuthMode('login');await handleSession(data.session);if(incoming.get('error'))message('Este link de acesso expirou ou já foi utilizado. Solicite um novo link em Esqueci a senha.',true);}
}catch(e){setAuthMode('login');message(errorText(e),true);}
