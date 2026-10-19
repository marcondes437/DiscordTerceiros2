alter table public.social_posts add column quote_of uuid references public.social_posts(id) on delete set null;
alter table public.social_posts add column is_quote boolean not null default false;
alter table public.social_posts add column edited_at timestamptz;
alter table public.social_posts add column poll_options text[];
alter table public.social_posts add column poll_closes_at timestamptz;
alter table public.social_posts add column legacy_repost boolean not null default false;
update public.social_posts set legacy_repost=true where repost_of is not null;
create index social_posts_quote_idx on public.social_posts(quote_of) where quote_of is not null;
revoke update on public.social_posts from authenticated;
grant update(body) on public.social_posts to authenticated;
create policy "Authors edit their own post text" on public.social_posts for update to authenticated
using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));

create schema social_private;
revoke all on schema social_private from public,anon,authenticated;
grant usage on schema social_private to authenticated;
create function social_private.validate_post() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
   if new.body is distinct from old.body then
     if old.poll_options is not null then raise exception 'Poll questions cannot be edited'; end if;
     new.edited_at:=now();
   end if;
 else
   new.created_at:=now();
   new.edited_at:=null;
   new.legacy_repost:=new.repost_of is not null;
   new.is_quote:=new.quote_of is not null;
   if (new.poll_options is null)<>(new.poll_closes_at is null) then raise exception 'Incomplete poll'; end if;
   if new.poll_options is not null then
     if coalesce(array_length(new.poll_options,1),0) not between 2 and 4
       or exists(select 1 from unnest(new.poll_options) o where o is null or length(btrim(o)) not between 1 and 25)
       or (select count(distinct lower(btrim(o))) from unnest(new.poll_options) o)<>array_length(new.poll_options,1)
       or new.poll_closes_at<now()+interval '5 minutes' or new.poll_closes_at>now()+interval '7 days'
       or new.quote_of is not null or new.media_id is not null then raise exception 'Invalid poll'; end if;
   end if;
 end if;
 return new;
end $$;
revoke all on function social_private.validate_post() from public,anon,authenticated;
create trigger social_post_validation before insert or update on public.social_posts for each row execute function social_private.validate_post();

create table public.social_bookmarks (
 user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.social_posts(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(user_id,post_id)
);
create index social_bookmarks_post_idx on public.social_bookmarks(post_id);
alter table public.social_bookmarks enable row level security;
revoke all on public.social_bookmarks from public,anon,authenticated;
grant select,insert,delete on public.social_bookmarks to authenticated;
create policy "Bookmarks are private" on public.social_bookmarks for select to authenticated using(user_id=(select auth.uid()));
create policy "Save own bookmarks" on public.social_bookmarks for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Remove own bookmarks" on public.social_bookmarks for delete to authenticated using(user_id=(select auth.uid()));

create table public.social_mutes (
 user_id uuid not null references auth.users(id) on delete cascade,
 muted_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(user_id,muted_id),check(user_id<>muted_id)
);
create index social_mutes_target_idx on public.social_mutes(muted_id);
alter table public.social_mutes enable row level security;
revoke all on public.social_mutes from public,anon,authenticated;
grant select,insert,delete on public.social_mutes to authenticated;
create policy "Read own muted accounts" on public.social_mutes for select to authenticated using(user_id=(select auth.uid()));
create policy "Mute for yourself" on public.social_mutes for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Unmute for yourself" on public.social_mutes for delete to authenticated using(user_id=(select auth.uid()));

create table public.social_reposts (
 post_id uuid not null references public.social_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(post_id,user_id)
);
create index social_reposts_user_idx on public.social_reposts(user_id,created_at desc);
alter table public.social_reposts enable row level security;
revoke all on public.social_reposts from public,anon,authenticated;
grant select,insert,delete on public.social_reposts to authenticated;
create policy "Members see reposts" on public.social_reposts for select to authenticated using(true);
create policy "Repost as yourself" on public.social_reposts for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Undo own reposts" on public.social_reposts for delete to authenticated using(user_id=(select auth.uid()));
-- Keep old records intact, but import their references into the new undoable model.
insert into public.social_reposts(post_id,user_id,created_at)
 select repost_of,author_id,min(created_at) from public.social_posts where repost_of is not null group by repost_of,author_id on conflict do nothing;
with recursive sources as (
 select p.id event_id,p.author_id,p.created_at,p.repost_of source,array[p.id] visited
 from public.social_posts p where p.legacy_repost and p.repost_of is not null
 union all
 select s.event_id,s.author_id,s.created_at,p.repost_of,s.visited||p.id
 from sources s join public.social_posts p on p.id=s.source
 where p.legacy_repost and p.repost_of is not null and not p.id=any(s.visited)
)
insert into public.social_reposts(post_id,user_id,created_at)
 select s.source,s.author_id,min(s.created_at) from sources s join public.social_posts p on p.id=s.source
 where not p.legacy_repost group by s.source,s.author_id on conflict do nothing;

create table public.social_pins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 post_id uuid not null references public.social_posts(id) on delete cascade
);
create index social_pins_post_idx on public.social_pins(post_id);
alter table public.social_pins enable row level security;
revoke all on public.social_pins from public,anon,authenticated;
grant select,insert,delete on public.social_pins to authenticated;
grant update(post_id) on public.social_pins to authenticated;
create policy "Members see profile pins" on public.social_pins for select to authenticated using(true);
create policy "Pin own posts" on public.social_pins for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and p.author_id=(select auth.uid()) and p.parent_id is null));
create policy "Replace own pin" on public.social_pins for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and p.author_id=(select auth.uid()) and p.parent_id is null));
create policy "Remove own pin" on public.social_pins for delete to authenticated using(user_id=(select auth.uid()));

create table social_private.poll_votes (
 post_id uuid not null references public.social_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 choice integer not null check(choice between 0 and 3),primary key(post_id,user_id)
);
create index social_poll_votes_user_idx on social_private.poll_votes(user_id);
alter table social_private.poll_votes enable row level security;
create policy "Votes have no direct client access" on social_private.poll_votes for all to authenticated using(false) with check(false);
revoke all on social_private.poll_votes from public,anon,authenticated;
create function social_private.vote(p_post uuid,p_choice integer) returns void language plpgsql security definer set search_path='' as $$
declare options text[]; deadline timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select poll_options,poll_closes_at into options,deadline from public.social_posts where id=p_post for share;
 if options is null or deadline<=now() or p_choice is null or p_choice<0 or p_choice>=array_length(options,1) then raise exception 'Poll closed or invalid choice'; end if;
 insert into social_private.poll_votes(post_id,user_id,choice) values(p_post,auth.uid(),p_choice);
end $$;
revoke all on function social_private.vote(uuid,integer) from public,anon,authenticated;
grant execute on function social_private.vote(uuid,integer) to authenticated;
create function public.social_vote(p_post uuid,p_choice integer) returns void language sql security invoker set search_path='' as $$select social_private.vote(p_post,p_choice)$$;
revoke all on function public.social_vote(uuid,integer) from public,anon;
grant execute on function public.social_vote(uuid,integer) to authenticated;
create function social_private.poll_results(p_post uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare options text[]; deadline timestamptz; mine integer; counts jsonb; total integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select poll_options,poll_closes_at into options,deadline from public.social_posts where id=p_post;
 if options is null then return null; end if;
 select choice into mine from social_private.poll_votes where post_id=p_post and user_id=auth.uid();
 select count(*)::int into total from social_private.poll_votes where post_id=p_post;
 select jsonb_agg(case when mine is not null or deadline<=now() then (select count(*) from social_private.poll_votes where post_id=p_post and choice=i) else 0 end order by i)
 into counts from generate_series(0,array_length(options,1)-1) i;
 return jsonb_build_object('counts',counts,'total',total,'choice',mine,'closed',deadline<=now());
end $$;
revoke all on function social_private.poll_results(uuid) from public,anon,authenticated;
grant execute on function social_private.poll_results(uuid) to authenticated;
create function public.social_poll_results(p_post uuid) returns jsonb language sql stable security invoker set search_path='' as $$select social_private.poll_results(p_post)$$;
revoke all on function public.social_poll_results(uuid) from public,anon;
grant execute on function public.social_poll_results(uuid) to authenticated;

create function public.social_publish(p_bodies text[],p_parent uuid default null,p_quote uuid default null,p_options text[] default null,p_duration integer default 1440)
 returns setof public.social_posts language plpgsql security invoker set search_path='' as $$
declare body text; previous uuid:=p_parent; created public.social_posts; first_post boolean:=true;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if coalesce(array_length(p_bodies,1),0) not between 1 and 8 then raise exception 'Invalid thread length'; end if;
 if p_options is not null and (p_duration is null or p_duration not between 5 and 10080) then raise exception 'Invalid poll duration'; end if;
 foreach body in array p_bodies loop
   insert into public.social_posts(author_id,body,parent_id,quote_of,poll_options,poll_closes_at)
   values(auth.uid(),btrim(body),previous,case when first_post then p_quote end,case when first_post then p_options end,
     case when first_post and p_options is not null then now()+make_interval(mins=>p_duration) end) returning * into created;
   previous:=created.id;first_post:=false;return next created;
 end loop;
end $$;
revoke all on function public.social_publish(text[],uuid,uuid,text[],integer) from public,anon;
grant execute on function public.social_publish(text[],uuid,uuid,text[],integer) to authenticated;

create function public.social_post_details(p_ids uuid[]) returns setof jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(p)||jsonb_build_object(
 'author_name',coalesce(a.display_name,'Membro'),
 'like_count',(select count(*) from public.social_likes l where l.post_id=p.id),
 'reply_count',(select count(*) from public.social_posts r where r.parent_id=p.id),
 'repost_count',(select count(*) from public.social_reposts r where r.post_id=p.id),
 'liked',exists(select 1 from public.social_likes l where l.post_id=p.id and l.user_id=auth.uid()),
 'reposted',exists(select 1 from public.social_reposts r where r.post_id=p.id and r.user_id=auth.uid()),
 'bookmarked',exists(select 1 from public.social_bookmarks b where b.post_id=p.id and b.user_id=auth.uid()),
 'pinned',exists(select 1 from public.social_pins s where s.post_id=p.id and s.user_id=p.author_id),
 'quoted',case when q.id is not null then to_jsonb(q)||jsonb_build_object('author_name',coalesce(qa.display_name,'Membro')) end)
 from public.social_posts p left join public.social_profiles a on a.id=p.author_id
 left join public.social_posts q on q.id=p.quote_of left join public.social_profiles qa on qa.id=q.author_id
 where p.id=any(p_ids[1:100]) and not p.legacy_repost and auth.uid() is not null;
$$;
revoke all on function public.social_post_details(uuid[]) from public,anon;
grant execute on function public.social_post_details(uuid[]) to authenticated;

create function public.social_feed(p_mode text default 'todos',p_query text default '',p_author uuid default null,p_limit integer default 30,p_offset integer default 0)
 returns setof jsonb language sql stable security invoker set search_path='' as $$
 with events as (
  select p.id,p.author_id actor,case when p_mode='salvos' then (select b.created_at from public.social_bookmarks b where b.post_id=p.id and b.user_id=auth.uid()) else p.created_at end occurred_at,'post:'||p.id as entry_id,false as shared from public.social_posts p
  where not p.legacy_repost and (p.parent_id is null or p_mode='salvos')
  union all
  select r.post_id,r.user_id,r.created_at,'repost:'||r.post_id||':'||r.user_id,true from public.social_reposts r where p_mode<>'salvos'
 ), filtered as (
  select e.*,case when p_mode='todos' and p_author is null and coalesce(p_query,'')='' then
   (1+(select count(*) from public.social_likes l where l.post_id=e.id)+2*(select count(*) from public.social_reposts r where r.post_id=e.id))::numeric
    /power(greatest(0,extract(epoch from(now()-e.occurred_at))/3600)+2,1.2) else 0 end as score,
    exists(select 1 from public.social_pins s where s.user_id=coalesce(p_author,case when p_mode='meus' then auth.uid() end) and s.post_id=e.id and not e.shared) as profile_pin
  from events e join public.social_posts p on p.id=e.id left join public.social_profiles a on a.id=p.author_id
  where auth.uid() is not null and not p.legacy_repost and p_mode in ('todos','seguindo','meus','salvos')
   and (p_author is null or e.actor=p_author)
   and (p_mode<>'meus' or e.actor=auth.uid())
   and (p_mode<>'salvos' or exists(select 1 from public.social_bookmarks b where b.user_id=auth.uid() and b.post_id=e.id))
   and (p_mode<>'seguindo' or e.actor=auth.uid() or exists(select 1 from public.social_follows f where f.follower_id=auth.uid() and f.following_id=e.actor))
   and not exists(select 1 from public.social_mutes m where m.user_id=auth.uid() and m.muted_id in (p.author_id,e.actor))
   and (coalesce(p_query,'')='' or strpos(lower(p.body),lower(left(p_query,100)))>0 or strpos(lower(coalesce(a.display_name,'')),lower(left(p_query,100)))>0)
 ), page as (
  select * from filtered order by profile_pin desc,score desc,occurred_at desc,entry_id limit least(100,greatest(1,p_limit)) offset greatest(0,p_offset)
 )
 select detail||jsonb_build_object('entry_id',page.entry_id,'repost_actor',case when shared then actor end,'repost_name',a.display_name,'occurred_at',page.occurred_at)
 from page join public.social_post_details(array(select id from page)) detail on (detail->>'id')::uuid=page.id
 left join public.social_profiles a on a.id=page.actor
 order by page.profile_pin desc,page.score desc,page.occurred_at desc,page.entry_id;
$$;
revoke all on function public.social_feed(text,text,uuid,integer,integer) from public,anon;
grant execute on function public.social_feed(text,text,uuid,integer,integer) to authenticated;
notify pgrst,'reload schema';

create function public.social_pin(p_post uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_post is null then delete from public.social_pins where user_id=auth.uid();
 else insert into public.social_pins(user_id,post_id) values(auth.uid(),p_post)
 on conflict(user_id) do update set post_id=excluded.post_id;
 end if;
end $$;
revoke all on function public.social_pin(uuid) from public,anon;
grant execute on function public.social_pin(uuid) to authenticated;

create function social_private.stamp_created() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.created_at:=now();return new;end $$;
revoke all on function social_private.stamp_created() from public,anon,authenticated;
create trigger social_repost_timestamp before insert on public.social_reposts for each row execute function social_private.stamp_created();
create trigger social_bookmark_timestamp before insert on public.social_bookmarks for each row execute function social_private.stamp_created();
