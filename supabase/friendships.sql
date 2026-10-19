-- Apply after direct-messages.sql. Existing messages remain readable by participants.
begin;
create table public.community_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index community_friendships_pair_idx on public.community_friendships
  (least(requester_id,recipient_id), greatest(requester_id,recipient_id));
create index community_friendships_requester_idx on public.community_friendships(requester_id,status);
create index community_friendships_recipient_idx on public.community_friendships(recipient_id,status);
alter table public.community_friendships enable row level security;
revoke all on public.community_friendships from anon, authenticated;
grant select, delete on public.community_friendships to authenticated;
grant insert(requester_id,recipient_id) on public.community_friendships to authenticated;
grant update(status) on public.community_friendships to authenticated;
create policy "Participants read friendships" on public.community_friendships for select to authenticated
  using ((select auth.uid()) in (requester_id,recipient_id));
create policy "Request own friendship" on public.community_friendships for insert to authenticated
  with check (requester_id=(select auth.uid()) and status='pending'
    and exists(select 1 from public.social_profiles p where p.id=recipient_id));
create policy "Recipient accepts pending request" on public.community_friendships for update to authenticated
  using (recipient_id=(select auth.uid()) and status='pending')
  with check (recipient_id=(select auth.uid()) and status='accepted');
create policy "Participants remove friendship" on public.community_friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id,recipient_id));
-- Restrictive policy combines with the existing sender policy, even if a new
-- permissive policy is added later. No client can bypass friendship via the API.
create policy "Accepted friendship required for messages" on public.direct_messages
  as restrictive for insert to authenticated with check (
    exists(select 1 from public.community_friendships f where f.status='accepted'
      and least(f.requester_id,f.recipient_id)=least(direct_messages.sender_id,direct_messages.recipient_id)
      and greatest(f.requester_id,f.recipient_id)=greatest(direct_messages.sender_id,direct_messages.recipient_id))
  );
notify pgrst, 'reload schema';
commit;
