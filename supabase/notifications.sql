begin;
create schema notification_private;
revoke all on schema notification_private from public, anon, authenticated;

create table public.gaming_invitations (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.gaming_rooms(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 check(sender_id<>recipient_id), unique(room_id,sender_id,recipient_id)
);
create index gaming_invitations_sender_idx on public.gaming_invitations(sender_id);
create index gaming_invitations_recipient_idx on public.gaming_invitations(recipient_id);
alter table public.gaming_invitations enable row level security;
revoke all on public.gaming_invitations from anon, authenticated;
grant select on public.gaming_invitations to authenticated;
grant insert(room_id,sender_id,recipient_id) on public.gaming_invitations to authenticated;
create policy "Participants see game invitations" on public.gaming_invitations for select to authenticated
 using((select auth.uid()) in (sender_id,recipient_id));
create policy "Active players invite accepted friends" on public.gaming_invitations for insert to authenticated
 with check(sender_id=(select auth.uid())
  and exists(select 1 from public.community_friendships f where f.status='accepted'
   and least(f.requester_id,f.recipient_id)=least(gaming_invitations.sender_id,gaming_invitations.recipient_id)
   and greatest(f.requester_id,f.recipient_id)=greatest(gaming_invitations.sender_id,gaming_invitations.recipient_id))
  and exists(select 1 from public.gaming_members m join public.gaming_rooms r on r.id=m.room_id
   where m.room_id=gaming_invitations.room_id and m.user_id=(select auth.uid())
    and m.seen_at>now()-interval '60 seconds' and r.updated_at>now()-interval '90 seconds'));

create table public.site_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 actor_name text not null,
 kind text not null check(kind in ('message','post','game_invite')),
 message_id uuid references public.direct_messages(id) on delete cascade,
 post_id uuid references public.social_posts(id) on delete cascade,
 invitation_id uuid references public.gaming_invitations(id) on delete cascade,
 room_id uuid, game text check(game in ('rabisco','slithersenai')),
 created_at timestamptz not null default now(), read_at timestamptz,
 check((kind='message' and message_id is not null and post_id is null and invitation_id is null)
   or (kind='post' and post_id is not null and message_id is null and invitation_id is null)
   or (kind='game_invite' and invitation_id is not null and message_id is null and post_id is null and room_id is not null and game is not null)),
 unique(user_id,message_id), unique(user_id,post_id), unique(user_id,invitation_id)
);
create index site_notifications_inbox_idx on public.site_notifications(user_id,created_at desc,id desc);
create index site_notifications_unread_idx on public.site_notifications(user_id) where read_at is null;
create index site_notifications_actor_idx on public.site_notifications(actor_id);
create index site_notifications_message_idx on public.site_notifications(message_id) where message_id is not null;
create index site_notifications_post_idx on public.site_notifications(post_id) where post_id is not null;
create index site_notifications_invitation_idx on public.site_notifications(invitation_id) where invitation_id is not null;
alter table public.site_notifications enable row level security;
revoke all on public.site_notifications from anon,authenticated;
grant select on public.site_notifications to authenticated;
grant update(read_at) on public.site_notifications to authenticated;
create policy "Recipient reads notifications" on public.site_notifications for select to authenticated using(user_id=(select auth.uid()));
create policy "Recipient marks notifications read" on public.site_notifications for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Trigger-only privileged code: clients cannot fabricate another user's alerts.
create function notification_private.dispatch() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; actorname text; roomgame text;
begin
 if tg_table_name='direct_messages' then actor:=new.sender_id;
 elsif tg_table_name='social_posts' then actor:=new.author_id;
 else actor:=new.sender_id;
 end if;
 if auth.uid() is null or auth.uid()<>actor then return new; end if;
 select display_name into actorname from public.social_profiles where id=actor;
 actorname:=coalesce(actorname,'Membro da comunidade');
 if tg_table_name='direct_messages' then
   insert into public.site_notifications(user_id,actor_id,actor_name,kind,message_id)
     values(new.recipient_id,actor,actorname,'message',new.id) on conflict do nothing;
 elsif tg_table_name='social_posts' then
   if new.parent_id is null then
     insert into public.site_notifications(user_id,actor_id,actor_name,kind,post_id)
       select follower_id,actor,actorname,'post',new.id from public.social_follows
       where following_id=actor and follower_id<>actor on conflict do nothing;
   end if;
 else
   select game into roomgame from public.gaming_rooms where id=new.room_id;
   insert into public.site_notifications(user_id,actor_id,actor_name,kind,invitation_id,room_id,game)
     values(new.recipient_id,actor,actorname,'game_invite',new.id,new.room_id,roomgame) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function notification_private.dispatch() from public, anon, authenticated;
create trigger notify_private_message after insert on public.direct_messages for each row execute function notification_private.dispatch();
create trigger notify_followers_post after insert on public.social_posts for each row execute function notification_private.dispatch();
create trigger notify_game_invitation after insert on public.gaming_invitations for each row execute function notification_private.dispatch();

create function notification_private.message_read() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid()=new.recipient_id and new.read_at is not null then
   update public.site_notifications set read_at=new.read_at where message_id=new.id and user_id=new.recipient_id and read_at is null;
 end if;
 return new;
end $$;
revoke all on function notification_private.message_read() from public, anon, authenticated;
create trigger notify_message_read after update of read_at on public.direct_messages for each row execute function notification_private.message_read();
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_notifications') then
   alter publication supabase_realtime add table public.site_notifications;
 end if;
end $$;
notify pgrst,'reload schema';
commit;
