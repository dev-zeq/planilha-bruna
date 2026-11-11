-- Group links now enforce uniqueness; legacy activity_id is constrained to NULL.
drop index if exists public.training_results_strava_user_idx;
drop index if exists public.training_results_user_id_strava_activity_id_idx;
create index if not exists authorizations_group_idx on training_private.authorizations(group_id);
