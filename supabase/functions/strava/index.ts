import {createClient} from 'npm:@supabase/supabase-js@2.81.1';
import {createHandler} from './logic.mjs';
declare const EdgeRuntime:{waitUntil(task:Promise<unknown>):void};
Deno.serve(createHandler({createClient,env:(name:string)=>Deno.env.get(name),background:(task:Promise<unknown>)=>EdgeRuntime.waitUntil(task)}));
