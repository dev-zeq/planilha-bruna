export const LEGACY_KEY = 'ez_bruna_treinos_v1';
export const PERIODS = ['Manhã', 'Tarde', 'Noite', 'Não definido'];
export function escapeHTML(value) {
 return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function isoLocal(date) {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function monday(date = new Date()) {
 const d=new Date(date.getFullYear(), date.getMonth(), date.getDate(),12);
 d.setDate(d.getDate()-(d.getDay()+6)%7); return d;
}
export function durationSeconds(text) {
 if (!text.trim()) return null;
 if (!/^\d{1,3}:[0-5]\d:[0-5]\d$/.test(text)) throw Error('Informe o tempo como horas:minutos:segundos (00:45:30).');
 const [h,m,s]=text.split(':').map(Number); return h*3600+m*60+s;
}
export function durationText(seconds) {
 if(seconds == null) return '';
 return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
}
export function paceText(km,seconds) {
 if(!(km>0 && seconds>0)) return '—';
 const p=Math.round(seconds/km); return `${Math.floor(p/60)}:${String(p%60).padStart(2,'0')}/km`;
}
export function numberOrNull(value) {
 if(value==='' || value==null) return null;
 const n=Number(value); if(!Number.isFinite(n)||n<0||n>1000) throw Error('Distância deve estar entre 0 e 1.000 km.'); return n;
}
export function validateLegacy(backup) {
 const items=Array.isArray(backup)?backup:backup?.items;
 if(!Array.isArray(items)||items.length>500) throw Error('Backup inválido ou com mais de 500 treinos.');
 const ids=new Set();
 for(const x of items){
  if(!x||typeof x.id!=='string'||!x.id||x.id.length>200||ids.has(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>160||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||Number.isNaN(Date.parse(x.date+'T12:00:00'))||new Date(x.date+'T12:00:00Z').toISOString().slice(0,10)!==x.date||!['Ambos','Bruna','Ezequiel','Renato Cirino'].includes(x.athlete)||!PERIODS.includes(x.time)||!['plan','done','open'].includes(x.status)||typeof x.desc!=='string'||x.desc.length>20000) throw Error('Backup antigo inválido: revise datas, IDs, atletas e campos.');
  numberOrNull(x.distance); ids.add(x.id);
 }
 return items;
}
export async function legacyUUID(group,id) {
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`treinos:legacy:v1:${group}:${id}`))).slice(0,16);
 bytes[6]=(bytes[6]&15)|80; bytes[8]=(bytes[8]&63)|128;
 const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export async function legacyOperations(items,group,members,userId) {
 const out=[];
 for(const x of validateLegacy(items)){
  const names=x.athlete==='Ambos'?['Ezequiel','Bruna']:[x.athlete];
  const targets=names.map(name=>{const m=members.find(m=>m.display_name===name); if(!m) throw Error(`Aguarde ${name} entrar no grupo antes de importar este backup.`);return m.user_id;});
  const id=await legacyUUID(group,x.id);
  out.push({kind:'import',data:{id,group_id:group,training_date:x.date,period:x.time,title:x.name,description:x.desc,planned_km:null,state:x.status==='open'?'open':'planned',target_user_ids:targets}});
  // Legacy completion is ambiguous for Ambos: import only for signed-in athlete.
  if(x.status==='done'&&targets.includes(userId))out.push({kind:'result',version:0,data:{session_id:id,status:'done',actual_km:numberOrNull(x.distance),duration_seconds:null,notes:'Importado do backup local. '+x.desc},legacy:true});
 }
 return out;
}
export function projectSnapshot(snapshot,queue,userId) {
 const sessions=structuredClone(snapshot.sessions||[]),results=structuredClone(snapshot.results||[]);
 for(const op of queue){
  const b=op.body,d=b.data;
  if(b.kind==='create'||b.kind==='import'){
   if(!sessions.some(s=>s.id===d.id))sessions.push({...d,version:1,deleted_at:null,pending:true});
  } else if(b.kind==='update'||b.kind==='delete'){
   const s=sessions.find(s=>s.id===d.id);if(s) Object.assign(s,b.kind==='delete'?{deleted_at:'pending'}:d,{version:Number(s.version)+1,pending:true});
  } else if(b.kind==='result'){
   let r=results.find(r=>r.session_id===d.session_id&&r.user_id===userId);
   if(!r){r={user_id:userId,version:0};results.push(r);}
   Object.assign(r,d,{version:Number(r.version)+1,pending:true});
  }
 }
 return {sessions:sessions.filter(s=>!s.deleted_at),results};
}

// Web Locks are shared by every tab and installed-app window of this origin. A window that
// the system froze in the background keeps its lock indefinitely, which left sign-in waiting
// forever. Waiters therefore take the lock over after a timeout instead of hanging.
export async function lockWithTakeover(name,fn,timeout=8000,locks=globalThis.navigator?.locks) {
 if(!locks) return fn();
 const controller=new AbortController();
 let acquired=false;
 const timer=setTimeout(()=>controller.abort(),timeout);
 const run=()=>{acquired=true;clearTimeout(timer);return fn();};
 try{return await locks.request(name,{signal:controller.signal},run);}
 catch(error){
  if(acquired||!controller.signal.aborted) throw error;
  return locks.request(name,{steal:true},run);
 }finally{clearTimeout(timer);}
}
