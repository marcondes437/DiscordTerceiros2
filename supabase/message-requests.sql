-- Conversation requests contain no message text. Acceptance creates friendship.
begin;
alter table public.community_friendships add column request_kind text not null default 'friendship'
  check (request_kind in ('friendship','message'));
grant insert(request_kind) on public.community_friendships to authenticated;
notify pgrst,'reload schema';
commit;
