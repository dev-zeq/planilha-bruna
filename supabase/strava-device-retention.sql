-- 1) Credit the recording device (Strava API Policy 4.4: Garmin-sourced data needs
--    attribution; we credit whatever device Strava reports).
-- 2) Limit the private activity cache to seven days (Policy 6.2). Activities already
--    linked to a workout stay, because the athlete's result depends on them.
alter table public.training_strava_activities
 add column device_name text check (device_name is null or length(device_name) <= 120);
alter table public.training_results
 add column source_device text check (source_device is null or length(source_device) <= 300);
comment on column public.training_results.source_device is
 'Device(s) that recorded the linked Strava activities; set by the server only.';

-- Same import as before, plus the device. The activity list endpoint has no device, so a
-- payload without one never erases a device stored from the activity detail.
create or replace function public.strava_server_import(p_user uuid, p_lease uuid, p_items jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare a jsonb; n int := 0;
begin
 perform 1 from training_private.strava_credentials where user_id=p_user and lease_id=p_lease and lease_until>now() for update;
 if not found or not exists(select 1 from public.training_members where user_id=p_user) then raise exception 'BUSY_OR_NOT_AUTHORIZED'; end if;
 if jsonb_array_length(p_items)>300 then raise exception 'Lote excedido'; end if;
 for a in select value from jsonb_array_elements(p_items) loop
  insert into public.training_strava_activities(user_id,activity_id,name,sport_type,start_date,local_date,distance_m,moving_seconds,elapsed_seconds,device_name)
  values(p_user,(a->>'activity_id')::bigint,left(a->>'name',200),a->>'sport_type',(a->>'start_date')::timestamptz,(a->>'local_date')::date,(a->>'distance_m')::numeric,(a->>'moving_seconds')::int,(a->>'elapsed_seconds')::int,left(nullif(trim(a->>'device_name'),''),120))
  on conflict(user_id,activity_id) do update set name=excluded.name,sport_type=excluded.sport_type,start_date=excluded.start_date,local_date=excluded.local_date,distance_m=excluded.distance_m,moving_seconds=excluded.moving_seconds,elapsed_seconds=excluded.elapsed_seconds,device_name=coalesce(excluded.device_name,public.training_strava_activities.device_name),imported_at=now();
  n:=n+1;
 end loop;
 update public.training_strava_connections set last_synced_at=now() where user_id=p_user;
 return n;
end $$;

-- Keep the result's device credit equal to the devices of its linked activities.
create function training_private.strava_result_device(p_session uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare d text;
begin
 select left(string_agg(distinct a.device_name, ', ' order by a.device_name), 300) into d
  from public.training_strava_result_activities l
  join public.training_strava_activities a on a.user_id=l.user_id and a.activity_id=l.activity_id
  where l.session_id=p_session and l.user_id=p_user and a.device_name is not null;
 begin
  update public.training_results set source_device=d
   where session_id=p_session and user_id=p_user and source='strava' and source_device is distinct from d;
 exception when raise_exception then
  -- The result guard rejects writes to a removed or retargeted workout; a missing
  -- device credit there must never fail the import or webhook that triggered this.
  null;
 end;
end $$;
revoke all on function training_private.strava_result_device(uuid, uuid) from public, anon, authenticated, service_role;

create function training_private.strava_result_device_links() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='DELETE' then
  -- A relink deletes then reinserts; the insert recomputes once.
  if current_setting('treinos.strava_relink', true)='on' then return null; end if;
  perform training_private.strava_result_device(old.session_id, old.user_id);
 else
  perform training_private.strava_result_device(new.session_id, new.user_id);
 end if;
 return null;
end $$;
revoke all on function training_private.strava_result_device_links() from public, anon, authenticated, service_role;
create trigger strava_result_device_change after insert or delete on public.training_strava_result_activities
 for each row execute function training_private.strava_result_device_links();

create function training_private.strava_result_device_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare l record;
begin
 for l in select session_id, user_id from public.training_strava_result_activities where user_id=new.user_id and activity_id=new.activity_id loop
  perform training_private.strava_result_device(l.session_id, l.user_id);
 end loop;
 return null;
end $$;
revoke all on function training_private.strava_result_device_activity() from public, anon, authenticated, service_role;
create trigger strava_activity_device_change after update of device_name on public.training_strava_activities
 for each row when (new.device_name is distinct from old.device_name)
 execute function training_private.strava_result_device_activity();

-- Clients write results directly under RLS; the device credit is not theirs to set.
create function training_private.guard_source_device() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if current_user in ('authenticated', 'anon') then
  if tg_op='INSERT' then
   if new.source_device is not null then raise exception 'Aparelho definido somente pelo servidor'; end if;
  elsif new.source_device is distinct from old.source_device then raise exception 'Aparelho definido somente pelo servidor';
  end if;
 end if;
 return new;
end $$;
revoke all on function training_private.guard_source_device() from public, anon, authenticated;
create trigger training_source_device_guard before insert or update on public.training_results
 for each row execute function training_private.guard_source_device();

-- Seven-day cache: drop imported activities that are older and not linked to a workout.
create function training_private.purge_strava_cache() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 delete from public.training_strava_activities a
  where a.start_date < now() - interval '7 days'
   and not exists (select 1 from public.training_strava_result_activities l where l.user_id=a.user_id and l.activity_id=a.activity_id);
 get diagnostics n = row_count;
 return n;
end $$;
revoke all on function training_private.purge_strava_cache() from public, anon, authenticated, service_role;
select cron.schedule('treinos-strava-retention', '17 3 * * *', 'select training_private.purge_strava_cache();');
