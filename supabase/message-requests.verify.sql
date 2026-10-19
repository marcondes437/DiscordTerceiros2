-- Run after friendships.sql, message-requests.sql and message-deletion.sql.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('30000000-0000-4000-8000-000000000001','authenticated','authenticated','request-test-1@example.invalid','{}','{}',now(),now()),
 ('30000000-0000-4000-8000-000000000002','authenticated','authenticated','request-test-2@example.invalid','{}','{}',now(),now()),
 ('30000000-0000-4000-8000-000000000003','authenticated','authenticated','request-test-3@example.invalid','{}','{}',now(),now());
insert into public.social_profiles(id,display_name) values
 ('30000000-0000-4000-8000-000000000001','Request test A'),
 ('30000000-0000-4000-8000-000000000002','Request test B'),
 ('30000000-0000-4000-8000-000000000003','Request test C') on conflict(id) do nothing;
do $$
declare a uuid:='30000000-0000-4000-8000-000000000001'; b uuid:='30000000-0000-4000-8000-000000000002'; c uuid:='30000000-0000-4000-8000-000000000003'; own_dm uuid; other_dm uuid; own_chat uuid; n int;
begin
 execute 'set local role authenticated';
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 insert into public.community_friendships(requester_id,recipient_id,request_kind) values(a,b,'message');
 if not exists(select 1 from public.community_friendships where requester_id=a and request_kind='message' and status='pending') then raise exception 'TEST: request kind not saved'; end if;
 begin insert into public.direct_messages(sender_id,recipient_id,body) values(a,b,'Not accepted'); raise exception 'TEST: conversation request allowed a message'; exception when insufficient_privilege then null; end;
 update public.community_friendships set status='accepted' where requester_id=a;
 get diagnostics n=row_count; if n<>0 then raise exception 'TEST: sender accepted own conversation request'; end if;
 begin update public.community_friendships set request_kind='friendship' where requester_id=a; raise exception 'TEST: request kind changed by client'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 if not exists(select 1 from public.community_friendships where recipient_id=b and request_kind='message' and status='pending') then raise exception 'TEST: recipient cannot see request'; end if;
 update public.community_friendships set status='accepted' where requester_id=a and recipient_id=b;
 insert into public.direct_messages(sender_id,recipient_id,body) values(b,a,'From B') returning id into other_dm;
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 insert into public.direct_messages(sender_id,recipient_id,body) values(a,b,'From A') returning id into own_dm;
 delete from public.direct_messages where id=other_dm; get diagnostics n=row_count;
 if n<>0 then raise exception 'TEST: recipient deleted another sender message'; end if;
 insert into public.community_messages(channel,user_id,display_name,content) values('geral',a,'Request test A','Own channel message') returning id into own_chat;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 delete from public.community_messages where id=own_chat; get diagnostics n=row_count;
 if n<>0 then raise exception 'TEST: other member deleted channel message'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',c,'role','authenticated')::text,true);
 delete from public.direct_messages where id in (own_dm,other_dm); get diagnostics n=row_count;
 if n<>0 then raise exception 'TEST: stranger deleted a private message'; end if;
 if exists(select 1 from public.community_friendships where requester_id=a) then raise exception 'TEST: stranger read conversation request'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 delete from public.direct_messages where id=own_dm; get diagnostics n=row_count;
 if n<>1 then raise exception 'TEST: sender cannot delete own DM'; end if;
 delete from public.community_messages where id=own_chat; get diagnostics n=row_count;
 if n<>1 then raise exception 'TEST: sender cannot delete own channel message'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.direct_messages where id=own_dm) then raise exception 'TEST: deleted DM remains visible to recipient'; end if;
 if not exists(select 1 from public.direct_messages where id=other_dm) then raise exception 'TEST: unrelated message lost'; end if;
 execute 'reset role';
end $$;
rollback;
select 'Passed: textless requests, recipient-only acceptance, accepted friendship unlock, own-only deletion for private and channel messages, deletion shared with recipient, unrelated history retained and third-party isolation. Fixtures rolled back.' as verification;
