-- Three isolated accounts, no email or persistent fixture data.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('20000000-0000-4000-8000-000000000001','authenticated','authenticated','friend-test-1@example.invalid','{}','{}',now(),now()),
 ('20000000-0000-4000-8000-000000000002','authenticated','authenticated','friend-test-2@example.invalid','{}','{}',now(),now()),
 ('20000000-0000-4000-8000-000000000003','authenticated','authenticated','friend-test-3@example.invalid','{}','{}',now(),now());
insert into public.social_profiles(id,display_name) values
 ('20000000-0000-4000-8000-000000000001','Friend test A'),
 ('20000000-0000-4000-8000-000000000002','Friend test B'),
 ('20000000-0000-4000-8000-000000000003','Friend test C') on conflict(id) do nothing;
do $$
declare a uuid:='20000000-0000-4000-8000-000000000001'; b uuid:='20000000-0000-4000-8000-000000000002'; c uuid:='20000000-0000-4000-8000-000000000003'; n int;
begin
 execute 'set local role authenticated';
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 begin insert into public.direct_messages(sender_id,recipient_id,body) values(a,b,'Not friends'); raise exception 'TEST: stranger sent a message'; exception when insufficient_privilege then null; end;
 begin insert into public.community_friendships(requester_id,recipient_id,status) values(a,b,'accepted'); raise exception 'TEST: forged accepted friendship'; exception when insufficient_privilege then null; end;
 begin insert into public.community_friendships(requester_id,recipient_id) values(b,c); raise exception 'TEST: forged requester'; exception when insufficient_privilege then null; end;
 begin insert into public.community_friendships(requester_id,recipient_id) values(a,a); raise exception 'TEST: self friendship'; exception when check_violation then null; end;
 insert into public.community_friendships(requester_id,recipient_id) values(a,b);
 update public.community_friendships set status='accepted' where requester_id=a and recipient_id=b;
 get diagnostics n=row_count; if n<>0 then raise exception 'TEST: requester accepted own request'; end if;
 begin insert into public.direct_messages(sender_id,recipient_id,body) values(a,b,'Still pending'); raise exception 'TEST: pending request enabled messages'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 begin insert into public.community_friendships(requester_id,recipient_id) values(b,a); raise exception 'TEST: duplicate reverse request'; exception when unique_violation then null; end;
 update public.community_friendships set status='accepted' where requester_id=a and recipient_id=b;
 get diagnostics n=row_count; if n<>1 then raise exception 'TEST: recipient cannot accept'; end if;
 insert into public.direct_messages(sender_id,recipient_id,body) values(b,a,'Accepted B to A');
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 insert into public.direct_messages(sender_id,recipient_id,body) values(a,b,'Accepted A to B');
 begin update public.community_friendships set recipient_id=c where requester_id=a; raise exception 'TEST: reassigned friendship'; exception when insufficient_privilege then null; end;
 begin insert into public.direct_messages(sender_id,recipient_id,body) values(a,c,'Wrong pair'); raise exception 'TEST: friendship with someone else enabled messages'; exception when insufficient_privilege then null; end;
 begin insert into public.direct_messages(sender_id,recipient_id,body) values(b,a,'Impersonated B'); raise exception 'TEST: forged sender'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',json_build_object('sub',c,'role','authenticated')::text,true);
 if exists(select 1 from public.community_friendships where requester_id=a or recipient_id=a) then raise exception 'TEST: third party read relationship'; end if;
 if exists(select 1 from public.direct_messages where sender_id=a or recipient_id=a) then raise exception 'TEST: third party read messages'; end if;
 delete from public.community_friendships where requester_id=a; get diagnostics n=row_count; if n<>0 then raise exception 'TEST: third party deleted relationship'; end if;
 insert into public.community_friendships(requester_id,recipient_id) values(c,a);
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 delete from public.community_friendships where requester_id=c and recipient_id=a;
 get diagnostics n=row_count; if n<>1 then raise exception 'TEST: recipient cannot refuse'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 delete from public.community_friendships where requester_id=a and recipient_id=b;
 if (select count(*) from public.direct_messages where sender_id=a or recipient_id=a)<>2 then raise exception 'TEST: removal lost message history'; end if;
 begin insert into public.direct_messages(sender_id,recipient_id,body) values(b,a,'After removal'); raise exception 'TEST: removed friend sent message'; exception when insufficient_privilege then null; end;
 insert into public.community_friendships(requester_id,recipient_id) values(b,a);
 delete from public.community_friendships where requester_id=b and recipient_id=a;
 get diagnostics n=row_count; if n<>1 then raise exception 'TEST: sender cannot cancel request'; end if;
 insert into public.community_friendships(requester_id,recipient_id) values(b,a);
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 update public.community_friendships set status='accepted' where requester_id=b and recipient_id=a;
 insert into public.direct_messages(sender_id,recipient_id,body) values(a,b,'Reverse friendship works');
 execute 'reset role'; execute 'set local role anon'; perform set_config('request.jwt.claims','{}',true);
 begin perform 1 from public.community_friendships; raise exception 'TEST: anonymous read friendships'; exception when insufficient_privilege then null; end;
 execute 'reset role';
end $$;
rollback;
select 'Passed: request, accept, refuse, cancel, remove, reverse-pair uniqueness, DM restriction before acceptance and after removal, participant-only history, impersonation and anonymous access. Fixtures rolled back.' as verification;
