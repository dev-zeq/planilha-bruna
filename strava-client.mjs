import {escapeHTML as esc,paceText,durationText} from './core.mjs';
export function takeStravaReturn(){
 const query=new URLSearchParams(location.search);
 if(!query.has('state')||(!query.has('code')&&!query.has('error')))return null;
 const result={state:query.get('state'),code:query.get('code'),scope:query.get('scope'),error:query.get('error')};
 for(const key of ['state','code','scope','error','error_description'])query.delete(key);
 history.replaceState(null,'',location.pathname+(query.size?'?'+query:'')+location.hash);return result;
}
export function setupStrava({client,getUser,getSnapshot,refresh,oauthReturn=null}){
 const $=id=>document.getElementById(id);let owner=null,connection=null,activities=[],configured=false,generation=0,busy=false,pendingReturn=oauthReturn,automatic=null,canEnable=false,lastLoaded=0;
 function note(text,error=false){$('stravaMessage').textContent=text;$('stravaMessage').classList.toggle('error',error);}
 function reset(){generation++;owner=null;connection=null;activities=[];configured=false;busy=false;automatic=null;canEnable=false;lastLoaded=0;$('stravaActivities').innerHTML='';$('stravaConnection').textContent='';note('');render();}
 async function invoke(action,body={}){
  const result=await client.functions.invoke('strava',{body:{action,...body}});
  if(result.error){let detail;try{detail=await result.error.context.json();}catch{/* no response body */}throw Error(detail?.error||'O serviço Strava está indisponível. Tente novamente.');}
  if(result.data?.error)throw Error(result.data.error);return result.data;
 }
 async function guarded(fn){if(busy)return;busy=true;$('stravaConnect').disabled=true;$('stravaSync').disabled=true;$('stravaDisconnect').disabled=true;$('stravaAuto').disabled=true;try{await fn();}catch(e){note(e.message,true);}finally{busy=false;render();}}
 function confirmAction(title,text){
  return new Promise(resolve=>{const dialog=$('stravaConfirm');$('stravaConfirmTitle').textContent=title;$('stravaConfirmText').textContent=text;dialog.returnValue='cancel';const close=()=>{dialog.removeEventListener('close',close);resolve(dialog.returnValue==='confirm');};dialog.addEventListener('close',close);dialog.showModal();});
 }
 function render(){
  $('stravaConnect').hidden=Boolean(connection);$('stravaConnect').disabled=busy||!configured;
  $('stravaSync').hidden=$('stravaDisconnect').hidden=!connection;$('stravaSync').disabled=$('stravaDisconnect').disabled=busy;
  $('stravaConnection').textContent=connection?`Conectado: ${connection.athlete_name}${connection.last_synced_at?' · Última sincronização: '+new Date(connection.last_synced_at).toLocaleString('pt-BR'):''}`:configured?'Nenhuma conta Strava conectada.':'O responsável ainda precisa finalizar a configuração do Strava.';
  $('stravaAuto').hidden=!canEnable||Boolean(automatic?.enabled);$('stravaAuto').disabled=busy;
  $('stravaAutomatic').textContent=automatic?.enabled?'Sincronização automática ativa. Novas corridas e alterações chegam pelo Strava, mesmo com o app fechado. O vínculo a um treino continua por sua confirmação.':configured?'A sincronização automática ainda precisa ser ativada pelo responsável.':'';
  $('stravaActivities').innerHTML=activities.map(a=>`<article class="entry"><strong>${esc(a.name)}</strong><p>${esc(a.local_date)} · ${(Number(a.distance_m)/1000).toLocaleString('pt-BR',{maximumFractionDigits:2})} km · ${durationText(a.moving_seconds)} · ${paceText(Number(a.distance_m)/1000,a.moving_seconds)}</p><p class="hint">Tempo em movimento · Visível somente nesta conta</p><a href="https://www.strava.com/activities/${a.activity_id}" target="_blank" rel="noopener noreferrer">Ver no Strava</a><button type="button" class="secondary" data-strava-link="${a.activity_id}" ${busy?'disabled':''}>Vincular a um treino</button></article>`).join('');
 }
 async function load(){
  const user=getUser();if(!user){reset();return;}
  const gen=++generation;owner=user.id;
  try{
   const data=await invoke('status');if(gen!==generation||getUser()?.id!==owner)return;
   configured=data.configured;connection=data.connection;automatic=data.automatic;canEnable=data.can_enable_auto;lastLoaded=Date.now();
   if(connection){const rows=await client.from('training_strava_activities').select('*').eq('user_id',owner).order('start_date',{ascending:false}).limit(100);if(rows.error)throw rows.error;if(gen!==generation)return;activities=rows.data;}else activities=[];
   render();
   if(pendingReturn){
    const returned=pendingReturn;pendingReturn=null;
    if(returned.error)throw Error('A conexão com o Strava foi cancelada.');
    const saved=JSON.parse(localStorage.getItem('treinos:strava:state:'+owner)||'null');
    if(saved&&(saved.state!==returned.state||saved.expires<Date.now()))throw Error('Esta autorização não corresponde à conexão iniciada nesta conta. Conecte novamente.');
    // Server always binds state to authenticated UUID, expiry and single use.
    await invoke('exchange',returned);localStorage.removeItem('treinos:strava:state:'+owner);note('Strava conectado. Agora você pode sincronizar suas atividades.');await load();
   }
  }catch(e){if(gen===generation)note(e.message,true);}
 }
 $('stravaAuto').onclick=()=>guarded(async()=>{note('Ativando sincronização automática…');await invoke('enable_auto');await load();note('Sincronização automática ativada. Novas corridas serão recebidas sem apertar o botão.');});
 $('stravaPanel').ontoggle=()=>{if($('stravaPanel').open&&!busy&&getUser())void load();};
 $('stravaConnect').onclick=()=>guarded(async()=>{
  const user=getUser();if(!user)throw Error('Entre na sua conta.');
  const name=document.getElementById('accountName').textContent.split(' · ')[0];
  if(!await confirmAction('Conectar minha conta Strava',`Você está na conta ${name}. Confira se o atleta exibido no Strava é o mesmo antes de autorizar. As atividades importadas ficam privadas nesta conta.`))return;
  const data=await invoke('start');const url=new URL(data.url);if(url.origin!=='https://www.strava.com'||url.pathname!=='/oauth/authorize')throw Error('Endereço de autorização inválido.');
  localStorage.setItem('treinos:strava:state:'+user.id,JSON.stringify({state:data.state,expires:Date.now()+10*60000}));location.assign(url.href);
 });
 $('stravaSync').onclick=()=>guarded(async()=>{note('Sincronizando suas corridas dos últimos 30 dias…');const result=await invoke('sync');await load();note(`${result.imported} atividade(s) verificada(s). Atividades repetidas são atualizadas, sem duplicação.`);});
 $('stravaDisconnect').onclick=()=>guarded(async()=>{
  if(!await confirmAction('Desconectar Strava', 'Isso remove desta conta a conexão, as atividades e os resultados importados do Strava. A agenda e os resultados manuais são preservados.'))return;
  await invoke('disconnect',{confirm:true});connection=null;activities=[];await refresh();render();note('Strava desconectado e dados importados removidos.');
 });
 for(const button of document.querySelectorAll('[data-strava-close]'))button.onclick=()=>$(button.dataset.stravaClose).close('cancel');
 $('stravaConfirmYes').onclick=()=>$('stravaConfirm').close('confirm');
 let linkVersions=new Map(),selectedActivity=null;
 $('stravaActivities').onclick=e=>{
  const id=e.target.closest('[data-strava-link]')?.dataset.stravaLink;if(!id||busy)return;
  selectedActivity=activities.find(a=>String(a.activity_id)===id);if(!selectedActivity)return;
  const uid=getUser()?.id,v=getSnapshot();const eligible=v.sessions.filter(s=>!s.target_user_ids.length||s.target_user_ids.includes(uid));
  linkVersions=new Map(eligible.map(s=>[s.id,v.results.find(r=>r.session_id===s.id&&r.user_id===uid)||null]));
  $('stravaLinkActivity').textContent=`${selectedActivity.name} · ${selectedActivity.local_date} · ${(Number(selectedActivity.distance_m)/1000).toLocaleString('pt-BR')} km · ${durationText(selectedActivity.moving_seconds)} em movimento`;
  $('stravaSession').innerHTML='<option value="">Selecione o treino</option>'+eligible.map(s=>`<option value="${s.id}">${esc(s.training_date)} · ${esc(s.title)}</option>`).join('');
  const sameDate=eligible.filter(s=>s.training_date===selectedActivity.local_date);if(sameDate.length===1)$('stravaSession').value=sameDate[0].id;
  $('stravaLinkNote').textContent='Somente o seu resultado será preenchido. Um resultado anterior seu será substituído. O resultado importado ficará privado por ser proveniente do Strava.';
  $('stravaLinkDialog').showModal();
 };
 $('stravaLinkForm').onsubmit=e=>{e.preventDefault();void guarded(async()=>{
  const session=$('stravaSession').value;if(!session||!selectedActivity)throw Error('Selecione uma atividade e um treino.');
  const current=linkVersions.get(session);if(current?.pending)throw Error('Envie primeiro suas alterações pendentes da agenda.');
  await invoke('link',{session_id:session,activity_id:selectedActivity.activity_id,version:current?.version||0});$('stravaLinkDialog').close();await refresh();note('Seu resultado foi vinculado. Os outros atletas não foram concluídos.');
 });};
 return {load,reset,async refreshAuto(){if(getUser()&&!busy&&$('stravaPanel').open&&Date.now()-lastLoaded>15000)await load();}};
}
