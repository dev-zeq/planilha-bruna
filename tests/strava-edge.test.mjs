import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,normalizeActivity,validateTokens,linkInput,sha256,APP_ORIGIN} from '../supabase/functions/strava/logic.mjs';
const uid='a1000000-0000-4000-8000-000000000001',session='a2000000-0000-4000-8000-000000000001';
const now=1794412800000;
const tokens={access_token:'FAKE-ACCESS',refresh_token:'FAKE-REFRESH',expires_at:Math.floor(now/1000)+3600};
const activity={id:12,name:'Run',sport_type:'Run',distance:10000,moving_time:2400,elapsed_time:2500,start_date:'2026-11-11T12:00:00Z',start_date_local:'2026-11-11T09:00:00Z'};
function fixture(options={}){
 const calls=[],network=[];
 const admin={auth:{getUser:async token=>({data:{user:token==='valid'?{id:uid}:null},error:token==='valid'?null:Error('invalid')})},from(table){let selectedUid;const q={select(){return q;},eq(k,v){selectedUid=v;return q;},limit(){return Promise.resolve({data:options.outsider?[]:[{user_id:selectedUid}]});},maybeSingle(){return Promise.resolve({data:options.connection||null});}};return q;},async rpc(name,args){calls.push({name,args});if(name==='strava_server_state')return {data:args.p_consume?options.validState!==false:true};if(name==='strava_server_token')return {data:args.p_release||args.p_update?null:options.tokens||tokens};if(name==='strava_server_import')return {data:args.p_items.length};return {data:null};}};
 const envValues={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'FAKE-SERVER-KEY',STRAVA_CLIENT_ID:'123',STRAVA_CLIENT_SECRET:'FAKE-CLIENT-SECRET'};
 if(options.unconfigured)delete envValues.STRAVA_CLIENT_SECRET;
 const handler=createHandler({createClient:()=>admin,env:n=>envValues[n],now:()=>now,fetcher:async(url,opts)=>{network.push({url,opts});if(options.fetcher)return options.fetcher(url,opts);if(url.endsWith('/oauth/token'))return Response.json({...tokens,athlete:{id:99,firstname:'Test',lastname:'Athlete'}});if(url.includes('/activities'))return Response.json([activity]);return Response.json({});}});
 const request=(body,headers={},method='POST')=>handler(new Request('https://example.supabase.co/functions/v1/strava',{method,headers:{Origin:APP_ORIGIN,Authorization:'Bearer valid','Content-Type':'application/json',...headers},...(method==='POST'?{body:JSON.stringify(body)}:{})}));
 return {handler,request,calls,network};
}
test('Strava auth and CORS reject outside callers before any token access',async()=>{
 const f=fixture();assert.equal((await f.request({action:'sync'},{Authorization:''})).status,401);assert.equal((await f.request({action:'sync'},{Origin:'https://attacker.invalid'})).status,403);assert.equal((await f.request({}, {},'GET')).status,405);assert.equal((await fixture({outsider:true}).request({action:'status'})).status,403);assert.equal(f.calls.length,0);assert.equal(f.network.length,0);
});
test('Strava status safe while credentials are not configured',async()=>{const f=fixture({unconfigured:true});const r=await f.request({action:'status'});assert.deepEqual(await r.json(),{configured:false,connection:null,automatic:null,can_enable_auto:false});assert.equal((await f.request({action:'start'})).status,503);assert.equal(f.network.length,0);});
test('OAuth start persists only hash tied to authenticated user and fixed callback',async()=>{
 const f=fixture();const body=await (await f.request({action:'start',user_id:'attacker'})).json();const u=new URL(body.url);assert.equal(u.searchParams.get('redirect_uri'),APP_ORIGIN+'/');assert.equal(u.searchParams.get('scope'),'read,activity:read_all');assert.equal(f.calls[0].args.p_user,uid);assert.equal(f.calls[0].args.p_hash,await sha256(body.state));assert.notEqual(f.calls[0].args.p_hash,body.state);
});
test('OAuth invalid, reused or other-user state cannot exchange a code',async()=>{const f=fixture({validState:false});const r=await f.request({action:'exchange',state:'a'.repeat(64),code:'test-code',scope:'read,activity:read_all'});assert.equal(r.status,400);assert.equal(f.network.length,0);assert.equal(f.calls[0].args.p_user,uid);});
test('OAuth exchange checks scopes and stores tokens only in server RPC',async()=>{
 const f=fixture();assert.equal((await f.request({action:'exchange',state:'a'.repeat(64),code:'test-code',scope:'read'})).status,400);
 const response=await f.request({action:'exchange',state:'a'.repeat(64),code:'test-code',scope:'read,activity:read_all'});const data=await response.json();assert.deepEqual(data,{connected:true});assert.equal(f.calls.find(c=>c.name==='strava_server_connect').args.p_tokens.access_token,'FAKE-ACCESS');assert(!JSON.stringify(data).includes('FAKE'));assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('Sync only imports minimal running fields and releases token lease',async()=>{
 const f=fixture();const data=await (await f.request({action:'sync'})).json();assert.deepEqual(data,{imported:1,days:30});const imported=f.calls.find(c=>c.name==='strava_server_import');assert.equal(imported.args.p_user,uid);assert.equal(imported.args.p_items[0].distance_m,10000);assert.equal(imported.args.p_items[0].local_date,'2026-11-11');assert.equal(imported.args.p_items[0].map,undefined);assert.equal(f.calls.at(-1).args.p_release,true);
});
test('Expired tokens refresh under lease; refresh tokens never reach browser',async()=>{const f=fixture({tokens:{...tokens,expires_at:1}});const data=await (await f.request({action:'sync'})).json();assert.equal(data.imported,1);assert(f.calls.some(c=>c.name==='strava_server_token'&&c.args.p_update));assert(!JSON.stringify(data).includes('FAKE'));});
test('Provider revocation cleans API data and errors never echo tokens',async()=>{const f=fixture({fetcher:async()=>new Response('private provider body',{status:401})});const response=await f.request({action:'sync'});assert.equal(response.status,401);assert(f.calls.some(c=>c.name==='strava_server_disconnect'));assert(!(await response.text()).includes('private provider'));});
test('Rate limit stops sync and releases lease without importing partial data',async()=>{const f=fixture({fetcher:async()=>new Response('{}',{status:429})});assert.equal((await f.request({action:'sync'})).status,429);assert(!f.calls.some(c=>c.name==='strava_server_import'));assert.equal(f.calls.at(-1).args.p_release,true);});
test('Activity normalization excludes GPS and nonrunning sports; invalid data rejected',()=>{assert.equal(normalizeActivity({...activity,sport_type:'Ride'}),null);assert.throws(()=>normalizeActivity({...activity,distance:-1}));assert.throws(()=>validateTokens({...tokens,expires_at:1},2));assert.deepEqual(linkInput({activity_id:12,session_id:session,version:0}),{activity:12,session,version:0});assert.throws(()=>linkInput({activity_id:12,session_id:session,version:-1}));});
test('Disconnect requires confirmation and invokes cleanup only for authenticated user',async()=>{const f=fixture();assert.equal((await f.request({action:'disconnect'})).status,400);assert.equal((await f.request({action:'disconnect',confirm:true,user_id:'attacker'})).status,200);assert.equal(f.calls.at(-1).args.p_user,uid);assert.equal(f.calls.at(-1).name,'strava_server_disconnect');});
