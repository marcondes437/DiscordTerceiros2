-- Execute uma vez no SQL Editor do Supabase (projeto usado pelo site).
create table if not exists public.social_profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null check (char_length(display_name) between 1 and 60), created_at timestamptz not null default now());
create table if not exists public.social_posts (id uuid primary key default gen_random_uuid(), author_id uuid not null references auth.users(id) on delete cascade, body text not null check (char_length(btrim(body)) between 1 and 500), parent_id uuid references public.social_posts(id) on delete set null, repost_of uuid references public.social_posts(id) on delete set null, created_at timestamptz not null default now());
create table if not exists public.social_likes (post_id uuid not null references public.social_posts(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key(post_id,user_id));
create table if not exists public.social_follows (follower_id uuid not null references auth.users(id) on delete cascade, following_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key(follower_id,following_id), constraint no_self_follow check(follower_id <> following_id));
create table if not exists public.social_reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade, post_id uuid not null references public.social_posts(id) on delete cascade, reason text not null check(char_length(btrim(reason)) between 5 and 500), created_at timestamptz not null default now(), unique(reporter_id,post_id));
create index if not exists social_posts_date_idx on public.social_posts(created_at desc);
create index if not exists social_posts_author_idx on public.social_posts(author_id);
create index if not exists social_posts_parent_idx on public.social_posts(parent_id);
create index if not exists social_follows_following_idx on public.social_follows(following_id);
alter table public.social_profiles enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_likes enable row level security;
alter table public.social_follows enable row level security;
alter table public.social_reports enable row level security;
create policy "profiles visible to members" on public.social_profiles for select to authenticated using(true);
create policy "profile owner creates" on public.social_profiles for insert to authenticated with check(id = (select auth.uid()));
create policy "profile owner edits" on public.social_profiles for update to authenticated using(id = (select auth.uid())) with check(id = (select auth.uid()));
create policy "members read posts" on public.social_posts for select to authenticated using(true);
create policy "authors publish" on public.social_posts for insert to authenticated with check(author_id = (select auth.uid()));
create policy "authors delete" on public.social_posts for delete to authenticated using(author_id = (select auth.uid()));
create policy "members read likes" on public.social_likes for select to authenticated using(true);
create policy "members like" on public.social_likes for insert to authenticated with check(user_id = (select auth.uid()));
create policy "members unlike" on public.social_likes for delete to authenticated using(user_id = (select auth.uid()));
create policy "members read follows" on public.social_follows for select to authenticated using(true);
create policy "members follow" on public.social_follows for insert to authenticated with check(follower_id = (select auth.uid()));
create policy "members unfollow" on public.social_follows for delete to authenticated using(follower_id = (select auth.uid()));
create policy "members report" on public.social_reports for insert to authenticated with check(reporter_id = (select auth.uid()));
-- Denúncias não têm política SELECT para usuários comuns: apenas equipe com acesso administrativo no Supabase.
