import {createClient} from 'npm:@supabase/supabase-js@2.81.1';
import {createHandler} from './logic.mjs';
Deno.serve(createHandler({createClient,env:(name:string)=>Deno.env.get(name)}));
