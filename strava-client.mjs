import {escapeHTML as esc,paceText,durationText} from './core.mjs';
export function takeStravaReturn(){
 const query=new URLSearchParams(location.search);
 if(!query.has('state')||(!query.has('code')&&!query.has('error')))return null;
 const result={state:query.get('state'),code:query.get('code'),scope:query.get('scope'),error:query.get('error')};
 for(const key of ['state','code','scope','error','error_description'])query.delete(key);
 history.replaceState(null,'',location.pathname+(query.size?'?'+query:'')+location.hash);return result;
}
export function setupStrava({client,getUser,getSnapshot,refresh,oauthReturn=null,isVisible=()=>true,getSharing=()=>false,setSharing=async()=>{}}){
 const $=id=>document.getElementById(id);let owner=null,connection=null,activities=[],configured=false,generation=0,busy=false,pendingReturn=oauthReturn,automatic=null,canEnable=false,lastLoaded=0,selectedIds=new Set();
 function note(text,error=false){$('stravaMessage').textContent=text;$('stravaMessage').classList.toggle('error',error);}
 function reset(){generation++;owner=null;connection=null;activities=[];configured=false;busy=false;automatic=null;canEnable=false;lastLoaded=0;selectedIds.clear();$('stravaActivities').innerHTML='';$('stravaConnection').textContent='';note('');render();}
 async function invoke(action,body={}){
  const result=await client.functions.invoke('strava',{body:{action,...body}});
  if(result.error){let detail;try{detail=await result.error.context.json();}catch{/* no response body */}throw Error(detail?.error||'O serviço Strava está indisponível. Tente novamente.');}
  if(result.data?.error)throw Error(result.data.error);return result.data;
 }
 async function guarded(fn){if(busy)return;busy=true;$('stravaConnect').disabled=true;$('stravaSync').disabled=true;$('stravaDisconnect').disabled=true;$('stravaShare').disabled=true;$('stravaAuto').disabled=true;try{await fn();}catch(e){note(e.message,true);}finally{busy=false;render();}}
 function confirmAction(title,text){
  return new Promise(resolve=>{const dialog=$('stravaConfirm');$('stravaConfirmTitle').textContent=title;$('stravaConfirmText').textContent=text;dialog.returnValue='cancel';const close=()=>{dialog.removeEventListener('close',close);resolve(dialog.returnValue==='confirm');};dialog.addEventListener('close',close);dialog.showModal();});
 }
 function render(){
  $('stravaConnect').hidden=Boolean(connection);$('stravaConnect').disabled=busy||!configured;
  $('stravaSync').hidden=$('stravaDisconnect').hidden=!connection;$('stravaSync').disabled=$('stravaDisconnect').disabled=busy;
  $('stravaConnection').textContent=connection?`Conectado: ${connection.athlete_name}${connection.last_synced_at?' · Última sincronização: '+new Date(connection.last_synced_at).toLocaleString('pt-BR'):''}`:configured?'Nenhuma conta Strava conectada.':'O responsável ainda precisa finalizar a configuração do Strava.';
  $('stravaShareRow').hidden=!connection;$('stravaShare').checked=getSharing();$('stravaShare').disabled=busy;
  $('stravaAuto').hidden=!canEnable||Boolean(automatic?.enabled);$('stravaAuto').disabled=busy;
  $('stravaAutomatic').textContent=automatic?.enabled?'Sincronização automática ativa. Novas corridas e alterações chegam pelo Strava, mesmo com o app fechado. O vínculo a um treino continua por sua confirmação.':configured?'A sincronização automática ainda precisa ser ativada pelo responsável.':'';
  $('stravaActivities').innerHTML=activities.map(a=>`<article class="entry"><label class="strava-select"><input type="checkbox" data-strava-select="${a.activity_id}" ${selectedIds.has(String(a.activity_id))?'checked':''} ${busy?'disabled':''}><strong>${esc(a.name)}</strong></label><p>${esc(a.local_date)} · ${(Number(a.distance_m)/1000).toLocaleString('pt-BR',{maximumFractionDigits:2})} km · ${durationText(a.moving_seconds)} · ${paceText(Number(a.distance_m)/1000,a.moving_seconds)}</p><p class="hint">Tempo em movimento · Visível somente nesta conta</p><a href="https://www.strava.com/activities/${a.activity_id}" target="_blank" rel="noopener noreferrer">Ver no Strava</a><button type="button" class="secondary" data-strava-link="${a.activity_id}" ${busy?'disabled':''}>Vincular a um treino</button></article>`).join('');renderSelection();
 }
 function renderSelection(){const rows=activities.filter(a=>selectedIds.has(String(a.activity_id)));const km=rows.reduce((n,a)=>n+Number(a.distance_m),0)/1000,seconds=rows.reduce((n,a)=>n+a.moving_seconds,0);$('stravaSelected').textContent=rows.length?`${rows.length} atividade(s) · ${km.toLocaleString('pt-BR',{maximumFractionDigits:2})} km · ${durationText(seconds)} · ${paceText(km,seconds)}`:'Selecione aquecimento, treino principal e desaquecimento para somar no mesmo resultado.';$('stravaGroup').disabled=busy||!rows.length;}
 async function load(){
  const user=getUser();if(!user){reset();return;}
  const gen=++generation;owner=user.id;
  try{
   const data=await invoke('status');if(gen!==generation||getUser()?.id!==owner)return;
   configured=data.configured;connection=data.connection;automatic=data.automatic;canEnable=data.can_enable_auto;lastLoaded=Date.now();
   if(connection){const rows=await client.from('training_strava_activities').select('*').eq('user_id',owner).order('start_date',{ascending:false}).limit(100);if(rows.error)throw rows.error;if(gen!==generation)return;activities=rows.data;selectedIds=new Set([...selectedIds].filter(id=>activities.some(a=>String(a.activity_id)===id)));}else activities=[];
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
 $('stravaConnect').onclick=()=>guarded(async()=>{
  const user=getUser();if(!user)throw Error('Entre na sua conta.');
  const name=document.getElementById('accountName').textContent.split(' · ')[0];
  if(!await confirmAction('Conectar minha conta Strava',`Você está na conta ${name}. Confira se o atleta exibido no Strava é o mesmo antes de autorizar. As atividades importadas ficam privadas nesta conta.`))return;
  const data=await invoke('start');const url=new URL(data.url);if(url.origin!=='https://www.strava.com'||url.pathname!=='/oauth/authorize')throw Error('Endereço de autorização inválido.');
  localStorage.setItem('treinos:strava:state:'+user.id,JSON.stringify({state:data.state,expires:Date.now()+10*60000}));location.assign(url.href);
 });
 // Sharing needs the athlete's own express consent; withdrawing it takes effect at once.
 $('stravaShare').onchange=()=>guarded(async()=>{
  const share=$('stravaShare').checked;
  if(share&&!await confirmAction('Compartilhar com o grupo','Os outros atletas do grupo passarão a ver distância, tempo e pace dos treinos que você vincular do Strava, na sua planilha e no ranking. A lista de atividades continua privada. Você pode desligar quando quiser.'))return;
  await setSharing(share);note(share?'Seus treinos do Strava agora aparecem para o grupo.':'Seus treinos do Strava voltaram a ficar privados.');
 });
 $('stravaSync').onclick=()=>guarded(async()=>{note('Sincronizando suas corridas dos últimos 30 dias…');const result=await invoke('sync');await load();note(`${result.imported} atividade(s) verificada(s). Atividades repetidas são atualizadas, sem duplicação.`);});
 $('stravaDisconnect').onclick=()=>guarded(async()=>{
  if(!await confirmAction('Desconectar Strava', 'Isso remove desta conta a conexão, as atividades e os resultados importados do Strava. A agenda e os resultados manuais são preservados.'))return;
  await invoke('disconnect',{confirm:true});connection=null;activities=[];await refresh();render();note('Strava desconectado e dados importados removidos.');
 });
 for(const button of document.querySelectorAll('[data-strava-close]'))button.onclick=()=>$(button.dataset.stravaClose).close('cancel');
 $('stravaConfirmYes').onclick=()=>$('stravaConfirm').close('confirm');
 let linkVersions=new Map(),selectedActivities=[];
 function openLink(rows){
  if(!rows.length||busy)return;if(rows.length>10){note('Selecione no máximo dez atividades para este treino.',true);return;}
  selectedActivities=rows;
  const uid=getUser()?.id,v=getSnapshot();const eligible=v.sessions.filter(s=>!s.target_user_ids.length||s.target_user_ids.includes(uid));
  linkVersions=new Map(eligible.map(s=>[s.id,v.results.find(r=>r.session_id===s.id&&r.user_id===uid)||null]));
  const km=rows.reduce((n,a)=>n+Number(a.distance_m),0)/1000,seconds=rows.reduce((n,a)=>n+a.moving_seconds,0);
  $('stravaLinkActivity').textContent=rows.map(a=>`${a.local_date} · ${a.name}`).join(' + ')+` · Total: ${km.toLocaleString('pt-BR',{maximumFractionDigits:2})} km · ${durationText(seconds)} · ${paceText(km,seconds)} em movimento`;
  $('stravaSession').innerHTML='<option value="">Selecione o treino</option>'+eligible.map(s=>`<option value="${s.id}">${esc(s.training_date)} · ${esc(s.title)}</option>`).join('');
  const dates=new Set(rows.map(a=>a.local_date));const sameDate=dates.size===1?eligible.filter(s=>s.training_date===rows[0].local_date):[];if(sameDate.length===1)$('stravaSession').value=sameDate[0].id;
  $('stravaLinkNote').textContent='Distância e tempo em movimento serão somados em um único resultado seu. O pace usa os totais. Seu resultado anterior será substituído; os outros atletas não serão concluídos. Dados do Strava ficam privados, a menos que você ative o compartilhamento com o grupo.';
  $('stravaLinkDialog').showModal();
 }
 $('stravaActivities').onchange=e=>{const id=e.target.dataset.stravaSelect;if(!id||busy)return;if(e.target.checked)selectedIds.add(id);else selectedIds.delete(id);renderSelection();};
 $('stravaGroup').onclick=()=>openLink(activities.filter(a=>selectedIds.has(String(a.activity_id))));
 $('stravaActivities').onclick=e=>{const id=e.target.closest('[data-strava-link]')?.dataset.stravaLink;if(id)openLink(activities.filter(a=>String(a.activity_id)===id));};
 $('stravaLinkForm').onsubmit=e=>{e.preventDefault();void guarded(async()=>{
  const session=$('stravaSession').value;if(!session||!selectedActivities.length)throw Error('Selecione uma atividade e um treino.');
  const current=linkVersions.get(session);if(current?.pending)throw Error('Envie primeiro suas alterações pendentes da agenda.');
  await invoke('link',{session_id:session,activity_ids:selectedActivities.map(a=>a.activity_id),version:current?.version||0});$('stravaLinkDialog').close();selectedIds.clear();renderSelection();await refresh();note('Seu resultado foi vinculado. Os outros atletas não foram concluídos.');
 });};
 return {load,reset,show(){if(!busy&&getUser())void load();},async refreshAuto(){if(getUser()&&!busy&&isVisible()&&Date.now()-lastLoaded>15000)await load();}};
}
