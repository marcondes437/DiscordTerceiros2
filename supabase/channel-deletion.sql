alter table public.community_channel_names add column archived boolean not null default false;
grant update(archived) on public.community_channel_names to authenticated;
create function public.set_community_channel_archived(p_channel_id text,p_kind text,p_name text,p_archived boolean) returns void language sql security invoker set search_path='' as $$
insert into public.community_channel_names(channel_id,kind,name,updated_by,archived,updated_at)
values(p_channel_id,p_kind,btrim(p_name),auth.uid(),p_archived,now())
on conflict(channel_id,kind) do update set archived=excluded.archived,updated_by=auth.uid(),updated_at=now();
$$;
revoke all on function public.set_community_channel_archived(text,text,text,boolean) from public,anon;
grant execute on function public.set_community_channel_archived(text,text,text,boolean) to authenticated;
create policy "Archived channels do not accept new messages" on public.community_messages as restrictive for insert to authenticated with check(not exists(select 1 from public.community_channel_names n where n.channel_id=channel and n.kind='text' and n.archived));
notify pgrst, 'reload schema';
