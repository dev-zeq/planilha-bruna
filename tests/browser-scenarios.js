const $=id=>document.getElementById(id),state=window.testBackend;
const wait=async predicate=>{for(let i=0;i<500;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timeout waiting for UI');};
const assert=(value,text)=>{if(!value)throw Error(text);};
const submit=id=>$(id).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
const login=async email=>{$('email').value=email;$('password').value='test-only-password';submit('authForm');await wait(()=>!$('appPanel').hidden);await wait(()=>document.querySelectorAll('[data-filter]').length===4);};
const statusSynced=()=>$('statusMessage').textContent.includes('Todas as alterações');
try{
 if(state.invitation){await wait(()=>$('authTitle').textContent==='Definir nova senha');assert($('appPanel').hidden,'invite waits for password');$('password').value='test-only-new-password';submit('authForm');await wait(()=>!$('appPanel').hidden);assert(state.passwordSet,'invitation password saved');await wait(()=>document.querySelectorAll('[data-filter]').length===4);$('logout').click();await wait(()=>!$('authPanel').hidden);}
 await wait(()=>$('statusMessage').textContent.includes('Entre para'));
 await login('a@example.invalid');await wait(statusSynced);
 $('new').click();assert($('sessionDialog').open,'new dialog');$('titleInput').value='<img src=x onerror=alert(1)>';$('trainingDate').value=new Date().toISOString().slice(0,10);$('plannedInput').value='10';submit('sessionForm');
 await wait(()=>state.sessions.length===1);await wait(statusSynced);
 assert(!document.querySelector('#days img'),'XSS title escaped');
 document.querySelector('[data-result]').click();$('actualInput').value='10';$('durationInput').value='00:40:00';submit('resultForm');await wait(()=>state.results.length===1);await wait(statusSynced);
 assert(state.results[0].user_id==='a','result identity A');
 $('logout').click();await wait(()=>!$('authPanel').hidden);await login('b@example.invalid');await wait(statusSynced);
 assert(document.querySelectorAll('.entry').length===1,'B sees shared session');assert(state.results.length===1,'B not automatically complete');assert(document.querySelector('[data-result]').textContent==='Concluir treino','B owns independent action');
 document.querySelector('[data-edit]').click();$('titleInput').value='B updated';submit('sessionForm');await wait(()=>state.sessions[0].title==='B updated');await wait(statusSynced);
 $('logout').click();await wait(()=>!$('authPanel').hidden);await login('c@example.invalid');await wait(statusSynced);assert($('days').textContent.includes('B updated'),'C sees edit');assert(state.results.length===1,'C independent');
 // Simulated network failure: persist operation and send on retry.
 state.offline=true;$('new').click();$('titleInput').value='Offline pending';$('trainingDate').value=new Date().toISOString().slice(0,10);submit('sessionForm');await wait(()=>!$('queuePanel').hidden);assert(state.sessions.length===1,'offline not falsely confirmed');
 state.offline=false;$('refresh').click();await wait(()=>state.sessions.length===2);await wait(statusSynced);
 // Concurrent edit: stale version must stop queue without overwriting.
 document.querySelector('[data-edit="'+state.sessions[0].id+'"]').click();state.sessions[0].version++;$('titleInput').value='Stale edit';submit('sessionForm');await wait(()=>Boolean(document.querySelector('[data-discard]')));assert(state.sessions[0].title==='B updated','conflict preserves remote edit');
 document.querySelector('[data-discard]').click();await wait(()=>$('queuePanel').hidden);await wait(statusSynced);
 document.querySelector('[data-delete="'+state.sessions[0].id+'"]').click();await wait(()=>state.sessions[0].deleted_at);await wait(statusSynced);assert(document.querySelectorAll('.entry').length===1,'deleted session hidden');
 const result=document.createElement('pre');result.id='smoke-result';result.textContent='PASS: invite password setup, login A/B/C, shared create/edit/delete, own completion, escaped HTML, persisted network failure, retry and CAS conflict';document.body.append(result);
}catch(error){const result=document.createElement('pre');result.id='smoke-result';result.textContent='FAIL: '+error.stack+'; STATUS: '+$('statusMessage').textContent;document.body.append(result);}
