// Run on CI with system Chrome. Uses isolated in-memory Supabase mock, never real accounts.
import http from 'node:http';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
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
const proc=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--virtual-time-budget=20000','--dump-dom',`http://127.0.0.1:${server.address().port}/`]);
let stdout='',stderr='';proc.stdout.on('data',x=>stdout+=x);proc.stderr.on('data',x=>stderr+=x);
const timeout=setTimeout(()=>proc.kill(),45000);
const code=await new Promise((resolve,reject)=>{proc.on('exit',resolve);proc.on('error',reject);}).finally(()=>{clearTimeout(timeout);server.close();});
await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/browser-dom.html',stdout);await fs.writeFile('test-results/browser-stderr.txt',stderr);
const result=stdout.match(/<pre id="smoke-result">([\s\S]*?)<\/pre>/)?.[1];
console.log(result||stderr.slice(-2000));
if(code!==0||!result?.startsWith('PASS:'))process.exitCode=1;
