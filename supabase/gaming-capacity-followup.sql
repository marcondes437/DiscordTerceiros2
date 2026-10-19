-- Pending: automatic approval review was unavailable. Not applied to the connected database.
create index if not exists gaming_rooms_host_idx on public.gaming_rooms(host_id,updated_at desc);
create index if not exists gaming_members_user_idx on public.gaming_members(user_id);
create index if not exists social_posts_media_idx on public.social_posts(media_id) where media_id is not null;
create or replace function gaming_private.action(p_room uuid,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); r public.gaming_rooms; m public.gaming_members; s jsonb; body jsonb; snakes jsonb; snake jsonb;
 food jsonb; pos int; x int; y int; d text; n int; i int; points int; hit boolean; fruit boolean;
 nowms bigint := (extract(epoch from clock_timestamp())*1000)::bigint;
 drawer uuid; word text; roundno int; result jsonb; owner uuid; countmembers int;
 words text[] := array['escola','computador','gato','foguete','pizza','bicicleta','cachorro','chuva','praia','montanha','livro','robo','sorvete','casa','futebol','estrela','floresta','barco','cafe','teclado','elefante','castelo','guitarra','aviao'];
begin
 if uid is null then raise exception 'Entre na sua conta para jogar.'; end if;
 if p_action='equip' then
   if p_data->>'frame' not in ('none','first-room','artist','detective','serpent','collector') or p_data->>'title' not in ('none','first-room','artist','detective','serpent','collector') then raise exception 'Personalização inválida.'; end if;
   if exists(select 1 from jsonb_array_elements_text(jsonb_build_array(p_data->>'frame',p_data->>'title')) v where v<>'none' and not exists(select 1 from public.gaming_badges b where b.user_id=uid and b.badge=v)) then raise exception 'Conquiste a medalha para desbloquear este item.'; end if;
   insert into public.gaming_cosmetics(user_id,frame,title) values(uid,p_data->>'frame',p_data->>'title') on conflict(user_id) do update set frame=excluded.frame,title=excluded.title;
   return '{}';
 end if;
 if p_action='create' then
   if (select count(*) from public.gaming_rooms gr where host_id=uid and updated_at>now()-interval '90 seconds' and exists(select 1 from public.gaming_members gm where gm.room_id=gr.id and gm.seen_at>now()-interval '60 seconds'))>=5 then raise exception 'Você já tem cinco salas ativas. Entre em uma delas.'; end if;
   insert into public.gaming_rooms(game,host_id) values(p_data->>'game',uid) returning * into r;
   p_room:=r.id; p_action:='join';
 end if;
 select * into r from public.gaming_rooms where id=p_room for update;
 if not found then raise exception 'Sala não encontrada.'; end if;
 nowms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 if p_action='join' then
   if (select count(*) from public.gaming_members where room_id=p_room and seen_at>now()-interval '60 seconds')>=8 and not exists(select 1 from public.gaming_members where room_id=p_room and user_id=uid and seen_at>now()-interval '60 seconds') then raise exception 'Sala cheia (8 jogadores).'; end if;
   insert into public.gaming_members(room_id,user_id,name) values(p_room,uid,left(coalesce((select display_name from public.social_profiles where id=uid),'Jogador'),60)) on conflict(room_id,user_id) do update set seen_at=now();
   insert into public.gaming_badges(user_id,badge) values(uid,'first-room') on conflict do nothing;
 end if;
 select * into m from public.gaming_members where room_id=p_room and user_id=uid;
 if not found then raise exception 'Entre na sala pelo convite antes de jogar.'; end if;
 if p_action='leave' then
   delete from public.gaming_members where room_id=p_room and user_id=uid;
   return '{}';
 end if;
 update public.gaming_members set seen_at=now() where room_id=p_room and user_id=uid;
 select user_id into owner from public.gaming_members where room_id=p_room and seen_at>now()-interval '60 seconds' order by joined_at,user_id limit 1;
 if r.host_id is distinct from owner then r.host_id:=owner; end if;
 s:=r.state;
 if r.game='rabisco' and s->>'phase'='playing' and (s->>'endsAt')::bigint<=nowms then s:=jsonb_set(s,'{phase}','"finished"'); end if;
 select count(*) into countmembers from public.gaming_members where room_id=p_room and seen_at>now()-interval '60 seconds';
 if p_action='start' then
   if uid<>r.host_id then raise exception 'Somente o anfitrião inicia a rodada.'; end if;
   if s->>'phase'='playing' and (s->>'endsAt')::bigint>nowms then raise exception 'A rodada ainda está em andamento.'; end if;
   if r.game='rabisco' then
     if countmembers<2 then raise exception 'Convide pelo menos mais uma pessoa para desenhar e adivinhar.'; end if;
     roundno:=coalesce((s->>'round')::int,0)+1;
     select user_id into drawer from public.gaming_members where room_id=p_room and seen_at>now()-interval '60 seconds' order by joined_at,user_id offset ((roundno-1)%countmembers) limit 1;
     r.secret:=words[1+floor(random()*array_length(words,1))::int];
     update public.gaming_members set guesses=0,guess_at='epoch' where room_id=p_room;
     s:=jsonb_build_object('phase','playing','round',roundno,'drawer',drawer,'endsAt',nowms+60000,'strokes','[]'::jsonb,'letters',length(r.secret),'message','Nova rodada!');
   else
     update public.gaming_members set score=0,direction='right' where room_id=p_room;
     food:='[]';
     for i in 1..14 loop food:=food||jsonb_build_array(floor(random()*1040)::int); end loop;
     s:=jsonb_build_object('phase','playing','endsAt',nowms+90000,'tickAt',0,'snakes','{}'::jsonb,'food',food);
   end if;
 elsif p_action='draw' then
   if r.game<>'rabisco' or s->>'phase'<>'playing' or s->>'drawer'<>uid::text or (s->>'endsAt')::bigint<nowms then raise exception 'Não é sua vez de desenhar.'; end if;
   if jsonb_typeof(p_data->'points') is distinct from 'array' then raise exception 'Traço inválido.'; end if;
   if jsonb_array_length(p_data->'points') not between 1 and 100 or jsonb_array_length(s->'strokes')>=1200 then raise exception 'Traço inválido ou desenho cheio.'; end if;
   if p_data->>'color' is null or p_data->>'color' !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Cor inválida.'; end if;
   if exists(select 1 from jsonb_array_elements(p_data->'points') point where jsonb_typeof(point)<>'array' or jsonb_array_length(point)<>2 or (point->>0)::numeric not between 0 and 1 or (point->>1)::numeric not between 0 and 1) then raise exception 'Ponto inválido.'; end if;
   s:=jsonb_set(s,'{strokes}',(s->'strokes')||jsonb_build_array(jsonb_build_object('points',p_data->'points','color',p_data->>'color','width',greatest(1,least(18,coalesce((p_data->>'width')::int,4))))));
 elsif p_action='clear' then
   if s->>'drawer'<>uid::text then raise exception 'Somente quem desenha pode apagar.'; end if;
   s:=jsonb_set(s,'{strokes}','[]');
 elsif p_action='guess' then
   if r.game<>'rabisco' or s->>'phase'<>'playing' or s->>'drawer'=uid::text or (s->>'endsAt')::bigint<nowms then raise exception 'Aguarde sua vez de adivinhar.'; end if;
   roundno:=(s->>'round')::int;
   if m.guessed_round=roundno then raise exception 'Você já acertou nesta rodada!'; end if;
   if m.guesses>=8 then raise exception 'Você usou os oito palpites desta rodada.'; end if;
   if clock_timestamp()-m.guess_at < interval '750 milliseconds' then raise exception 'Espere um instante antes de outro palpite.'; end if;
   update public.gaming_members set guesses=guesses+1,guess_at=clock_timestamp() where room_id=p_room and user_id=uid;
   word:=left(trim(p_data->>'guess'),60);
   if translate(lower(word),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')=r.secret then
     update public.gaming_members set score=score+10,guessed_round=roundno where room_id=p_room and user_id=uid;
     update public.gaming_members set score=score+3 where room_id=p_room and user_id=(s->>'drawer')::uuid;
     insert into public.gaming_badges(user_id,badge) values(uid,'detective'),((s->>'drawer')::uuid,'artist') on conflict do nothing;
     s:=jsonb_set(s,'{message}',to_jsonb(m.name||' acertou a palavra!'));
   else s:=jsonb_set(s,'{message}',to_jsonb(m.name||': '||word)); end if;
 elsif p_action='direction' then
   if p_data->>'direction' not in ('up','down','left','right') then raise exception 'Direção inválida.'; end if;
   update public.gaming_members set direction=p_data->>'direction' where room_id=p_room and user_id=uid;
 elsif p_action='tick' and r.game='slithersenai' and uid=r.host_id and s->>'phase'='playing' then
   if (s->>'endsAt')::bigint<=nowms then s:=jsonb_set(s,'{phase}','"finished"');
   elsif nowms-coalesce((s->>'tickAt')::bigint,0)>=170 then
     snakes:=coalesce(s->'snakes','{}'); food:=s->'food'; i:=0;
     for m in select * from public.gaming_members where room_id=p_room and seen_at>now()-interval '60 seconds' order by joined_at,user_id loop
       snake:=snakes->m.user_id::text; body:=snake->'body'; d:=m.direction;
       if body is null or jsonb_array_length(body)=0 then
         pos:=((i*3+4)%24)*40+4; body:=jsonb_build_array(pos,pos-1,pos-2); d:='right';
       end if;
       if (snake->>'direction'='right' and d='left') or (snake->>'direction'='left' and d='right') or (snake->>'direction'='up' and d='down') or (snake->>'direction'='down' and d='up') then d:=snake->>'direction'; end if;
       pos:=(body->>0)::int; x:=pos%40; y:=pos/40;
       x:=x+case d when 'left' then -1 when 'right' then 1 else 0 end;
       y:=y+case d when 'up' then -1 when 'down' then 1 else 0 end;
       pos:=y*40+x;
       hit:=x<0 or x>=40 or y<0 or y>=26 or exists(select 1 from jsonb_each(snakes) e, jsonb_array_elements(e.value->'body') b where b=to_jsonb(pos));
       if hit then body:='[]';
       else
         fruit:=food @> jsonb_build_array(pos);
         body:=jsonb_build_array(pos)||body;
         if fruit then
           select coalesce(jsonb_agg(v),'[]') into food from jsonb_array_elements(food) v where v<>to_jsonb(pos);
           for n in 1..50 loop points:=floor(random()*1040)::int; exit when not food @> jsonb_build_array(points) and not exists(select 1 from jsonb_each(snakes) e,jsonb_array_elements(e.value->'body') b where b=to_jsonb(points)); end loop;
           food:=food||jsonb_build_array(points);
           update public.gaming_members set score=score+1 where room_id=p_room and user_id=m.user_id;
           if m.score+1>=5 then insert into public.gaming_badges(user_id,badge) values(m.user_id,'serpent') on conflict do nothing; end if;
         else body:=body-(jsonb_array_length(body)-1); end if;
       end if;
       snakes:=jsonb_set(snakes,array[m.user_id::text],jsonb_build_object('body',body,'direction',d)); i:=i+1;
     end loop;
     for word in select key from jsonb_each(snakes) where not exists(select 1 from public.gaming_members where room_id=p_room and user_id::text=key and seen_at>now()-interval '60 seconds') loop snakes:=snakes-word; end loop;
     s:=s||jsonb_build_object('snakes',snakes,'food',food,'tickAt',nowms);
   end if;
 elsif p_action not in ('join','view','ping','tick') then raise exception 'Ação inválida.';
 end if;
 update public.gaming_rooms set state=s,secret=r.secret,host_id=r.host_id,updated_at=now() where id=p_room returning * into r;
 select coalesce(jsonb_agg(to_jsonb(v) order by v.score desc),'[]') into result from public.gaming_members v where room_id=p_room and seen_at>now()-interval '60 seconds';
 return jsonb_build_object('id',r.id,'game',r.game,'host',r.host_id,'state',s,'members',result,'version',nowms,'word',case when s->>'drawer'=uid::text or s->>'phase'='finished' then r.secret else null end);
end $$;
revoke all on function gaming_private.action(uuid,text,jsonb) from public;
grant execute on function gaming_private.action(uuid,text,jsonb) to authenticated;
create or replace function public.gaming_action(p_room uuid,p_action text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select gaming_private.action(p_room,p_action,p_data); $$;
revoke all on function public.gaming_action(uuid,text,jsonb) from public;
grant execute on function public.gaming_action(uuid,text,jsonb) to authenticated;
