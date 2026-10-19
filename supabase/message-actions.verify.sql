begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('40000000-0000-4000-8000-000000000001','authenticated','authenticated','message-actions-a@example.invalid','{}','{}',now(),now()),
('40000000-0000-4000-8000-000000000002','authenticated','authenticated','message-actions-b@example.invalid','{}','{}',now(),now()),
('40000000-0000-4000-8000-000000000003','authenticated','authenticated','message-actions-c@example.invalid','{}','{}',now(),now());
insert into public.social_profiles(id,display_name) values
('40000000-0000-4000-8000-000000000001','Action test A'),
('40000000-0000-4000-8000-000000000002','Action test B'),
('40000000-0000-4000-8000-000000000003','Action test C') on conflict(id) do nothing;
insert into public.community_friendships(requester_id,recipient_id,status) values
('40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','accepted');
do $$
declare
 a uuid:='40000000-0000-4000-8000-000000000001';
 b uuid:='40000000-0000-4000-8000-000000000002';
 c uuid:='40000000-0000-4000-8000-000000000003';
 chat uuid; dm uuid; restricted_chat uuid; n int;
begin
 insert into public.community_messages(channel,user_id,display_name,content) values('terceiro-b:geral',b,'Action test B','Restricted') returning id into restricted_chat;
 execute 'set local role authenticated';
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated','app_metadata',json_build_object('turma','terceiro-a'))::text,true);
 insert into public.community_messages(channel,user_id,display_name,content) values('geral',a,'Action test A','Original') returning id into chat;
 insert into public.direct_messages(sender_id,recipient_id,body) values(a,b,'Original DM') returning id into dm;
 update public.community_messages set content='Edited' where id=chat;
 get diagnostics n=row_count; if n<>1 then raise exception 'TEST: channel author cannot edit'; end if;
 update public.direct_messages set body='Edited DM' where id=dm;
 get diagnostics n=row_count; if n<>1 then raise exception 'TEST: DM sender cannot edit'; end if;
 begin update public.community_messages set channel='other' where id=chat; raise exception 'TEST: channel identity changed'; exception when insufficient_privilege then null; end;
 begin update public.direct_messages set recipient_id=c where id=dm; raise exception 'TEST: recipient changed'; exception when insufficient_privilege then null; end;
 begin update public.direct_messages set read_at=now() where id=dm; raise exception 'TEST: sender marked recipient read'; exception when insufficient_privilege then null; end;
 insert into public.chat_message_marks(user_id,channel_message_id,kind,value) values(a,chat,'reaction','👍'),(a,chat,'pin',''),(a,chat,'favorite','');
 insert into public.chat_message_marks(user_id,direct_message_id,kind,value) values(a,dm,'reaction','👍'),(a,dm,'favorite','');
 begin insert into public.chat_message_marks(user_id,channel_message_id,kind,value) values(b,chat,'reaction','🔥'); raise exception 'TEST: spoofed mark owner'; exception when insufficient_privilege then null; end;
 begin insert into public.chat_message_marks(user_id,channel_message_id,kind) values(a,restricted_chat,'pin'); raise exception 'TEST: mark in another class'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 update public.community_messages set content='Not mine' where id=chat;
 get diagnostics n=row_count; if n<>0 then raise exception 'TEST: other author edited channel content'; end if;
 begin update public.direct_messages set body='Not mine' where id=dm; raise exception 'TEST: recipient edited sender content'; exception when insufficient_privilege then null; end;
 update public.direct_messages set read_at=now() where id=dm;
 get diagnostics n=row_count; if n<>1 then raise exception 'TEST: recipient cannot mark read'; end if;
 if (select count(*) from public.chat_message_marks where channel_message_id=chat)<>2 then raise exception 'TEST: shared marks or private favorites wrong'; end if;
 if (select count(*) from public.chat_message_marks where direct_message_id=dm)<>1 then raise exception 'TEST: DM favorite leaked'; end if;
 delete from public.chat_message_marks where channel_message_id=chat;
 get diagnostics n=row_count; if n<>0 then raise exception 'TEST: removed another users marks'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',c,'role','authenticated')::text,true);
 if exists(select 1 from public.chat_message_marks where direct_message_id=dm) then raise exception 'TEST: private reaction leaked to outsider'; end if;
 begin insert into public.chat_message_marks(user_id,direct_message_id,kind,value) values(c,dm,'reaction','🔥'); raise exception 'TEST: outsider reacted to DM'; exception when insufficient_privilege then null; end;
 begin insert into public.direct_messages(sender_id,recipient_id,body) values(c,a,'Forward without friendship'); raise exception 'TEST: nonfriend forwarded'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 delete from public.community_messages where id=chat;
 delete from public.direct_messages where id=dm;
 if exists(select 1 from public.chat_message_marks where channel_message_id=chat or direct_message_id=dm) then raise exception 'TEST: orphaned marks'; end if;
 execute 'reset role';
end $$;
rollback;
select 'Passed: own-only content edits, immutable identity, recipient-only read receipts, reactions/pins shared only with readers, private favorites, own-only mark removal, class isolation, friend-only forwarding, cascading deletion. All fixtures rolled back.' as verification;
