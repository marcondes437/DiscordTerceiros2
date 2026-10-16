alter table public.social_profiles
add column avatar_url text,
add column banner_url text,
add column bio text not null default '' check(char_length(bio)<=190),
add column banner_color text not null default '#353741' check(banner_color ~ '^#[0-9a-fA-F]{6}$');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('community-profiles','community-profiles',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy "Members upload own profile images" on storage.objects for insert to authenticated with check(bucket_id='community-profiles' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Community members view profile images" on storage.objects for select to authenticated using(bucket_id='community-profiles');
create policy "Members remove own profile images" on storage.objects for delete to authenticated using(bucket_id='community-profiles' and (storage.foldername(name))[1]=(select auth.uid())::text);
notify pgrst, 'reload schema';
