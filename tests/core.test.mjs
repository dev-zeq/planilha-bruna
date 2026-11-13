import {test} from 'node:test';
import assert from 'node:assert/strict';
import {durationSeconds,durationText,paceText,numberOrNull,validateLegacy,legacyUUID,legacyOperations,projectSnapshot,monday,isoLocal,escapeHTML,lockWithTakeover,sessionState,SESSION_STATES,parsePlan,planOperations} from '../core.mjs';
const legacy={id:'seed0',date:'2026-11-09',athlete:'Ambos',time:'Manhã',name:'Rodagem',desc:'12 km',status:'done',distance:12};
const members=[{display_name:'Ezequiel',user_id:'a'},{display_name:'Bruna',user_id:'b'},{display_name:'Renato Cirino',user_id:'c'}];
test('duration and pace use seconds and carry minutes',()=>{assert.equal(durationSeconds('01:02:03'),3723);assert.equal(durationSeconds(''),null);assert.throws(()=>durationSeconds('00:99:00'));assert.equal(durationText(3723),'01:02:03');assert.equal(paceText(10,2399),'4:00/km');assert.equal(paceText(0,300),'—');assert.throws(()=>numberOrNull(Infinity));assert.throws(()=>numberOrNull(-1));});
test('strict legacy validation rejects impossible dates, duplicate IDs and invalid athletes',()=>{assert.deepEqual(validateLegacy({items:[legacy]}),[legacy]);for(const change of [{date:'2026-02-30'},{athlete:'external'},{distance:-4},{status:'unknown'},{desc:undefined}])assert.throws(()=>validateLegacy({items:[{...legacy,...change}]}));assert.throws(()=>validateLegacy([legacy,legacy]));});
test('migration IDs stable across users and isolated across groups',async()=>{assert.equal(await legacyUUID('g','seed0'),await legacyUUID('g','seed0'));assert.notEqual(await legacyUUID('g','seed0'),await legacyUUID('other','seed0'));});
test('Ambos never completes the other athlete or targets Renato implicitly',async()=>{const a=await legacyOperations([legacy],'g',members,'a'),b=await legacyOperations([legacy],'g',members,'b'),c=await legacyOperations([legacy],'g',members,'c');assert.deepEqual(a[0].data.target_user_ids,['a','b']);assert.equal(a[0].data.id,b[0].data.id);assert.equal(a.length,2);assert.equal(b.length,2);assert.equal(c.length,1);assert.equal(a[1].data.user_id,undefined);await assert.rejects(()=>legacyOperations([legacy],'g',members.slice(0,1),'a'),/Aguarde Bruna/);});
test('optimistic operations preserve other athletes results and predict CAS versions',()=>{const base={sessions:[{id:'s',version:1,title:'A'}],results:[{session_id:'s',user_id:'b',status:'planned',version:1}]};const out=projectSnapshot(base,[{body:{kind:'update',data:{id:'s',title:'B'}}},{body:{kind:'result',data:{session_id:'s',status:'done'}}}],'a');assert.equal(out.sessions[0].version,2);assert.equal(out.results.find(r=>r.user_id==='b').status,'planned');assert.equal(out.results.find(r=>r.user_id==='a').status,'done');assert.equal(base.sessions[0].title,'A');});
test('optimistic create retry deduplicates and deletion hides session',()=>{assert.equal(projectSnapshot({sessions:[],results:[]},[{body:{kind:'create',data:{id:'s'}}},{body:{kind:'create',data:{id:'s'}}}],'a').sessions.length,1);assert.equal(projectSnapshot({sessions:[{id:'s',version:1}],results:[]},[{body:{kind:'delete',data:{id:'s'}}}],'a').sessions.length,0);});
test('week starts Monday and UI escapes untrusted descriptions',()=>{assert.equal(isoLocal(monday(new Date(2026,10,15,12))),'2026-11-09');assert.equal(escapeHTML('<img onerror="alert(1)">'),'&lt;img onerror=&quot;alert(1)&quot;&gt;');});

// Minimal Web Locks stand-in: one holder per name, waiters abort on signal, steal always runs.
function fakeLocks(){const held=new Set();return {held,async request(name,options,callback){
 if(!options.steal&&held.has(name))return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'}))));
 held.add(name);try{return await callback();}finally{if(!options.steal)held.delete(name);}
}};}
test('a free lock runs the task once and returns its value',async()=>{const locks=fakeLocks();let runs=0;assert.equal(await lockWithTakeover('n',async()=>{runs++;return 'ok';},50,locks),'ok');assert.equal(runs,1);assert.equal(locks.held.size,0);});
test('a lock held by a frozen window is taken over instead of waiting forever',async()=>{const locks=fakeLocks();locks.held.add('n');let runs=0;assert.equal(await lockWithTakeover('n',async()=>{runs++;return 'taken';},20,locks),'taken');assert.equal(runs,1);});
test('a failing task is reported and never retried through takeover',async()=>{const locks=fakeLocks();let runs=0;await assert.rejects(()=>lockWithTakeover('n',async()=>{runs++;throw Object.assign(Error('boom'),{name:'AbortError'});},20,locks),/boom/);assert.equal(runs,1);});
test('without Web Locks the task still runs',async()=>{assert.equal(await lockWithTakeover('n',async()=>7,20,null),7);});

test('card state: result wins, then today, late, and the plan for future days',()=>{
 const day=d=>({training_date:d,state:'planned'}),today='2026-11-11';
 assert.equal(sessionState(day('2026-11-01'),{status:'done'},today),'done');
 assert.equal(sessionState(day(today),{status:'skipped'},today),'skipped');
 assert.equal(sessionState(day(today),{status:'planned'},today),'today');
 assert.equal(sessionState(day('2026-11-10'),undefined,today),'late');
 assert.equal(sessionState(day('2026-11-12'),undefined,today),'planned');
 assert.equal(sessionState({training_date:'2026-11-12',state:'open'},undefined,today),'open');
 assert.equal(sessionState({training_date:'2026-11-10',state:'open'},undefined,today),'late');
 for(const state of ['done','skipped','today','late','open'])assert.ok(SESSION_STATES[state]);assert.equal(SESSION_STATES.planned,'');
});

test('pasted plan: valid list becomes create operations for the chosen athletes only',()=>{
 const {items,skipped}=parsePlan('[{"data":"2026-11-13","titulo":" Rodagem leve ","descricao":"solto","km":8},{"data":"2026-11-14","titulo":"Longão","periodo":"Manhã"}]');
 assert.equal(items.length,2);assert.equal(skipped.length,0);
 assert.deepEqual(items[0],{training_date:'2026-11-13',period:'Não definido',title:'Rodagem leve',description:'solto',planned_km:8});
 let n=0;const ops=planOperations(items,'g1',['u1','u2'],()=>'id'+(++n));
 assert.equal(ops[1].kind,'create');assert.equal(ops[1].version,0);
 assert.deepEqual(ops[1].data,{id:'id2',group_id:'g1',training_date:'2026-11-14',period:'Manhã',title:'Longão',description:'',planned_km:null,state:'planned',target_user_ids:['u1','u2']});
 assert.throws(()=>planOperations(items,'g1',[],()=>'x'),/pelo menos um atleta/);
});
test('pasted plan: accepts {"treinos":[...]} and skips a repeat of an existing workout',()=>{
 const {items,skipped}=parsePlan('{"treinos":[{"data":"2026-11-13","titulo":"Rodagem"},{"data":"2026-11-13","titulo":"rodagem"},{"data":"2026-11-14","titulo":"Rodagem"}]}',[]);
 assert.equal(items.length,2);assert.equal(skipped.length,1);
 const again=parsePlan('[{"data":"2026-11-13","titulo":"Rodagem"}]',[{training_date:'2026-11-13',title:'Rodagem '}]);
 assert.equal(again.items.length,0);assert.equal(again.skipped.length,1);
});
test('pasted plan: rejects bad input with a clear message and never partially accepts',()=>{
 const bad=[['nao json',/JSON válido/],['[]',/pelo menos um/],['[1]',/formato inválido/],
  ['[{"data":"2026-02-30","titulo":"x"}]',/data/],['[{"data":"13/11/2026","titulo":"x"}]',/data/],
  ['[{"data":"2026-11-13","titulo":""}]',/titulo/],['[{"data":"2026-11-13","titulo":"x","periodo":"Madrugada"}]',/periodo/],
  ['[{"data":"2026-11-13","titulo":"x","km":-1}]',/Distância/],['[{"data":"2026-11-13","titulo":"x","descricao":5}]',/descricao/]];
 for(const [text,re] of bad)assert.throws(()=>parsePlan(text),re,text);
 assert.throws(()=>parsePlan(JSON.stringify(Array.from({length:32},()=>({data:'2026-11-13',titulo:'x'})))),/mais de 31/);
});
