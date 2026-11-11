-- A live provider re-read of an existing own activity checks the persistent
-- inbox/cron path without uploading fake activities or changing a Strava record.
create or replace function public.strava_server_probe(p_user uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare athlete bigint;activity bigint;subscription bigint;
begin
 select c.athlete_id,a.activity_id into athlete,activity from public.training_strava_connections c join public.training_strava_activities a on a.user_id=c.user_id where c.user_id=p_user order by a.start_date desc limit 1;
 if activity is null then return false;end if;
 select subscription_id into subscription from training_private.strava_automation where singleton;
 if subscription is null then return false;end if;
 return public.strava_server_enqueue(subscription,athlete,activity,'activity','update',floor(extract(epoch from now()))::bigint,repeat(md5(gen_random_uuid()::text),2));
end $$;
revoke all on function public.strava_server_probe(uuid) from public,anon,authenticated;
grant execute on function public.strava_server_probe(uuid) to service_role;
