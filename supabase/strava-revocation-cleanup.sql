-- Private, non-callable trigger helpers; only server roles can mutate memberships/connections.
create function training_private.strava_vault_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from vault.secrets where id in(select secret_id from training_private.strava_credentials where user_id=old.user_id);
 return old;
end $$;
revoke all on function training_private.strava_vault_cleanup() from public,anon,authenticated,service_role;
create trigger strava_connection_vault_cleanup before delete on public.training_strava_connections for each row execute function training_private.strava_vault_cleanup();
create function training_private.strava_membership_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.training_members where user_id=old.user_id) then
  delete from public.training_strava_connections where user_id=old.user_id;
  delete from training_private.strava_states where user_id=old.user_id;
 end if;
 return old;
end $$;
revoke all on function training_private.strava_membership_cleanup() from public,anon,authenticated,service_role;
create trigger strava_membership_revoked after delete on public.training_members for each row execute function training_private.strava_membership_cleanup();
