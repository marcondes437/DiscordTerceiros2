begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('50000000-0000-4000-8000-000000000001','authenticated','authenticated','social-test-a@example.invalid','{}','{}',now(),now()),
('50000000-0000-4000-8000-000000000002','authenticated','authenticated','social-test-b@example.invalid','{}','{}',now(),now()),
('50000000-0000-4000-8000-000000000003','authenticated','authenticated','social-test-c@example.invalid','{}','{}',now(),now());
insert into public.social_profiles(id,display_name) values
('50000000-0000-4000-8000-000000000001','Social test Ana'),
('50000000-0000-4000-8000-000000000002','Social test Bia'),
('50000000-0000-4000-8000-000000000003','Social test Caio');
do $$
declare a uuid:='50000000-0000-4000-8000-000000000001'; b uuid:='50000000-0000-4000-8000-000000000002'; c uuid:='50000000-0000-4000-8000-000000000003';
 root uuid; poll uuid; quote uuid; reply uuid; bpost uuid; legacy uuid; result jsonb; n int;
begin
 execute 'set local role authenticated';
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 select id into root from public.social_publish(array['Social integration #senai']);
 select id into reply from public.social_publish(array['A reply','A connected part'],root) limit 1;
 if not exists(select 1 from public.social_posts where parent_id=reply and body='A connected part') then raise exception 'TEST: thread not connected'; end if;
 begin perform public.social_publish(array['Atomic first','']); raise exception 'TEST: invalid thread accepted'; exception when check_violation then null; end;
 if exists(select 1 from public.social_posts where author_id=a and body='Atomic first') then raise exception 'TEST: partial thread committed'; end if;
 update public.social_posts set body='Edited #senai' where id=root;
 if not exists(select 1 from public.social_posts where id=root and edited_at is not null) then raise exception 'TEST: edit not persisted'; end if;
 begin update public.social_posts set author_id=b where id=root; raise exception 'TEST: author changed'; exception when insufficient_privilege then null; end;
 select id into poll from public.social_publish(array['Which game?'],null,null,array['Rabisco','Slither'],5);
 begin update public.social_posts set body='Different question' where id=poll; raise exception 'TEST: poll changed'; exception when raise_exception then if sqlerrm<>'Poll questions cannot be edited' then raise; end if; end;
 select id into quote from public.social_publish(array['My comment'],null,root);
 if not exists(select 1 from public.social_posts where id=quote and quote_of=root and is_quote) then raise exception 'TEST: quote lost original'; end if;
 insert into public.social_bookmarks(user_id,post_id) values(a,root),(a,reply);
 if (select count(*) from public.social_feed('salvos'))<>2 then raise exception 'TEST: saved posts and replies missing'; end if;
 perform public.social_pin(root);
 select x into result from public.social_feed('todos','',a) x limit 1;
 if (result->>'id')::uuid<>root then raise exception 'TEST: profile pin not first'; end if;
 insert into public.social_reposts(post_id,user_id) values(root,a);
 begin insert into public.social_reposts(post_id,user_id) values(root,a); raise exception 'TEST: duplicate repost accepted'; exception when unique_violation then null; end;
 delete from public.social_reposts where post_id=root and user_id=a;
 if exists(select 1 from public.social_reposts where post_id=root and user_id=a) then raise exception 'TEST: repost undo failed'; end if;
 perform public.social_vote(poll,0);
 begin perform public.social_vote(poll,1); raise exception 'TEST: multiple votes'; exception when unique_violation then null; end;
 select public.social_poll_results(poll) into result;
 if result->>'choice'<>'0' or result->>'total'<>'1' then raise exception 'TEST: own vote missing'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.social_bookmarks where user_id=a) then raise exception 'TEST: private bookmark leaked'; end if;
 begin insert into public.social_bookmarks(user_id,post_id) values(a,poll); raise exception 'TEST: spoofed bookmark'; exception when insufficient_privilege then null; end;
 update public.social_posts set body='Not mine' where id=root;get diagnostics n=row_count;
 if n<>0 then raise exception 'TEST: editing another author'; end if;
 begin perform public.social_pin(root); raise exception 'TEST: pinned another authors post'; exception when insufficient_privilege then null; end;
 begin perform 1 from social_private.poll_votes; raise exception 'TEST: private votes readable'; exception when insufficient_privilege then null; end;
 select public.social_poll_results(poll) into result;
 if result->'choice'<>'null'::jsonb or result->'counts'<>'[0,0]'::jsonb then raise exception 'TEST: votes exposed before voting'; end if;
 perform public.social_vote(poll,1);
 select id into bpost from public.social_publish(array['Bia post #senai']);
 insert into public.social_reposts(post_id,user_id) values(root,b);
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 insert into public.social_follows(follower_id,following_id) values(a,b);
 if not exists(select 1 from public.social_feed('seguindo') x where (x->>'id')::uuid=bpost) then raise exception 'TEST: following feed missing posts'; end if;
 insert into public.social_mutes(user_id,muted_id) values(a,b);
 if exists(select 1 from public.social_feed('todos') x where (x->>'author_id')::uuid=b or (x->>'repost_actor')::uuid=b) then raise exception 'TEST: muted person still appears'; end if;
 delete from public.social_mutes where user_id=a and muted_id=b;
 if not exists(select 1 from public.social_feed('todos','Bia') x where (x->>'id')::uuid=bpost) then raise exception 'TEST: name search failed'; end if;
 if not exists(select 1 from public.social_feed('todos','#senai') x where (x->>'id')::uuid=root) then raise exception 'TEST: hashtag search failed'; end if;
 insert into public.social_posts(author_id,body,repost_of) values(a,'Legacy copied body',root) returning id into legacy;
 delete from public.social_posts where id=root;
 if exists(select 1 from public.social_reposts where post_id=root) then raise exception 'TEST: orphan repost'; end if;
 if exists(select 1 from public.social_feed('todos','Legacy copied body')) then raise exception 'TEST: deleted original survives in legacy repost'; end if;
 select x into result from public.social_post_details(array[quote]) x;
 if result->'quoted'<>'null'::jsonb or result->>'is_quote'<>'true' then raise exception 'TEST: missing quote fallback broken'; end if;
 execute 'reset role';
 update public.social_posts set poll_closes_at=now()-interval '1 second' where id=poll;
 execute 'set local role authenticated';
 perform set_config('request.jwt.claims',json_build_object('sub',c,'role','authenticated')::text,true);
 begin perform public.social_vote(poll,0); raise exception 'TEST: voted after close'; exception when raise_exception then if sqlerrm<>'Poll closed or invalid choice' then raise; end if; end;
 select public.social_poll_results(poll) into result;
 if result->'counts'<>'[1,1]'::jsonb or result->'choice'<>'null'::jsonb then raise exception 'TEST: final aggregate results wrong'; end if;
 execute 'reset role';
end $$;
rollback;
select 'Passed: atomic threads, quotes, private bookmarks, own-only edits/pins, undoable unique reposts, private single votes, closing time enforced, following/mute/search feeds, deletion and legacy fallbacks. Fixtures rolled back.' as verification;
