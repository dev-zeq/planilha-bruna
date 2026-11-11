-- Opt-in sharing of Strava-sourced results with the training group.
-- Strava API Policy 5.13 requires the athlete's prior express consent before anyone
-- else may see their data, so sharing is off by default, recorded with a timestamp,
-- reversible by the athlete, and cleared when the Strava connection is removed.
alter table public.training_members add column strava_shared_at timestamptz;
comment on column public.training_members.strava_shared_at is
 'When this athlete consented to show Strava-sourced results to the group; null = private.';

-- Members stay read-only for clients; the athlete changes only this flag, only on their own row.
create function training_private.set_strava_sharing(p_share boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'Login necessário'; end if;
 if p_share is null then raise exception 'Escolha inválida'; end if;
 update public.training_members
  set strava_shared_at = case when p_share then coalesce(strava_shared_at, now()) end
  where user_id = auth.uid();
 get diagnostics n = row_count;
 if n = 0 then raise exception 'Acesso ao grupo não autorizado'; end if;
end $$;
revoke all on function training_private.set_strava_sharing(boolean) from public, anon;
grant execute on function training_private.set_strava_sharing(boolean) to authenticated;

create function public.set_strava_sharing(p_share boolean) returns void
language sql security invoker set search_path = '' as $$
 select training_private.set_strava_sharing(p_share)
$$;
revoke all on function public.set_strava_sharing(boolean) from public, anon;
grant execute on function public.set_strava_sharing(boolean) to authenticated;

-- Manual results stay shared; Strava results are visible to their owner, and to the
-- rest of the same group only while the owner's consent is recorded.
drop policy results_read on public.training_results;
create policy results_read on public.training_results for select to authenticated using (
 exists (
  select 1 from public.training_sessions s
  where s.id = training_results.session_id
   and training_private.is_member(s.group_id)
   and (
    training_results.source = 'manual'
    or training_results.user_id = (select auth.uid())
    or exists (
     select 1 from public.training_members m
     where m.group_id = s.group_id
      and m.user_id = training_results.user_id
      and m.strava_shared_at is not null
    )
   )
 )
);

-- A new connection must be consented to again.
create function training_private.strava_sharing_reset() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 update public.training_members set strava_shared_at = null
  where user_id = old.user_id and strava_shared_at is not null;
 return old;
end $$;
revoke all on function training_private.strava_sharing_reset() from public, anon, authenticated, service_role;
create trigger strava_sharing_reset after delete on public.training_strava_connections
 for each row execute function training_private.strava_sharing_reset();
