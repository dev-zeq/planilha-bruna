-- Synthetic identities only. Always rolled back.
-- Verifies opt-in sharing of Strava-sourced results (supabase/strava-group-sharing.sql).
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('b1000000-0000-4000-8000-000000000001','share-a@example.invalid',now()),
 ('b1000000-0000-4000-8000-000000000002','share-b@example.invalid',now()),
 ('b1000000-0000-4000-8000-000000000003','share-outsider@example.invalid',now());
insert into public.training_groups(id,name,owner_id) values
 ('b2000000-0000-4000-8000-000000000001','Sharing test','b1000000-0000-4000-8000-000000000001'),
 ('b2000000-0000-4000-8000-000000000002','Other group','b1000000-0000-4000-8000-000000000003');
insert into public.training_members(group_id,user_id,display_name) values
 ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Fixture A'),
 ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','Fixture B'),
 ('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000003','Outsider');
insert into public.training_sessions(id,group_id,training_date,period,title,created_by) values
 ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001',current_date,'Manhã','Sharing fixture','b1000000-0000-4000-8000-000000000001');
insert into public.training_strava_connections(user_id,athlete_id,athlete_name,scopes) values
 ('b1000000-0000-4000-8000-000000000001',900000101,'Synthetic athlete',array['read','activity:read_all']);
set local role service_role;
insert into public.training_results(session_id,user_id,status,actual_km,duration_seconds,source) values
 ('b3000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','done',10,3000,'strava');
reset role;

create function pg_temp.visible_to(reader uuid) returns integer language plpgsql as $$
declare n integer;
begin
 perform set_config('request.jwt.claims',json_build_object('sub',reader,'role','authenticated')::text,true);
 set local role authenticated;
 select count(*) into n from public.training_results where session_id='b3000000-0000-4000-8000-000000000001' and source='strava';
 reset role;
 return n;
end $$;
create function pg_temp.share_as(actor uuid,share boolean) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
 set local role authenticated;
 perform public.set_strava_sharing(share);
 reset role;
end $$;

do $$ declare denied boolean:=false; begin
 if pg_temp.visible_to('b1000000-0000-4000-8000-000000000001')<>1 then raise exception 'FAIL owner cannot read own Strava result'; end if;
 if pg_temp.visible_to('b1000000-0000-4000-8000-000000000002')<>0 then raise exception 'FAIL Strava result visible without consent'; end if;

 -- A teammate cannot grant consent on the owner's behalf.
 perform set_config('request.jwt.claims',json_build_object('sub','b1000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
 set local role authenticated;
 begin
  update public.training_members set strava_shared_at=now() where user_id='b1000000-0000-4000-8000-000000000001';
 exception when insufficient_privilege then denied:=true; end;
 reset role;
 if not denied then raise exception 'FAIL teammate could write the consent flag'; end if;
 perform pg_temp.share_as('b1000000-0000-4000-8000-000000000002',true);
 if pg_temp.visible_to('b1000000-0000-4000-8000-000000000002')<>0 then raise exception 'FAIL own consent exposed another athlete'; end if;

 perform pg_temp.share_as('b1000000-0000-4000-8000-000000000001',true);
 if pg_temp.visible_to('b1000000-0000-4000-8000-000000000002')<>1 then raise exception 'FAIL consented result hidden from teammate'; end if;
 if pg_temp.visible_to('b1000000-0000-4000-8000-000000000003')<>0 then raise exception 'FAIL consented result leaked to another group'; end if;

 perform pg_temp.share_as('b1000000-0000-4000-8000-000000000001',false);
 if pg_temp.visible_to('b1000000-0000-4000-8000-000000000002')<>0 then raise exception 'FAIL withdrawal did not hide result'; end if;

 -- Removing the connection clears the consent, so a new connection starts private.
 perform pg_temp.share_as('b1000000-0000-4000-8000-000000000001',true);
 delete from public.training_strava_connections where user_id='b1000000-0000-4000-8000-000000000001';
 if exists(select 1 from public.training_members where user_id='b1000000-0000-4000-8000-000000000001' and strava_shared_at is not null) then raise exception 'FAIL consent survived disconnection'; end if;
end $$;
rollback;
