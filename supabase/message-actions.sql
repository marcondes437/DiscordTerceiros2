-- Content-only edits. Identity, conversation and creation time stay immutable.
revoke update on public.community_messages from authenticated;
grant update(content) on public.community_messages to authenticated;
create policy "Authors edit channel content" on public.community_messages for update to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create schema if not exists message_private;
revoke all on schema message_private from public, anon, authenticated;
create function message_private.guard_direct_edit() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.body is distinct from old.body and (select auth.uid()) is distinct from old.sender_id then
   raise exception 'Only the sender may edit content' using errcode='42501';
 end if;
 if new.read_at is distinct from old.read_at and (select auth.uid()) is distinct from old.recipient_id then
   raise exception 'Only the recipient may mark messages read' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function message_private.guard_direct_edit() from public, anon, authenticated;
create trigger guard_direct_content before update on public.direct_messages for each row execute function message_private.guard_direct_edit();
grant update(body) on public.direct_messages to authenticated;
create policy "Senders edit direct content" on public.direct_messages for update to authenticated
using ((select auth.uid())=sender_id) with check ((select auth.uid())=sender_id);

create table public.chat_message_marks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 channel_message_id uuid references public.community_messages(id) on delete cascade,
 direct_message_id uuid references public.direct_messages(id) on delete cascade,
 kind text not null check(kind in ('reaction','pin','favorite')),
 value text not null default '' check(length(value)<=32),
 created_at timestamptz not null default now(),
 check(num_nonnulls(channel_message_id,direct_message_id)=1),
 check((kind='reaction' and length(value)>0) or (kind<>'reaction' and value=''))
);
create unique index chat_marks_channel_unique on public.chat_message_marks(channel_message_id,user_id,kind,value) where channel_message_id is not null;
create unique index chat_marks_direct_unique on public.chat_message_marks(direct_message_id,user_id,kind,value) where direct_message_id is not null;
create index chat_marks_user on public.chat_message_marks(user_id);
alter table public.chat_message_marks enable row level security;
grant select,insert,delete on public.chat_message_marks to authenticated;
create policy "Readers see reactions and pins and their own favorites" on public.chat_message_marks for select to authenticated using (
 (kind<>'favorite' or user_id=(select auth.uid())) and (
 exists(select 1 from public.community_messages m where m.id=channel_message_id)
 or exists(select 1 from public.direct_messages m where m.id=direct_message_id))
);
create policy "Readers add their own marks" on public.chat_message_marks for insert to authenticated with check (
 user_id=(select auth.uid()) and (
 exists(select 1 from public.community_messages m where m.id=channel_message_id)
 or exists(select 1 from public.direct_messages m where m.id=direct_message_id))
);
create policy "Readers remove own marks" on public.chat_message_marks for delete to authenticated using (
 user_id=(select auth.uid()) and (
 exists(select 1 from public.community_messages m where m.id=channel_message_id)
 or exists(select 1 from public.direct_messages m where m.id=direct_message_id))
);
