-- Preserve existing single-activity links and allow warmup/main/cooldown grouping.
create table public.training_strava_result_activities (
 session_id uuid not null,
 user_id uuid not null,
 activity_id bigint not null,
 distance_m numeric not null check(distance_m>=0),
 moving_seconds integer not null check(moving_seconds>=0),
 primary key(session_id,user_id,activity_id),
 unique(user_id,activity_id),
 foreign key(session_id,user_id) references public.training_results(session_id,user_id) on delete cascade,
 foreign key(user_id,activity_id) references public.training_strava_activities(user_id,activity_id) on delete cascade
);
alter table public.training_strava_result_activities enable row level security;
revoke all on public.training_strava_result_activities from public,anon,authenticated;
grant select on public.training_strava_result_activities to authenticated;
grant all on public.training_strava_result_activities to service_role;
create policy strava_result_links_own on public.training_strava_result_activities for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.training_members where user_id=(select auth.uid())));
insert into public.training_strava_result_activities(session_id,user_id,activity_id,distance_m,moving_seconds)
 select r.session_id,r.user_id,a.activity_id,a.distance_m,a.moving_seconds from public.training_results r join public.training_strava_activities a on a.user_id=r.user_id and a.activity_id=r.strava_activity_id where r.source='strava';
-- Legacy field remains NULL for older clients; the join table is authoritative.
alter table public.training_results drop constraint training_strava_result_fk;
alter table public.training_results drop constraint training_strava_source_check;
alter table public.training_results add constraint training_strava_source_check check(source='strava' or strava_activity_id is null);
set local role service_role;
update public.training_results set strava_activity_id=null where source='strava' and strava_activity_id is not null;
reset role;
alter table public.training_results drop constraint training_strava_source_check;
alter table public.training_results add constraint training_strava_source_check check(strava_activity_id is null);

drop trigger strava_linked_metrics_update on public.training_strava_activities;
create or replace function training_private.strava_linked_metrics() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.distance_m is distinct from old.distance_m or new.moving_seconds is distinct from old.moving_seconds then
  update public.training_strava_result_activities set distance_m=new.distance_m,moving_seconds=new.moving_seconds where user_id=new.user_id and activity_id=new.activity_id;
 end if;return new;
end $$;
create trigger strava_linked_metrics_update after update on public.training_strava_activities for each row execute function training_private.strava_linked_metrics();
create function training_private.strava_group_total() returns trigger language plpgsql security invoker set search_path='' as $$
declare sid uuid;uid uuid;n integer;km numeric;seconds bigint;old_m numeric;old_s bigint;
begin
 if current_user='service_role' and current_setting('treinos.strava_relink',true)='on' then return null;end if;
 if tg_op='DELETE' then sid:=old.session_id;uid:=old.user_id;else sid:=new.session_id;uid:=new.user_id;end if;
 if not exists(select 1 from public.training_results where session_id=sid and user_id=uid and source='strava') then return null;end if;
 select count(*),coalesce(sum(distance_m),0),coalesce(sum(moving_seconds),0) into n,km,seconds from public.training_strava_result_activities where session_id=sid and user_id=uid;
 if n=0 then delete from public.training_results where session_id=sid and user_id=uid and source='strava';return null;end if;
 old_m:=km;old_s:=seconds;
 if tg_op in ('INSERT','UPDATE') then old_m:=old_m-new.distance_m;old_s:=old_s-new.moving_seconds;end if;
 if tg_op in ('DELETE','UPDATE') then old_m:=old_m+old.distance_m;old_s:=old_s+old.moving_seconds;end if;
 update public.training_results set actual_km=round(km/1000,2),duration_seconds=seconds::int where session_id=sid and user_id=uid and source='strava' and actual_km=round(old_m/1000,2) and duration_seconds=old_s;
 return null;
end $$;
revoke all on function training_private.strava_group_total() from public,anon,authenticated;
create trigger strava_group_total_change after insert or update or delete on public.training_strava_result_activities for each row execute function training_private.strava_group_total();

create function public.strava_server_link_many(p_user uuid,p_activities bigint[],p_session uuid,p_version bigint) returns void language plpgsql security invoker set search_path='' as $$
declare n integer;total_m numeric;total_s bigint;found_count integer;previous_flag text;
begin
 if cardinality(p_activities) not between 1 and 10 or p_activities is null or exists(select 1 from unnest(p_activities) id where id is null or id<=0) or (select count(distinct id) from unnest(p_activities) id)<>cardinality(p_activities) then raise exception 'Selecione de uma a dez atividades distintas';end if;
 if not exists(select 1 from public.training_sessions s join public.training_members m on m.group_id=s.group_id where s.id=p_session and s.deleted_at is null and m.user_id=p_user and (cardinality(s.target_user_ids)=0 or p_user=any(s.target_user_ids))) then raise exception 'Treino indisponível';end if;
 -- Lock source rows through the transaction so deletion/update cannot race a link.
 perform 1 from public.training_strava_activities where user_id=p_user and activity_id=any(p_activities) order by activity_id for update;
 select count(*),sum(distance_m),sum(moving_seconds) into found_count,total_m,total_s from public.training_strava_activities where user_id=p_user and activity_id=any(p_activities);
 if found_count<>cardinality(p_activities) or total_s>31536000 then raise exception 'Atividades indisponíveis';end if;
 if p_version=0 then
  insert into public.training_results(session_id,user_id,status,actual_km,duration_seconds,notes,source)
   values(p_session,p_user,'done',round(total_m/1000,2),total_s::int,'Importado do Strava: '||found_count||' atividade(s), tempo em movimento.','strava') on conflict do nothing;
 else
  update public.training_results set status='done',actual_km=round(total_m/1000,2),duration_seconds=total_s::int,notes='Importado do Strava: '||found_count||' atividade(s), tempo em movimento.',strava_activity_id=null,source='strava' where session_id=p_session and user_id=p_user and version=p_version;
 end if;
 get diagnostics n=row_count;if n<>1 then raise exception 'CONFLICT: resultado alterado';end if;
 previous_flag:=current_setting('treinos.strava_relink',true);perform set_config('treinos.strava_relink','on',true);
 delete from public.training_strava_result_activities where session_id=p_session and user_id=p_user;
 insert into public.training_strava_result_activities(session_id,user_id,activity_id,distance_m,moving_seconds)
  select p_session,p_user,activity_id,distance_m,moving_seconds from public.training_strava_activities where user_id=p_user and activity_id=any(p_activities);
 perform set_config('treinos.strava_relink',coalesce(previous_flag,'off'),true);
end $$;
revoke all on function public.strava_server_link_many(uuid,bigint[],uuid,bigint) from public,anon,authenticated;
grant execute on function public.strava_server_link_many(uuid,bigint[],uuid,bigint) to service_role;
-- Keep deployed 2.1.0 clients compatible during the PWA update window.
create or replace function public.strava_server_link(p_user uuid,p_activity bigint,p_session uuid,p_version bigint) returns void language sql security invoker set search_path='' as $$
 select public.strava_server_link_many(p_user,array[p_activity],p_session,p_version);
$$;
