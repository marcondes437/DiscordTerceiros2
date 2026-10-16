create table public.direct_messages (
id uuid primary key default gen_random_uuid(),
sender_id uuid not null references auth.users(id) on delete cascade,
recipient_id uuid not null references auth.users(id) on delete cascade,
body text not null check(char_length(btrim(body)) between 1 and 2000),
created_at timestamptz not null default now(),
read_at timestamptz,
check(sender_id <> recipient_id));
alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from anon, authenticated;
grant select, insert on public.direct_messages to authenticated;
grant update(read_at) on public.direct_messages to authenticated;
create policy "Participants read messages" on public.direct_messages for select to authenticated using ((select auth.uid()) in (sender_id,recipient_id));
create policy "Sender sends messages" on public.direct_messages for insert to authenticated with check(sender_id=(select auth.uid()) and read_at is null);
create policy "Recipient marks messages read" on public.direct_messages for update to authenticated using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));
create index direct_messages_recipient_idx on public.direct_messages(recipient_id,created_at desc);
create index direct_messages_sender_idx on public.direct_messages(sender_id,created_at desc);
insert into public.social_profiles(id,display_name) select id, left(coalesce(nullif(raw_user_meta_data->>'display_name',''),nullif(raw_user_meta_data->>'full_name',''),'Aluno'),60) from auth.users on conflict(id) do nothing;
notify pgrst, 'reload schema';
