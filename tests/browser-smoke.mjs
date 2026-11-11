// Run on CI with system Chrome. Uses isolated in-memory Supabase mock, never real accounts.
import http from 'node:http';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const root=path.resolve('.');
const server=http.createServer(async(req,res)=>{
 try{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/sw.js'){res.writeHead(404);res.end();return;}
  const file=path.join(root,name==='/'?'index.html':name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  let text=await fs.readFile(file);
  if(name==='/')text=Buffer.from(text.toString().replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.1/dist/umd/supabase.js" defer></script>','<script src="/tests/mock-supabase.js"></script>').replace('</body>','<script type="module" src="/tests/browser-scenarios.js"></script></body>'));
  res.setHeader('Content-Type',name==='/'?'text/html':/\.(mjs|js)$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':'application/json');res.end(text);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const chrome=process.env.CHROME_BIN||'google-chrome';
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'treinos-chrome-'));
const proc=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile]);
let stderr='',seq=0;const pending=new Map();let socket;
const timeout=setTimeout(()=>proc.kill(),45000);
try {
 const wsURL=await new Promise((resolve,reject)=>{proc.on('error',reject);proc.stderr.on('data',x=>{stderr+=x;const match=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match)resolve(match[1]);});});
 socket=new WebSocket(wsURL);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const task=pending.get(data.id);pending.delete(data.id);if(data.error)task.reject(Error(JSON.stringify(data.error)));else task.resolve(data.result);}};
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));});
 const target=await send('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 const page=(method,params)=>send(method,params,sessionId);
 await page('Page.enable');await page('Runtime.enable');
 await page('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await page('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
 let result;for(let i=0;i<250;i++){const value=await page('Runtime.evaluate',{expression:"document.querySelector('#smoke-result')?.textContent",returnByValue:true});result=value.result.value;if(result)break;await new Promise(r=>setTimeout(r,100));}
 await fs.mkdir('test-results',{recursive:true});
 const dom=await page('Runtime.evaluate',{expression:'document.documentElement.outerHTML',returnByValue:true});await fs.writeFile('test-results/browser-dom.html',dom.result.value);
 const mobile=await page('Page.captureScreenshot',{format:'png'});await fs.writeFile('test-results/mobile.png',Buffer.from(mobile.data,'base64'));
 const overflow=await page('Runtime.evaluate',{expression:'document.documentElement.scrollWidth>innerWidth+1',returnByValue:true});
 await page('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 const desktop=await page('Page.captureScreenshot',{format:'png'});await fs.writeFile('test-results/desktop.png',Buffer.from(desktop.data,'base64'));
 console.log(result||'FAIL: browser scenario never finished');
 if(!result?.startsWith('PASS:')||overflow.result.value)throw Error('Browser tests failed; mobile overflow='+overflow.result.value);
} finally {
 clearTimeout(timeout);socket?.close();proc.kill();server.close();await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/browser-stderr.txt',stderr);await fs.rm(profile,{recursive:true,force:true}).catch(()=>{});
}
