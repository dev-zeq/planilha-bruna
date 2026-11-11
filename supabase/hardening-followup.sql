-- Advisor follow-up: keep existing indexes and remove newly duplicated copies.
drop index if exists public.training_sessions_group_id_training_date_idx;
drop index if exists public.training_results_user_id_idx;
create index if not exists training_groups_owner_id_idx on public.training_groups(owner_id);
create index if not exists training_sessions_created_by_idx on public.training_sessions(created_by);
alter table training_private.authorizations add constraint authorizations_group_fk foreign key(group_id) references public.training_groups(id);
alter table public.training_sessions add constraint training_description_length check(length(description)<=20000);
alter table public.training_results add constraint training_notes_length check(length(notes)<=20000);
