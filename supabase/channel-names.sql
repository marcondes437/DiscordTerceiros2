create table public.community_channel_names (
channel_id text not null,
kind text not null check(kind in ('text','voice')),
name text not null check(char_length(btrim(name)) between 1 and 60),
updated_by uuid not null references auth.users(id),
updated_at timestamptz not null default now(),
primary key(channel_id,kind),
check ((position(':' in channel_id)=0 or split_part(channel_id,':',1) in ('terceiro-a','terceiro-b')) and
case when kind='voice' then split_part(channel_id,':',array_length(string_to_array(channel_id,':'),1)) in ('conexao-livre','grupo-de-estudos','laboratorio-de-ideias')
else case when position(':' in channel_id)=0 then channel_id in ('geral','apresentacoes','avisos','projetos','programacao','mecanica','eletrica','design') else split_part(channel_id,':',2) in ('geral','avisos','estudos') end end and array_length(string_to_array(channel_id,':'),1)<=2));
alter table public.community_channel_names enable row level security;
revoke all on public.community_channel_names from anon,authenticated;
grant select,insert on public.community_channel_names to authenticated;
grant update(name,updated_by,updated_at) on public.community_channel_names to authenticated;
create policy "Members see accessible channel names" on public.community_channel_names for select to authenticated using(position(':' in channel_id)=0 or split_part(channel_id,':',1)=(select auth.jwt()->'app_metadata'->>'turma'));
create policy "Members name accessible channels" on public.community_channel_names for insert to authenticated with check(updated_by=(select auth.uid()) and (position(':' in channel_id)=0 or split_part(channel_id,':',1)=(select auth.jwt()->'app_metadata'->>'turma')));
create policy "Members rename accessible channels" on public.community_channel_names for update to authenticated using(position(':' in channel_id)=0 or split_part(channel_id,':',1)=(select auth.jwt()->'app_metadata'->>'turma')) with check(updated_by=(select auth.uid()) and (position(':' in channel_id)=0 or split_part(channel_id,':',1)=(select auth.jwt()->'app_metadata'->>'turma')));
alter publication supabase_realtime add table public.community_channel_names;
notify pgrst, 'reload schema';
create function public.rename_community_channel(p_channel_id text,p_kind text,p_name text) returns void language sql security invoker set search_path='' as $$
insert into public.community_channel_names(channel_id,kind,name,updated_by,updated_at)
values(p_channel_id,p_kind,btrim(p_name),auth.uid(),now())
on conflict(channel_id,kind) do update set name=excluded.name,updated_by=auth.uid(),updated_at=now();
$$;
revoke all on function public.rename_community_channel(text,text,text) from public,anon;
grant execute on function public.rename_community_channel(text,text,text) to authenticated;
