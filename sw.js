const CACHE='treinos-shell-v2.6.0';
const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.1/dist/umd/supabase.js';
const ASSETS=['./','./index.html','./styles.css','./app.js','./core.mjs','./strava-client.mjs','./icon-512.png','./manifest.webmanifest','./icon.svg',SDK];
const urls=ASSETS.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})))));
});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('treinos-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET')return;
 // Auth, REST and private data never enter the shell cache.
 if(url.origin!==self.location.origin&&url.href!==SDK)return;
 if(event.request.mode==='navigate'&&url.origin===self.location.origin){
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(new URL('./index.html',self.registration.scope).href)).then(found=>found||fetch(event.request)));return;
 }
 if(!urls.includes(url.href))return;
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(found=>found||fetch(event.request)));
});
