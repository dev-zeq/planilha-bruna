-- Synthetic identities and fake tokens only. Always rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('a1000000-0000-4000-8000-000000000001','strava-a@example.invalid',now()),
 ('a1000000-0000-4000-8000-000000000002','strava-b@example.invalid',now());
insert into public.training_groups(id,name,owner_id) values('a2000000-0000-4000-8000-000000000001','Strava test','a1000000-0000-4000-8000-000000000001');
insert into public.training_members(group_id,user_id,display_name) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Fixture A'),
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','Fixture B');
set local role service_role;
do $$ declare token jsonb;ok boolean;begin
 perform public.strava_server_connect('a1000000-0000-4000-8000-000000000001',900000001,'Synthetic athlete',array['read','activity:read_all'],jsonb_build_object('access_token','FAKE-ACCESS-TEST','refresh_token','FAKE-REFRESH-TEST','expires_at',floor(extract(epoch from now()))+3600));
 if exists(select 1 from vault.secrets where name='treinos_strava_a1000000-0000-4000-8000-000000000001' and secret like '%FAKE-ACCESS-TEST%') then raise exception 'FAIL Vault plaintext'; end if;
 perform public.strava_server_state('a1000000-0000-4000-8000-000000000001',repeat('a',64));
 ok:=public.strava_server_state('a1000000-0000-4000-8000-000000000002',repeat('a',64),true);if ok then raise exception 'FAIL cross-user state'; end if;
 ok:=public.strava_server_state('a1000000-0000-4000-8000-000000000001',repeat('a',64),true);if not ok then raise exception 'FAIL state consumption'; end if;
 ok:=public.strava_server_state('a1000000-0000-4000-8000-000000000001',repeat('a',64),true);if ok then raise exception 'FAIL state replay'; end if;
 token:=public.strava_server_token('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001');
 if token->>'access_token'<>'FAKE-ACCESS-TEST' then raise exception 'FAIL Vault read'; end if;
 begin
  perform public.strava_server_token('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002');raise exception 'FAIL concurrent lease';
 exception when raise_exception then if sqlerrm<>'BUSY_OR_NOT_CONNECTED' then raise;end if;end;
 perform public.strava_server_import('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','[{"activity_id":900000001,"name":"Synthetic run","sport_type":"Run","start_date":"2026-11-11T12:00:00Z","local_date":"2026-11-11","distance_m":1000,"moving_seconds":300,"elapsed_seconds":330}]');
 perform public.strava_server_import('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','[{"activity_id":900000001,"name":"Synthetic run","sport_type":"Run","start_date":"2026-11-11T12:00:00Z","local_date":"2026-11-11","distance_m":1000,"moving_seconds":300,"elapsed_seconds":330}]');
 if (select count(*) from public.training_strava_activities where user_id='a1000000-0000-4000-8000-000000000001')<>1 then raise exception 'FAIL duplicate activity';end if;
end $$;
insert into public.training_sessions(id,group_id,training_date,title,created_by) values('a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','2026-11-11','Synthetic planned session','a1000000-0000-4000-8000-000000000001');
select public.strava_server_link('a1000000-0000-4000-8000-000000000001',900000001,'a4000000-0000-4000-8000-000000000001',0);
insert into public.training_results(session_id,user_id,status) values('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','planned');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$ begin
 if (select count(*) from public.training_strava_activities)<>1 then raise exception 'FAIL owner activity access';end if;
 if (select count(*) from public.training_results where session_id='a4000000-0000-4000-8000-000000000001')<>2 then raise exception 'FAIL private own and manual shared';end if;
 begin perform public.strava_server_token(auth.uid(),'a3000000-0000-4000-8000-000000000003');raise exception 'FAIL browser token RPC';exception when insufficient_privilege then null;end;
 begin perform * from training_private.strava_credentials;raise exception 'FAIL private credentials access';exception when insufficient_privilege then null;end;
 begin
  update public.training_results set source='manual',strava_activity_id=null where session_id='a4000000-0000-4000-8000-000000000001' and user_id=auth.uid();raise exception 'FAIL private source removal';
 exception when raise_exception then if sqlerrm<>'Origem Strava protegida' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.training_strava_activities) then raise exception 'FAIL activity leak';end if;
 if (select count(*) from public.training_results where session_id='a4000000-0000-4000-8000-000000000001')<>1 then raise exception 'FAIL imported result leak';end if;
 if exists(select 1 from public.training_strava_connections) then raise exception 'FAIL connection leak';end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.training_strava_activities;raise exception 'FAIL anonymous';exception when insufficient_privilege then null;end;
 begin perform public.strava_server_disconnect('a1000000-0000-4000-8000-000000000001');raise exception 'FAIL anonymous server RPC';exception when insufficient_privilege then null;end;
end $$;
-- Automation fixtures: all work is still inside the surrounding rollback.
set local role service_role;
do $$
declare accepted boolean;j jsonb;again jsonb;claim_id uuid:='a5000000-0000-4000-8000-000000000001';
 t bigint:=floor(extract(epoch from now()));
 item jsonb:='{"activity_id":900000001,"name":"Synthetic corrected run","sport_type":"Run","start_date":"2026-11-11T12:00:00Z","local_date":"2026-11-11","distance_m":2000,"moving_seconds":600,"elapsed_seconds":630}';
begin
 perform public.strava_server_auto_config(999999);
 if not public.strava_server_probe('a1000000-0000-4000-8000-000000000001') then raise exception 'FAIL live probe enqueue';end if;
 delete from training_private.strava_events where user_id='a1000000-0000-4000-8000-000000000001';
 accepted:=public.strava_server_enqueue(999999,900000001,900000001,'activity','update',t,repeat('1',64));if not accepted then raise exception 'FAIL enqueue';end if;
 accepted:=public.strava_server_enqueue(999999,900000001,900000001,'activity','update',t,repeat('1',64));if accepted then raise exception 'FAIL event duplicate';end if;
 begin perform public.strava_server_enqueue(888888,900000001,900000001,'activity','update',t,repeat('0',64));raise exception 'FAIL wrong subscription';exception when raise_exception then if sqlerrm<>'Assinatura inválida' then raise;end if;end;
 j:=public.strava_server_claim(claim_id);if j is null or (j->>'owner_id')::bigint<>900000001 then raise exception 'FAIL claim';end if;
 again:=public.strava_server_claim('a5000000-0000-4000-8000-000000000002');if again is not null then raise exception 'FAIL parallel claim';end if;
 begin perform public.strava_server_finish((j->>'id')::uuid,'a5000000-0000-4000-8000-000000000002','remove');raise exception 'FAIL unclaimed mutation';exception when raise_exception then if sqlerrm<>'BUSY: evento não adquirido' then raise;end if;end;
 perform public.strava_server_finish((j->>'id')::uuid,claim_id,'upsert','a3000000-0000-4000-8000-000000000001',item);
 if not exists(select 1 from public.training_results where user_id='a1000000-0000-4000-8000-000000000001' and actual_km=2 and duration_seconds=600) then raise exception 'FAIL linked metric update';end if;
 if not exists(select 1 from public.training_results where user_id='a1000000-0000-4000-8000-000000000002' and status='planned' and source='manual') then raise exception 'FAIL another athlete changed';end if;
 -- User-edited metrics must survive a later source correction.
 update public.training_results set actual_km=3 where user_id='a1000000-0000-4000-8000-000000000001';
 item:=jsonb_set(item,'{distance_m}','2500');
 perform public.strava_server_import('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001',jsonb_build_array(item));
 if not exists(select 1 from public.training_results where user_id='a1000000-0000-4000-8000-000000000001' and actual_km=3) then raise exception 'FAIL manual metrics overwritten';end if;
 perform public.strava_server_enqueue(999999,900000001,900000001,'activity','delete',t,repeat('2',64));j:=public.strava_server_claim(claim_id);
 perform public.strava_server_finish((j->>'id')::uuid,claim_id,'retry',p_error:='HTTP_429');
 if not exists(select 1 from training_private.strava_events where id=(j->>'id')::uuid and next_at>now() and claim is null and done_at is null and attempts=1) then raise exception 'FAIL retry backoff';end if;
 update training_private.strava_events set next_at=now() where id=(j->>'id')::uuid;
 j:=public.strava_server_claim(claim_id);perform public.strava_server_finish((j->>'id')::uuid,claim_id,'remove');
 if exists(select 1 from public.training_strava_activities where user_id='a1000000-0000-4000-8000-000000000001') or exists(select 1 from public.training_results where user_id='a1000000-0000-4000-8000-000000000001') then raise exception 'FAIL delete cleanup';end if;
 -- A delayed revocation cannot erase a newly authorized connection.
 perform public.strava_server_enqueue(999999,900000001,900000001,'revoke','update',t,repeat('3',64));j:=public.strava_server_claim(claim_id);
 update public.training_strava_connections set connected_at=connected_at+interval '1 second' where user_id='a1000000-0000-4000-8000-000000000001';
 perform public.strava_server_finish((j->>'id')::uuid,claim_id,'revoke');
 if not exists(select 1 from public.training_strava_connections where user_id='a1000000-0000-4000-8000-000000000001') then raise exception 'FAIL stale revocation erased new connection';end if;
 perform public.strava_server_enqueue(999999,900000001,900000001,'revoke','update',t+2,repeat('4',64));j:=public.strava_server_claim(claim_id);perform public.strava_server_finish((j->>'id')::uuid,claim_id,'revoke');
 if exists(select 1 from public.training_strava_connections where user_id='a1000000-0000-4000-8000-000000000001') or exists(select 1 from vault.secrets where name='treinos_strava_a1000000-0000-4000-8000-000000000001') then raise exception 'FAIL revocation cleanup';end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform public.strava_server_claim(gen_random_uuid());raise exception 'FAIL browser queue claim';exception when insufficient_privilege then null;end;
 begin perform * from training_private.strava_events;raise exception 'FAIL private inbox exposed';exception when insufficient_privilege then null;end;
 begin perform public.strava_server_auto_config(123);raise exception 'FAIL browser config';exception when insufficient_privilege then null;end;
end $$;

set local role service_role;
select public.strava_server_disconnect('a1000000-0000-4000-8000-000000000001');
do $$ begin
 if exists(select 1 from public.training_strava_activities where user_id='a1000000-0000-4000-8000-000000000001') then raise exception 'FAIL disconnect activity cleanup';end if;
 if exists(select 1 from public.training_results where session_id='a4000000-0000-4000-8000-000000000001' and source='strava') then raise exception 'FAIL disconnect imported result cleanup';end if;
 if not exists(select 1 from public.training_results where session_id='a4000000-0000-4000-8000-000000000001' and source='manual') then raise exception 'FAIL manual result deleted';end if;
 if exists(select 1 from vault.secrets where name='treinos_strava_a1000000-0000-4000-8000-000000000001') then raise exception 'FAIL Vault cleanup';end if;
end $$;
select public.strava_server_connect('a1000000-0000-4000-8000-000000000001',900000001,'Synthetic athlete',array['read'],jsonb_build_object('access_token','FAKE-ACCESS-TEST','refresh_token','FAKE-REFRESH-TEST','expires_at',floor(extract(epoch from now()))+3600));
reset role;
delete from public.training_members where user_id='a1000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.training_strava_connections where user_id='a1000000-0000-4000-8000-000000000001') then raise exception 'FAIL membership revocation cleanup';end if;
 if exists(select 1 from vault.secrets where name='treinos_strava_a1000000-0000-4000-8000-000000000001') then raise exception 'FAIL membership Vault cleanup';end if;
end $$;
select 'PASS automation inbox, idempotency, claims, retries, linked updates, deletion, epochs, revocation and access' as check_result;
rollback;
