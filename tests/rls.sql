-- Real Postgres roles + distinct auth.uid(), all fixtures rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','athlete-a@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000002','athlete-b@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000003','athlete-c@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000004','outsider@example.invalid',now());
insert into public.training_groups(id,name,owner_id) values
 ('20000000-0000-4000-8000-000000000001','Test group A','10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002','Test group B','10000000-0000-4000-8000-000000000004');
insert into public.training_members(group_id,user_id,display_name) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','A'),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','B'),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','C'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','X');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin
 if (select count(*) from public.training_members)<>3 then raise exception 'FAIL member visibility'; end if;
 if public.claim_training_invitation() is not null then raise exception 'FAIL invitation not required'; end if;
 begin
  insert into public.training_members values('20000000-0000-4000-8000-000000000002',auth.uid(),'Intruder',now());
  raise exception 'FAIL self enrollment';
 exception when insufficient_privilege then null; end;
 perform public.apply_training_operation('30000000-0000-4000-8000-000000000001','{"kind":"create","data":{"id":"40000000-0000-4000-8000-000000000001","group_id":"20000000-0000-4000-8000-000000000001","training_date":"2026-11-11","period":"Manhã","title":"Test"}}');
 perform public.apply_training_operation('30000000-0000-4000-8000-000000000001','{"kind":"create","data":{"id":"40000000-0000-4000-8000-000000000001","group_id":"20000000-0000-4000-8000-000000000001","training_date":"2026-11-11","period":"Manhã","title":"Test"}}');
 if (select count(*) from public.training_sessions)<>1 then raise exception 'FAIL duplicate retry'; end if;
 begin
  insert into public.training_sessions(group_id,training_date,title) values('20000000-0000-4000-8000-000000000002',current_date,'intruder');
  raise exception 'FAIL cross group create';
 exception when insufficient_privilege then null; end;
 perform public.apply_training_operation('30000000-0000-4000-8000-000000000002','{"kind":"result","version":0,"data":{"session_id":"40000000-0000-4000-8000-000000000001","status":"done","actual_km":10,"duration_seconds":2400,"notes":"A only"}}');
 if (select pace_seconds_per_km from public.training_results)<>240 then raise exception 'FAIL pace'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin
 if (select count(*) from public.training_sessions)<>1 then raise exception 'FAIL shared read B'; end if;
 if exists(select 1 from public.training_results where user_id=auth.uid()) then raise exception 'FAIL auto completion B'; end if;
 update public.training_results set notes='tamper' where user_id='10000000-0000-4000-8000-000000000001';
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL other result update'; end if;
 begin
  insert into public.training_results(session_id,user_id,status) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','skipped');
  raise exception 'FAIL other result insert';
 exception when insufficient_privilege then null; end;
 perform public.apply_training_operation('30000000-0000-4000-8000-000000000003','{"kind":"update","version":1,"data":{"id":"40000000-0000-4000-8000-000000000001","training_date":"2026-11-12","period":"Tarde","title":"B edited","description":"","planned_km":12,"state":"planned","target_user_ids":[]}}');
 begin
  perform public.apply_training_operation('30000000-0000-4000-8000-000000000004','{"kind":"delete","version":1,"data":{"id":"40000000-0000-4000-8000-000000000001"}}');
  raise exception 'FAIL stale version';
 exception when raise_exception then if sqlerrm not like 'CONFLICT:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ begin
 if (select title from public.training_sessions)<>'B edited' then raise exception 'FAIL shared edit C'; end if;
 if exists(select 1 from public.training_results where user_id=auth.uid()) then raise exception 'FAIL auto completion C'; end if;
 perform public.apply_training_operation('30000000-0000-4000-8000-000000000005','{"kind":"result","version":0,"data":{"session_id":"40000000-0000-4000-8000-000000000001","status":"done","actual_km":5,"duration_seconds":1500}}');
 if (select count(*) from public.training_results)<>2 then raise exception 'FAIL separate results'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin
 if exists(select 1 from public.training_sessions) or exists(select 1 from public.training_results) then raise exception 'FAIL outsider isolation'; end if;
end $$;
reset role;
insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000005','invited@example.invalid');
insert into training_private.authorizations(email,display_name,group_id) values('invited@example.invalid','Invited','20000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
do $$ begin
 if public.claim_training_invitation() is not null then raise exception 'FAIL unconfirmed invitation'; end if;
 begin perform * from training_private.authorizations; raise exception 'FAIL private authorizations visible'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update auth.users set email_confirmed_at=now() where id='10000000-0000-4000-8000-000000000005';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
do $$ begin
 if public.claim_training_invitation()<>'20000000-0000-4000-8000-000000000001'::uuid then raise exception 'FAIL confirmed invitation'; end if;
 if (select count(*) from public.training_members where user_id=auth.uid())<>1 then raise exception 'FAIL authorized membership'; end if;
 perform public.claim_training_invitation();
 if (select count(*) from public.training_members where user_id=auth.uid())<>1 then raise exception 'FAIL duplicate invitation'; end if;
end $$;
reset role;
delete from public.training_members where user_id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ declare n int; begin
 if exists(select 1 from public.training_results) then raise exception 'FAIL revoked result read'; end if;
 update public.training_results set notes='revoked'; get diagnostics n=row_count;
 if n<>0 then raise exception 'FAIL revoked result write'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.training_sessions; raise exception 'FAIL anonymous read'; exception when insufficient_privilege then null; end;
 begin perform public.claim_training_invitation(); raise exception 'FAIL anonymous claim'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
