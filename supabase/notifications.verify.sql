-- Server event generation and RLS verification. All fixtures are rolled back.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('40000000-0000-4000-8000-000000000001','authenticated','authenticated','notification-a@example.invalid','{}','{}',now(),now()),
 ('40000000-0000-4000-8000-000000000002','authenticated','authenticated','notification-b@example.invalid','{}','{}',now(),now()),
 ('40000000-0000-4000-8000-000000000003','authenticated','authenticated','notification-c@example.invalid','{}','{}',now(),now());
insert into public.social_profiles(id,display_name) values
 ('40000000-0000-4000-8000-000000000001','Notification A'),
 ('40000000-0000-4000-8000-000000000002','Notification B'),
 ('40000000-0000-4000-8000-000000000003','Notification C') on conflict(id) do nothing;
do $$
declare a uuid:='40000000-0000-4000-8000-000000000001'; b uuid:='40000000-0000-4000-8000-000000000002'; c uuid:='40000000-0000-4000-8000-000000000003'; post uuid; message uuid; invitation uuid; room uuid; note uuid; n int;
begin
 execute 'set local role authenticated';
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 insert into public.social_follows(follower_id,following_id) values(b,a);
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 insert into public.community_friendships(requester_id,recipient_id) values(a,b);
 insert into public.social_posts(author_id,body) values(a,'Notification integration post') returning id into post;
 insert into public.social_posts(author_id,body,parent_id) values(a,'Reply should not notify followers',post);
 if exists(select 1 from public.site_notifications) then raise exception 'TEST: author received own publication alert'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 if (select count(*) from public.site_notifications where post_id=post and kind='post')<>1 then raise exception 'TEST: follower not notified exactly once'; end if;
 if (select count(*) from public.site_notifications)<>1 then raise exception 'TEST: reply generated unexpected alert'; end if;
 update public.community_friendships set status='accepted' where requester_id=a and recipient_id=b;
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 insert into public.direct_messages(sender_id,recipient_id,body) values(a,b,'Private message integration') returning id into message;
 room:=(public.gaming_action(null,'create','{"game":"rabisco"}')->>'id')::uuid;
 insert into public.gaming_invitations(room_id,sender_id,recipient_id) values(room,a,b) returning id into invitation;
 begin insert into public.gaming_invitations(room_id,sender_id,recipient_id) values(room,a,b); raise exception 'TEST: duplicate invite allowed'; exception when unique_violation then null; end;
 begin insert into public.gaming_invitations(room_id,sender_id,recipient_id) values(room,a,c); raise exception 'TEST: nonfriend invited'; exception when insufficient_privilege then null; end;
 begin insert into public.site_notifications(user_id,actor_name,kind,message_id) values(b,'Spoofed','message',message); raise exception 'TEST: forged notification'; exception when insufficient_privilege then null; end;
 update public.site_notifications set read_at=now() where user_id=b; get diagnostics n=row_count;
 if n<>0 then raise exception 'TEST: actor marked recipient notifications read'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 if (select count(*) from public.site_notifications where read_at is null)<>3 then raise exception 'TEST: expected three unread event alerts'; end if;
 if not exists(select 1 from public.site_notifications where invitation_id=invitation and room_id=room and game='rabisco' and actor_id=a) then raise exception 'TEST: incorrect game invite target'; end if;
 begin insert into public.gaming_invitations(room_id,sender_id,recipient_id) values(room,b,a); raise exception 'TEST: nonmember invited from a room'; exception when insufficient_privilege then null; end;
 update public.direct_messages set read_at=now() where id=message;
 if not exists(select 1 from public.site_notifications where message_id=message and read_at is not null) then raise exception 'TEST: reading DM did not clear alert'; end if;
 select id into note from public.site_notifications where post_id=post;
 update public.site_notifications set read_at=now() where id=note;
 if (select count(*) from public.site_notifications where read_at is null)<>1 then raise exception 'TEST: marking notification read failed'; end if;
 begin update public.site_notifications set user_id=a where id=note; raise exception 'TEST: reassigned notification recipient'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',json_build_object('sub',c,'role','authenticated')::text,true);
 if exists(select 1 from public.site_notifications) then raise exception 'TEST: nonfollower or stranger read alerts'; end if;
 if exists(select 1 from public.gaming_invitations where id=invitation) then raise exception 'TEST: stranger read invite'; end if;
 update public.site_notifications set read_at=now() where id=note; get diagnostics n=row_count;
 if n<>0 then raise exception 'TEST: third party marked alert read'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 delete from public.social_posts where id=post;
 delete from public.direct_messages where id=message;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.site_notifications where post_id=post or message_id=message) then raise exception 'TEST: deleted source retained alert'; end if;
 if (select count(*) from public.site_notifications where invitation_id=invitation)<>1 then raise exception 'TEST: unrelated invite alert lost'; end if;
 update public.site_notifications set read_at=now() where read_at is null;
 if exists(select 1 from public.site_notifications where read_at is null) then raise exception 'TEST: mark all read failed'; end if;
 execute 'reset role'; execute 'set local role anon'; perform set_config('request.jwt.claims','{}',true);
 begin perform 1 from public.site_notifications; raise exception 'TEST: anonymous read alerts'; exception when insufficient_privilege then null; end;
 execute 'reset role';
end $$;
rollback;
select 'Passed: DM, followed posts, private game invitations, unread persistence, read sync, mark all, duplicate and spoof protection, recipient-only RLS, no self or reply spam, deleted-source cleanup. Fixtures rolled back.' as verification;
