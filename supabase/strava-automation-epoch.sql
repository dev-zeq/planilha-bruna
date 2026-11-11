create or replace function public.strava_server_token(p_user uuid,p_lease uuid,p_update jsonb default null,p_release boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_secret uuid;tokens jsonb;
begin
 if not exists(select 1 from public.training_members where user_id=p_user) then raise exception 'Membro necessário'; end if;
 if p_release then
  update training_private.strava_credentials set lease_id=null,lease_until=null where user_id=p_user and lease_id=p_lease;return null;
 elsif p_update is not null then
  select secret_id into v_secret from training_private.strava_credentials where user_id=p_user and lease_id=p_lease and lease_until>now() for update;
  if v_secret is null then raise exception 'BUSY'; end if;
  if coalesce(p_update->>'access_token','')='' or coalesce(p_update->>'refresh_token','')='' then raise exception 'Tokens inválidos'; end if;
  perform vault.update_secret(v_secret,p_update::text);return null;
 end if;
 update training_private.strava_credentials set lease_id=p_lease,lease_until=now()+interval '90 seconds' where user_id=p_user and (lease_until is null or lease_until<now()) returning secret_id into v_secret;
 if v_secret is null then raise exception 'BUSY_OR_NOT_CONNECTED'; end if;
 select decrypted_secret::jsonb into tokens from vault.decrypted_secrets where id=v_secret;
 return tokens||jsonb_build_object('_connection_epoch',(select connected_at from public.training_strava_connections where user_id=p_user));
end $$;


create function public.strava_server_disconnect_if(p_user uuid,p_epoch timestamptz) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.training_strava_connections where user_id=p_user and connected_at=p_epoch for update;
 if found then perform public.strava_server_disconnect(p_user);end if;
end $$;
revoke all on function public.strava_server_disconnect_if(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.strava_server_disconnect_if(uuid,timestamptz) to service_role;
