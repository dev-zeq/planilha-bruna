create or replace function public.strava_server_link_many(p_user uuid,p_activities bigint[],p_session uuid,p_version bigint) returns void language plpgsql security invoker set search_path='' as $$
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
   values(p_session,p_user,'done',round(total_m/1000,2),total_s::int,'Atividades do Strava agrupadas (tempo em movimento).','strava') on conflict do nothing;
 else
  update public.training_results set status='done',actual_km=round(total_m/1000,2),duration_seconds=total_s::int,notes='Atividades do Strava agrupadas (tempo em movimento).',strava_activity_id=null,source='strava' where session_id=p_session and user_id=p_user and version=p_version;
 end if;
 get diagnostics n=row_count;if n<>1 then raise exception 'CONFLICT: resultado alterado';end if;
 previous_flag:=current_setting('treinos.strava_relink',true);perform set_config('treinos.strava_relink','on',true);
 delete from public.training_strava_result_activities where session_id=p_session and user_id=p_user;
 insert into public.training_strava_result_activities(session_id,user_id,activity_id,distance_m,moving_seconds)
  select p_session,p_user,activity_id,distance_m,moving_seconds from public.training_strava_activities where user_id=p_user and activity_id=any(p_activities);
 perform set_config('treinos.strava_relink',coalesce(previous_flag,'off'),true);
end $$;
