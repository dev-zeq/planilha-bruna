-- Dedicated project hzcqlygvzxxnvpywzppp only. Applied through MCP migration.
create schema if not exists training_private;
revoke all on schema training_private from public, anon;
grant usage on schema training_private to authenticated;

create table training_private.authorizations (
 email text primary key check (email=lower(trim(email))),
 display_name text not null check(length(trim(display_name)) between 1 and 80),
 group_id uuid not null, claimed_by uuid unique references auth.users(id)
);
alter table training_private.authorizations enable row level security;
revoke all on training_private.authorizations from public, anon, authenticated;

-- Internal nonrecursive lookup; never trusts user-editable metadata.
create function training_private.is_member(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.training_members where group_id=g and user_id=auth.uid())
$$;
revoke all on function training_private.is_member(uuid) from public, anon;
grant execute on function training_private.is_member(uuid) to authenticated;

alter table public.training_groups alter column owner_id drop not null;
insert into public.training_groups(id,name) values ('710f069b-8940-451b-bb6e-ef60406fb1b1','Ezequiel, Bruna e Renato');

create function training_private.claim_invitation() returns uuid
language plpgsql security definer set search_path = '' as $$
declare a training_private.authorizations; u uuid := auth.uid();
begin
 if u is null then raise exception 'Login necessário'; end if;
 select a1.* into a from training_private.authorizations a1
 join auth.users au on lower(au.email)=a1.email
 where au.id=u and au.email_confirmed_at is not null for update of a1;
 if not found then return null; end if;
 if a.claimed_by is not null and a.claimed_by<>u then raise exception 'Convite já utilizado'; end if;
 insert into public.training_members(group_id,user_id,display_name) values(a.group_id,u,a.display_name) on conflict do nothing;
 update training_private.authorizations set claimed_by=u where email=a.email;
 update public.training_groups set owner_id=u where id=a.group_id and owner_id is null;
 return a.group_id;
end $$;
revoke all on function training_private.claim_invitation() from public, anon;
grant execute on function training_private.claim_invitation() to authenticated;
create function public.claim_training_invitation() returns uuid language sql security invoker set search_path='' as $$
 select training_private.claim_invitation()
$$;
revoke all on function public.claim_training_invitation() from public, anon;
grant execute on function public.claim_training_invitation() to authenticated;

-- Replace all initial policies; membership changes are authorized server-side only.
do $$ declare p record; begin
 for p in select tablename,policyname from pg_policies where schemaname='public' and tablename in ('training_groups','training_members','training_sessions','training_results') loop
 execute format('drop policy %I on public.%I',p.policyname,p.tablename);
 end loop;
end $$;
revoke all on public.training_groups,public.training_members,public.training_sessions,public.training_results from anon,authenticated;
grant select on public.training_groups,public.training_members to authenticated;
grant select,insert,update,delete on public.training_sessions,public.training_results to authenticated;
create policy groups_read on public.training_groups for select to authenticated using(training_private.is_member(id));
create policy members_read on public.training_members for select to authenticated using(training_private.is_member(group_id));
create policy sessions_read on public.training_sessions for select to authenticated using(training_private.is_member(group_id));
create policy sessions_insert on public.training_sessions for insert to authenticated with check(training_private.is_member(group_id) and created_by=(select auth.uid()));
create policy sessions_update on public.training_sessions for update to authenticated using(training_private.is_member(group_id)) with check(training_private.is_member(group_id));
create policy sessions_delete on public.training_sessions for delete to authenticated using(training_private.is_member(group_id));
create policy results_read on public.training_results for select to authenticated using(exists(select 1 from public.training_sessions s where s.id=session_id and training_private.is_member(s.group_id)));
create policy results_insert on public.training_results for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.training_sessions s where s.id=session_id and training_private.is_member(s.group_id)));
create policy results_update on public.training_results for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.training_sessions s where s.id=session_id and training_private.is_member(s.group_id))) with check(user_id=(select auth.uid()) and exists(select 1 from public.training_sessions s where s.id=session_id and training_private.is_member(s.group_id)));
create policy results_delete on public.training_results for delete to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.training_sessions s where s.id=session_id and training_private.is_member(s.group_id)));

alter table public.training_sessions add column target_user_ids uuid[] not null default '{}', add column version bigint not null default 1, add column deleted_at timestamptz;
alter table public.training_results add column version bigint not null default 1;
create index on public.training_members(user_id,group_id);
create index on public.training_sessions(group_id,training_date);
create index on public.training_results(user_id);
create function training_private.guard_record() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if tg_table_name='training_sessions' then
   if new.group_id<>old.group_id or new.created_by<>old.created_by or new.id<>old.id then raise exception 'Identidade do treino imutável'; end if;
  else
   if new.session_id<>old.session_id or new.user_id<>old.user_id then raise exception 'Identidade do resultado imutável'; end if;
  end if;
  new.version:=old.version+1;
 end if;
 if tg_table_name='training_sessions' then
  if exists(select 1 from unnest(new.target_user_ids) t(uid) where not exists(select 1 from public.training_members m where m.group_id=new.group_id and m.user_id=t.uid)) then raise exception 'Atleta não pertence ao grupo'; end if;
 else
  if not exists(select 1 from public.training_sessions s where s.id=new.session_id and s.deleted_at is null and (cardinality(s.target_user_ids)=0 or new.user_id=any(s.target_user_ids))) then raise exception 'Treino indisponível para este atleta'; end if;
  new.pace_seconds_per_km:=case when new.actual_km>0 and new.duration_seconds>0 then greatest(1,round(new.duration_seconds/new.actual_km)::integer) else null end;
 end if;
 new.updated_at:=clock_timestamp(); return new;
end $$;
revoke all on function training_private.guard_record() from public,anon,authenticated;
create trigger training_session_guard before insert or update on public.training_sessions for each row execute function training_private.guard_record();
create trigger training_result_guard before insert or update on public.training_results for each row execute function training_private.guard_record();

-- Transactional idempotency receipts. No privileged execution or token storage.
create table public.training_operations(user_id uuid not null default auth.uid() references auth.users(id), operation_id uuid not null, payload jsonb not null, created_at timestamptz not null default now(), primary key(user_id,operation_id));
alter table public.training_operations enable row level security;
revoke all on public.training_operations from public,anon,authenticated;
grant select,insert on public.training_operations to authenticated;
create policy operations_read on public.training_operations for select to authenticated using(user_id=(select auth.uid()));
create policy operations_insert on public.training_operations for insert to authenticated with check(user_id=(select auth.uid()));
create function public.apply_training_operation(op_id uuid, body jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare b jsonb:=body->'data'; n integer; prior jsonb;
begin
 if auth.uid() is null then raise exception 'Login necessário'; end if;
 -- Serialize retries of this user's operation even across concurrent connections.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||op_id::text,0));
 select payload into prior from public.training_operations where user_id=auth.uid() and operation_id=op_id;
 if found then
  if prior<>body then raise exception 'Identificador reutilizado'; end if;
  return;
 end if;
 if body->>'kind' in ('create','import') then
  insert into public.training_sessions(id,group_id,training_date,period,title,description,planned_km,state,target_user_ids)
  values((b->>'id')::uuid,(b->>'group_id')::uuid,(b->>'training_date')::date,b->>'period',b->>'title',coalesce(b->>'description',''),(b->>'planned_km')::numeric,coalesce(b->>'state','planned'),array(select jsonb_array_elements_text(coalesce(b->'target_user_ids','[]'))::uuid))
  on conflict(id) do nothing;
  if not exists(select 1 from public.training_sessions where id=(b->>'id')::uuid and group_id=(b->>'group_id')::uuid) then raise exception 'Treino não autorizado'; end if;
 elsif body->>'kind'='update' then
  update public.training_sessions set training_date=(b->>'training_date')::date,period=b->>'period',title=b->>'title',description=b->>'description',planned_km=(b->>'planned_km')::numeric,state=b->>'state',target_user_ids=array(select jsonb_array_elements_text(b->'target_user_ids')::uuid)
  where id=(b->>'id')::uuid and version=(body->>'version')::bigint and deleted_at is null;
  get diagnostics n=row_count; if n<>1 then raise exception 'CONFLICT: treino alterado; atualize e revise'; end if;
 elsif body->>'kind'='delete' then
  update public.training_sessions set deleted_at=now() where id=(b->>'id')::uuid and version=(body->>'version')::bigint and deleted_at is null;
  get diagnostics n=row_count; if n<>1 then raise exception 'CONFLICT: treino alterado; atualize e revise'; end if;
 elsif body->>'kind'='result' then
  if coalesce((body->>'version')::bigint,0)=0 then
   insert into public.training_results(session_id,user_id,status,actual_km,duration_seconds,notes) values((b->>'session_id')::uuid,auth.uid(),b->>'status',(b->>'actual_km')::numeric,(b->>'duration_seconds')::integer,coalesce(b->>'notes','')) on conflict do nothing;
  else
   update public.training_results set status=b->>'status',actual_km=(b->>'actual_km')::numeric,duration_seconds=(b->>'duration_seconds')::integer,notes=coalesce(b->>'notes','') where session_id=(b->>'session_id')::uuid and user_id=auth.uid() and version=(body->>'version')::bigint;
  end if;
  get diagnostics n=row_count; if n<>1 then raise exception 'CONFLICT: resultado alterado; atualize e revise'; end if;
 else raise exception 'Operação inválida'; end if;
 insert into public.training_operations(operation_id,payload) values(op_id,body);
end $$;
revoke all on function public.apply_training_operation(uuid,jsonb) from public,anon;
grant execute on function public.apply_training_operation(uuid,jsonb) to authenticated;

-- Strava: future OAuth secrets belong in an unexposed schema / server only.
comment on column public.training_results.strava_activity_id is 'Future individual OAuth import; no tokens in this table or frontend.';
