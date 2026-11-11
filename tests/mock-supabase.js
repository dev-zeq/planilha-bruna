// Test only: fixture users and backend. Never included by production index.html.
(() => {
 const users=[{id:'a',email:'a@example.invalid'},{id:'b',email:'b@example.invalid'},{id:'c',email:'c@example.invalid'}];
 const members=users.map((u,i)=>({user_id:u.id,group_id:'g',display_name:['Ezequiel','Bruna','Renato Cirino'][i]}));
 const state={sessions:[],results:[],operations:new Set(),user:null,callback:()=>{},offline:false};
 state.invitation=new URLSearchParams(location.hash.slice(1)).get('type')==='invite';if(state.invitation)state.user=users[0];
 const tables={training_members:members,training_sessions:state.sessions,training_results:state.results};
 window.testBackend=state;window.confirm=()=>true;
 const query=table=>{
  let filters=[],start=0,end=Infinity,limit=Infinity;
  const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},is(k,v){filters.push(r=>(r[k]??null)===v);return q;},in(k,v){filters.push(r=>v.includes(r[k]));return q;},order(){return q;},limit(n){limit=n;return q;},range(a,b){start=a;end=b;return q;},then(resolve){resolve({data:structuredClone(tables[table].filter(r=>filters.every(f=>f(r))).slice(start,Math.min(end+1,limit))),error:null});}};return q;
 };
 const client={from:query,async rpc(name,{op_id,body}={}){
  if(state.offline)return {error:{message:'Failed to fetch'}};
  if(name==='claim_training_invitation')return {data:'g'};
  if(state.operations.has(op_id))return {data:null};
  const d=body.data;
  if(body.kind==='create'||body.kind==='import'){if(!state.sessions.some(s=>s.id===d.id))state.sessions.push({...d,version:1,deleted_at:null});}
  else if(body.kind==='update'||body.kind==='delete'){
   const s=state.sessions.find(s=>s.id===d.id);if(!s||s.version!==body.version)return {error:{message:'CONFLICT: stale'}};
   Object.assign(s,body.kind==='delete'?{deleted_at:'now'}:d,{version:s.version+1});
  }else if(body.kind==='result'){
   let r=state.results.find(r=>r.session_id===d.session_id&&r.user_id===state.user.id);
   if((r?.version||0)!==body.version)return {error:{message:'CONFLICT: result'}};
   if(!r){r={user_id:state.user.id,version:0};state.results.push(r);}Object.assign(r,d,{version:r.version+1});
  }
  state.operations.add(op_id);return {data:null};
 },auth:{
  async getSession(){return {data:{session:state.user?{user:state.user}:null}};},
  onAuthStateChange(callback){state.callback=callback;},
  async signInWithPassword({email}){state.user=users.find(u=>u.email===email);return {data:{session:{user:state.user}}};},
  async signOut(){state.user=null;state.callback('SIGNED_OUT',null);return {};},
  async resetPasswordForEmail(){return {};},async signUp(){return {data:{session:null}};},async updateUser(){state.passwordSet=true;return {};}
 }};
 window.supabase={createClient:()=>{history.replaceState(null,'',location.pathname);return client;}};
})();
