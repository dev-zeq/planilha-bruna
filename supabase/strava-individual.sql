-- Dedicated Treinos project. OAuth secrets never enter client-readable tables.
create table public.training_strava_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 athlete_id bigint not null unique,
 athlete_name text not null check(length(athlete_name)<=160),
 scopes text[] not null,
 connected_at timestamptz not null default now(),
 last_synced_at timestamptz
);
create table public.training_strava_activities (
 user_id uuid not null references public.training_strava_connections(user_id) on delete cascade,
 activity_id bigint not null check(activity_id>0),
 name text not null check(length(name)<=200),
 sport_type text not null,
 start_date timestamptz not null,
 local_date date not null,
 distance_m numeric not null check(distance_m>=0 and distance_m<=10000000),
 moving_seconds integer not null check(moving_seconds>=0),
 elapsed_seconds integer not null check(elapsed_seconds>=0),
 imported_at timestamptz not null default now(),
 primary key(user_id,activity_id)
);
create index on public.training_strava_activities(user_id,start_date);
alter table public.training_strava_connections enable row level security;
alter table public.training_strava_activities enable row level security;
revoke all on public.training_strava_connections,public.training_strava_activities from public,anon,authenticated;
grant select on public.training_strava_connections,public.training_strava_activities to authenticated;
grant all on public.training_strava_connections,public.training_strava_activities to service_role;
create policy strava_connection_own on public.training_strava_connections for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.training_members where user_id=(select auth.uid())));
create policy strava_activity_own on public.training_strava_activities for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.training_members where user_id=(select auth.uid())));

create table training_private.strava_credentials (
 user_id uuid primary key references public.training_strava_connections(user_id) on delete cascade,
 secret_id uuid not null,
 lease_id uuid,
 lease_until timestamptz
);
create table training_private.strava_states (
 state_hash text primary key check(state_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '10 minutes'
);
alter table training_private.strava_credentials enable row level security;
alter table training_private.strava_states enable row level security;
revoke all on training_private.strava_credentials,training_private.strava_states from public,anon,authenticated;
grant usage on schema training_private to service_role;
grant all on training_private.strava_credentials,training_private.strava_states to service_role;

-- Imported API data is private even though manual results remain shared.
alter table public.training_results add column source text not null default 'manual' check(source in ('manual','strava'));
alter table public.training_results add constraint training_strava_result_fk foreign key(user_id,strava_activity_id) references public.training_strava_activities(user_id,activity_id) on delete cascade;
alter table public.training_results add constraint training_strava_source_check check((source='manual' and strava_activity_id is null) or (source='strava' and strava_activity_id is not null));
create unique index on public.training_results(user_id,strava_activity_id) where strava_activity_id is not null;
drop policy results_read on public.training_results;
create policy results_read on public.training_results for select to authenticated using((source='manual' or user_id=(select auth.uid())) and exists(select 1 from public.training_sessions s where s.id=session_id and training_private.is_member(s.group_id)));
create function training_private.guard_strava_source() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user<>'service_role' then
  if tg_op='INSERT' then
   if new.source<>'manual' or new.strava_activity_id is not null then raise exception 'Importação Strava somente pelo servidor'; end if;
  elsif new.source<>old.source or new.strava_activity_id is distinct from old.strava_activity_id then raise exception 'Origem Strava protegida'; end if;
 end if;
 return new;
end $$;
revoke all on function training_private.guard_strava_source() from public,anon,authenticated;
create trigger training_strava_source_guard before insert or update on public.training_results for each row execute function training_private.guard_strava_source();

create function public.strava_server_state(p_user uuid,p_hash text,p_consume boolean default false) returns boolean language plpgsql security invoker set search_path='' as $$
declare n int;
begin
 if not exists(select 1 from public.training_members where user_id=p_user) then raise exception 'Membro necessário'; end if;
 if p_consume then
  delete from training_private.strava_states where state_hash=p_hash and user_id=p_user and expires_at>now();get diagnostics n=row_count;return n=1;
 end if;
 delete from training_private.strava_states where user_id=p_user or expires_at<now();
 insert into training_private.strava_states(state_hash,user_id) values(p_hash,p_user);return true;
end $$;

create function public.strava_server_connect(p_user uuid,p_athlete bigint,p_name text,p_scopes text[],p_tokens jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare secret uuid;existing bigint;
begin
 if not exists(select 1 from public.training_members where user_id=p_user) then raise exception 'Membro necessário'; end if;
 if coalesce(p_tokens->>'access_token','')='' or coalesce(p_tokens->>'refresh_token','')='' or (p_tokens->>'expires_at')::bigint<=extract(epoch from now()) then raise exception 'Tokens inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select athlete_id into existing from public.training_strava_connections where user_id=p_user;
 if existing is not null and existing<>p_athlete then raise exception 'Desconecte a conta anterior primeiro'; end if;
 if exists(select 1 from training_private.strava_credentials where user_id=p_user and lease_until>now()) then raise exception 'BUSY'; end if;
 insert into public.training_strava_connections(user_id,athlete_id,athlete_name,scopes) values(p_user,p_athlete,left(p_name,160),p_scopes)
 on conflict(user_id) do update set athlete_name=excluded.athlete_name,scopes=excluded.scopes;
 select secret_id into secret from training_private.strava_credentials where user_id=p_user;
 if secret is null then
  secret:=vault.create_secret(p_tokens::text,'treinos_strava_'||p_user::text,'OAuth individual Treinos');
  insert into training_private.strava_credentials(user_id,secret_id) values(p_user,secret);
 else perform vault.update_secret(secret,p_tokens::text);end if;
end $$;

create function public.strava_server_token(p_user uuid,p_lease uuid,p_update jsonb default null,p_release boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare secret uuid;tokens jsonb;
begin
 if not exists(select 1 from public.training_members where user_id=p_user) then raise exception 'Membro necessário'; end if;
 if p_release then
  update training_private.strava_credentials set lease_id=null,lease_until=null where user_id=p_user and lease_id=p_lease;return null;
 elsif p_update is not null then
  select secret_id into secret from training_private.strava_credentials where user_id=p_user and lease_id=p_lease and lease_until>now() for update;
  if secret is null then raise exception 'BUSY'; end if;
  if coalesce(p_update->>'access_token','')='' or coalesce(p_update->>'refresh_token','')='' then raise exception 'Tokens inválidos'; end if;
  perform vault.update_secret(secret,p_update::text);return null;
 end if;
 update training_private.strava_credentials set lease_id=p_lease,lease_until=now()+interval '90 seconds' where user_id=p_user and (lease_until is null or lease_until<now()) returning secret_id into secret;
 if secret is null then raise exception 'BUSY_OR_NOT_CONNECTED'; end if;
 select decrypted_secret::jsonb into tokens from vault.decrypted_secrets where id=secret;
 return tokens;
end $$;

create function public.strava_server_import(p_user uuid,p_lease uuid,p_items jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare a jsonb;n int:=0;
begin
 perform 1 from training_private.strava_credentials where user_id=p_user and lease_id=p_lease and lease_until>now() for update;
 if not found or not exists(select 1 from public.training_members where user_id=p_user) then raise exception 'BUSY_OR_NOT_AUTHORIZED'; end if;
 if jsonb_array_length(p_items)>300 then raise exception 'Lote excedido'; end if;
 for a in select value from jsonb_array_elements(p_items) loop
  insert into public.training_strava_activities(user_id,activity_id,name,sport_type,start_date,local_date,distance_m,moving_seconds,elapsed_seconds)
  values(p_user,(a->>'activity_id')::bigint,left(a->>'name',200),a->>'sport_type',(a->>'start_date')::timestamptz,(a->>'local_date')::date,(a->>'distance_m')::numeric,(a->>'moving_seconds')::int,(a->>'elapsed_seconds')::int)
  on conflict(user_id,activity_id) do update set name=excluded.name,sport_type=excluded.sport_type,start_date=excluded.start_date,local_date=excluded.local_date,distance_m=excluded.distance_m,moving_seconds=excluded.moving_seconds,elapsed_seconds=excluded.elapsed_seconds,imported_at=now();n:=n+1;
 end loop;
 update public.training_strava_connections set last_synced_at=now() where user_id=p_user;return n;
end $$;

create function public.strava_server_link(p_user uuid,p_activity bigint,p_session uuid,p_version bigint) returns void language plpgsql security invoker set search_path='' as $$
declare a public.training_strava_activities;n int;
begin
 select * into a from public.training_strava_activities where user_id=p_user and activity_id=p_activity;
 if not found then raise exception 'Atividade indisponível'; end if;
 if not exists(select 1 from public.training_sessions s join public.training_members m on m.group_id=s.group_id where s.id=p_session and s.deleted_at is null and m.user_id=p_user and (cardinality(s.target_user_ids)=0 or p_user=any(s.target_user_ids))) then raise exception 'Treino indisponível'; end if;
 if p_version=0 then
  insert into public.training_results(session_id,user_id,status,actual_km,duration_seconds,notes,strava_activity_id,source) values(p_session,p_user,'done',round(a.distance_m/1000,2),a.moving_seconds,'Importado do Strava (tempo em movimento).',p_activity,'strava') on conflict do nothing;
 else
  update public.training_results set status='done',actual_km=round(a.distance_m/1000,2),duration_seconds=a.moving_seconds,notes='Importado do Strava (tempo em movimento).',strava_activity_id=p_activity,source='strava' where session_id=p_session and user_id=p_user and version=p_version;
 end if;
 get diagnostics n=row_count;if n<>1 then raise exception 'CONFLICT: resultado alterado'; end if;
end $$;

create function public.strava_server_disconnect(p_user uuid) returns void language plpgsql security invoker set search_path='' as $$
declare secret uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select secret_id into secret from training_private.strava_credentials where user_id=p_user for update;
 delete from public.training_strava_connections where user_id=p_user;
 delete from training_private.strava_states where user_id=p_user;
 if secret is not null then delete from vault.secrets where id=secret;end if;
end $$;

-- Every public RPC above is a server-only API. Never grant to authenticated/anon.
do $$ declare p record;begin
 for p in select fn.oid::regprocedure as signature from pg_proc fn join pg_namespace n on n.oid=fn.pronamespace where n.nspname='public' and fn.proname like 'strava_server_%' loop
  execute format('revoke all on function %s from public, anon, authenticated',p.signature);
  execute format('grant execute on function %s to service_role',p.signature);
 end loop;
end $$;
