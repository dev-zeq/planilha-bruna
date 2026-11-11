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
-- Three separate watch recordings form one private result.
set local role service_role;
do $$
declare version_before bigint;
begin
 perform public.strava_server_import('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','[{"activity_id":900000002,"name":"Synthetic main","sport_type":"Run","start_date":"2026-11-11T12:10:00Z","local_date":"2026-11-11","distance_m":2000,"moving_seconds":480,"elapsed_seconds":500},{"activity_id":900000003,"name":"Synthetic cooldown","sport_type":"Run","start_date":"2026-11-11T12:30:00Z","local_date":"2026-11-11","distance_m":3000,"moving_seconds":1080,"elapsed_seconds":1100}]');
 select version into version_before from public.training_results where session_id='a4000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 perform public.strava_server_link_many('a1000000-0000-4000-8000-000000000001',array[900000001,900000002,900000003]::bigint[],'a4000000-0000-4000-8000-000000000001',version_before);
 if not exists(select 1 from public.training_results where session_id='a4000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001' and actual_km=6 and duration_seconds=1860 and pace_seconds_per_km=310) then raise exception 'FAIL aggregated distance/time/weighted pace';end if;
 if (select count(*) from public.training_strava_result_activities where user_id='a1000000-0000-4000-8000-000000000001')<>3 then raise exception 'FAIL grouped links';end if;
 begin perform public.strava_server_link_many('a1000000-0000-4000-8000-000000000001',array[900000001,900000001]::bigint[],'a4000000-0000-4000-8000-000000000001',version_before+1);raise exception 'FAIL duplicate IDs';exception when raise_exception then if sqlerrm<>'Selecione de uma a dez atividades distintas' then raise;end if;end;
 begin perform public.strava_server_link_many('a1000000-0000-4000-8000-000000000001',array[900000001]::bigint[],'a4000000-0000-4000-8000-000000000001',version_before);raise exception 'FAIL stale result overwrite';exception when raise_exception then if sqlerrm<>'CONFLICT: resultado alterado' then raise;end if;end;
 begin perform public.strava_server_link_many('a1000000-0000-4000-8000-000000000002',array[900000001]::bigint[],'a4000000-0000-4000-8000-000000000001',1);raise exception 'FAIL cross-athlete grouping';exception when raise_exception then if sqlerrm<>'Atividades indisponíveis' then raise;end if;end;
 insert into public.training_sessions(id,group_id,training_date,title,created_by) values('a4000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','2026-11-11','Synthetic second session','a1000000-0000-4000-8000-000000000001');
 begin perform public.strava_server_link_many('a1000000-0000-4000-8000-000000000001',array[900000001]::bigint[],'a4000000-0000-4000-8000-000000000002',0);raise exception 'FAIL activity double counting';exception when unique_violation then null;end;
 if exists(select 1 from public.training_results where session_id='a4000000-0000-4000-8000-000000000002') then raise exception 'FAIL partial result on conflict';end if;
 delete from public.training_strava_activities where user_id='a1000000-0000-4000-8000-000000000001' and activity_id=900000003;
 if not exists(select 1 from public.training_results where user_id='a1000000-0000-4000-8000-000000000001' and actual_km=3 and duration_seconds=780 and pace_seconds_per_km=260) then raise exception 'FAIL deleted component recalculation';end if;
 -- Return to one source component for the existing privacy checks below.
 select version into version_before from public.training_results where session_id='a4000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 perform public.strava_server_link('a1000000-0000-4000-8000-000000000001',900000001,'a4000000-0000-4000-8000-000000000001',version_before);
 delete from public.training_strava_activities where user_id='a1000000-0000-4000-8000-000000000001' and activity_id=900000002;
end $$;

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
select 'PASS grouped activities, total distance/time, weighted pace, CAS, ownership, no double counting, deletion, legacy compatibility' as check_result;
rollback;
