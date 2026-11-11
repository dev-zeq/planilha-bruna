-- Dedicated Treinos only. A durable private inbox decouples the 2s webhook ACK
-- from provider requests. No client role can enqueue, claim or acknowledge work.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create table training_private.strava_automation (
 singleton boolean primary key default true check(singleton),
 subscription_id bigint unique,
 worker_secret_id uuid,
 last_worker_at timestamptz
);
insert into training_private.strava_automation(singleton) values(true);
create table training_private.strava_events (
 id uuid primary key default gen_random_uuid(),
 event_key text not null unique check(length(event_key)=64),
 user_id uuid not null references public.training_strava_connections(user_id) on delete cascade,
 connection_epoch timestamptz not null,
 object_id bigint not null,
 kind text not null check(kind in ('activity','revoke')),
 aspect text not null check(aspect in ('create','update','delete')),
 event_time bigint not null,
 received_at timestamptz not null default now(),
 next_at timestamptz not null default now(),
 attempts integer not null default 0,
 claim uuid,
 lease_until timestamptz,
 done_at timestamptz,
 last_error text
);
create index strava_events_due on training_private.strava_events(next_at) where done_at is null;
create index strava_events_owner on training_private.strava_events(user_id);
alter table training_private.strava_automation enable row level security;
alter table training_private.strava_events enable row level security;
revoke all on training_private.strava_automation,training_private.strava_events from public,anon,authenticated;
grant all on training_private.strava_automation,training_private.strava_events to service_role;

-- Privileged helper restricted to the single Treinos worker URL. It never returns
-- the capability URL and cannot schedule arbitrary commands or destinations.
create function training_private.configure_strava_worker(p_url text) returns void language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 if p_url !~ '^https://hzcqlygvzxxnvpywzppp[.]supabase[.]co/functions/v1/strava/worker/[a-f0-9]{64}$' then raise exception 'Worker inválido';end if;
 select worker_secret_id into sid from training_private.strava_automation where singleton for update;
 if sid is null then sid:=vault.create_secret(p_url,'treinos_strava_worker','Private automatic sync callback');
 else perform vault.update_secret(sid,p_url);end if;
 update training_private.strava_automation set worker_secret_id=sid where singleton;
 perform cron.schedule('treinos-strava-inbox','* * * * *','select training_private.wake_strava_worker();');
end $$;
revoke all on function training_private.configure_strava_worker(text) from public,anon,authenticated;
grant execute on function training_private.configure_strava_worker(text) to service_role;
create function training_private.wake_strava_worker() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text;
begin
 -- No HTTP invocation while there is no pending work. Keep only bounded history.
 delete from training_private.strava_events where done_at<now()-interval '30 days';
 if not exists(select 1 from training_private.strava_events where done_at is null and next_at<=now() and (lease_until is null or lease_until<now())) then return;end if;
 select v.decrypted_secret into endpoint from training_private.strava_automation c join vault.decrypted_secrets v on v.id=c.worker_secret_id where c.singleton;
 if endpoint is not null then perform net.http_post(url:=endpoint,body:='{}'::jsonb,headers:='{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds:=1000);end if;
end $$;
revoke all on function training_private.wake_strava_worker() from public,anon,authenticated,service_role;

create function public.strava_server_auto_config(p_subscription bigint default null,p_worker_url text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_worker_url is not null then perform training_private.configure_strava_worker(p_worker_url);end if;
 if p_subscription is not null then
  if p_subscription<=0 then raise exception 'Assinatura inválida';end if;
  update training_private.strava_automation set subscription_id=p_subscription where singleton;
 end if;
 return (select jsonb_build_object('enabled',subscription_id is not null,'subscription_id',subscription_id) from training_private.strava_automation where singleton);
end $$;
create function public.strava_server_auto_status(p_user uuid) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('enabled',c.subscription_id is not null,'pending',(select count(*) from training_private.strava_events where user_id=p_user and done_at is null),'last_event_at',(select max(received_at) from training_private.strava_events where user_id=p_user),'last_worker_at',c.last_worker_at) from training_private.strava_automation c where singleton;
$$;
create function public.strava_server_enqueue(p_subscription bigint,p_owner bigint,p_object bigint,p_kind text,p_aspect text,p_time bigint,p_key text) returns boolean language plpgsql security invoker set search_path='' as $$
declare u uuid;v_epoch timestamptz;n integer;
begin
 if not exists(select 1 from training_private.strava_automation where subscription_id=p_subscription and singleton) then raise exception 'Assinatura inválida';end if;
 if p_kind not in ('activity','revoke') or p_aspect not in ('create','update','delete') or p_object<=0 or p_time<extract(epoch from now()-interval '7 days') or p_time>extract(epoch from now()+interval '5 minutes') then raise exception 'Evento inválido';end if;
 select user_id,connected_at into u,v_epoch from public.training_strava_connections where athlete_id=p_owner;
 if u is null or not exists(select 1 from public.training_members where user_id=u) or p_time<extract(epoch from v_epoch)-1 then return false;end if;
 insert into training_private.strava_events(event_key,user_id,connection_epoch,object_id,kind,aspect,event_time) values(p_key,u,v_epoch,p_object,p_kind,p_aspect,p_time) on conflict(event_key) do nothing;
 get diagnostics n=row_count;return n=1;
end $$;
create function public.strava_server_claim(p_claim uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j training_private.strava_events;
begin
 update training_private.strava_automation set last_worker_at=now() where singleton;
 select * into j from training_private.strava_events where done_at is null and next_at<=now() and (lease_until is null or lease_until<now()) order by (kind='revoke') desc,(aspect='delete') desc,received_at for update skip locked limit 1;
 if not found then return null;end if;
 update training_private.strava_events set claim=p_claim,lease_until=now()+interval '3 minutes',attempts=attempts+1 where id=j.id;
 return jsonb_build_object('id',j.id,'user_id',j.user_id,'object_id',j.object_id,'kind',j.kind,'connection_epoch',j.connection_epoch,'owner_id',(select athlete_id from public.training_strava_connections where user_id=j.user_id));
end $$;
create function public.strava_server_finish(p_id uuid,p_claim uuid,p_action text,p_token_lease uuid default null,p_item jsonb default null,p_error text default null) returns void language plpgsql security invoker set search_path='' as $$
declare j training_private.strava_events;current_epoch timestamptz;
begin
 select * into j from training_private.strava_events where id=p_id and claim=p_claim and lease_until>now() and done_at is null for update;
 if not found then raise exception 'BUSY: evento não adquirido';end if;
 if p_action='retry' then
  update training_private.strava_events set next_at=now()+make_interval(secs=>least(3600,15*power(2,least(attempts,8)))::int),claim=null,lease_until=null,last_error=left(p_error,40) where id=j.id;return;
 end if;
 select connected_at into current_epoch from public.training_strava_connections where user_id=j.user_id for update;
 if current_epoch=j.connection_epoch then
  if p_action='revoke' and j.kind='revoke' then
   perform public.strava_server_disconnect(j.user_id);return; -- cascades this event
  elsif p_action='upsert' and j.kind='activity' then
   if (p_item->>'activity_id')::bigint<>j.object_id then raise exception 'Atividade inválida';end if;
   perform public.strava_server_import(j.user_id,p_token_lease,jsonb_build_array(p_item));
  elsif p_action='remove' and j.kind='activity' then
   delete from public.training_strava_activities where user_id=j.user_id and activity_id=j.object_id;
  elsif p_action<>'ignore' then raise exception 'Ação inválida';end if;
 end if;
 update training_private.strava_events set done_at=now(),claim=null,lease_until=null,last_error=null where id=j.id;
end $$;
-- Refresh already-linked metrics, never create links or complete another athlete.
-- Preserve a user's manually adjusted metrics by comparing them to the old source.
create function training_private.strava_linked_metrics() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.distance_m is distinct from old.distance_m or new.moving_seconds is distinct from old.moving_seconds then
  update public.training_results set actual_km=round(new.distance_m/1000,2),duration_seconds=new.moving_seconds
   where user_id=new.user_id and strava_activity_id=new.activity_id and source='strava' and actual_km=round(old.distance_m/1000,2) and duration_seconds=old.moving_seconds;
 end if;return new;
end $$;
revoke all on function training_private.strava_linked_metrics() from public,anon,authenticated;
create trigger strava_linked_metrics_update after update on public.training_strava_activities for each row execute function training_private.strava_linked_metrics();
-- A new OAuth authorization is a new epoch: delayed events cannot revoke it.
-- Existing connections keep their original epoch until they reconnect.
-- The server-only connect function is patched separately in source for reproducibility.
do $$ declare fn record;begin
 for fn in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'strava_server_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',fn.signature);
  execute format('grant execute on function %s to service_role',fn.signature);
 end loop;
end $$;

create or replace function public.strava_server_connect(p_user uuid,p_athlete bigint,p_name text,p_scopes text[],p_tokens jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare secret uuid;existing bigint;
begin
 if not exists(select 1 from public.training_members where user_id=p_user) then raise exception 'Membro necessário'; end if;
 if coalesce(p_tokens->>'access_token','')='' or coalesce(p_tokens->>'refresh_token','')='' or (p_tokens->>'expires_at')::bigint<=extract(epoch from now()) then raise exception 'Tokens inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select athlete_id into existing from public.training_strava_connections where user_id=p_user;
 if existing is not null and existing<>p_athlete then raise exception 'Desconecte a conta anterior primeiro'; end if;
 if exists(select 1 from training_private.strava_credentials where user_id=p_user and lease_until>now()) then raise exception 'BUSY'; end if;
 insert into public.training_strava_connections(user_id,athlete_id,athlete_name,scopes) values(p_user,p_athlete,left(p_name,160),p_scopes)
 on conflict(user_id) do update set athlete_name=excluded.athlete_name,scopes=excluded.scopes,connected_at=now();
 select secret_id into secret from training_private.strava_credentials where user_id=p_user;
 if secret is null then
  secret:=vault.create_secret(p_tokens::text,'treinos_strava_'||p_user::text,'OAuth individual Treinos');
  insert into training_private.strava_credentials(user_id,secret_id) values(p_user,secret);
 else perform vault.update_secret(secret,p_tokens::text);end if;
end $$;

