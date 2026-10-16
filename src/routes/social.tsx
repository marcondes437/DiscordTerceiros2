import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Heart, MessageCircle, Repeat2, Send, Trash2, Users, Search, ShieldAlert, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CommunityAuth } from '@/components/community-auth';
import { SocialSiteShell } from '@/components/social-site-shell';
import './social.css';

export const Route = createFileRoute('/social')({
  head: () => ({ meta: [{ title: 'Social | Terceiros' }, { name: 'description', content: 'Publicações, amigos e conversas da turma.' }] }),
  component: Social,
});

type Post = { id: string; author_id: string; body: string; created_at: string; parent_id: string | null; repost_of: string | null };
type Reaction = { post_id: string; user_id: string };
type Follow = { follower_id: string; following_id: string };
const db = supabase as any; // Tabelas adicionadas pela migration social.sql; tipos gerados existentes preservados.
const displayName = (u: User | null) => String(u?.user_metadata?.['display_name'] || u?.user_metadata?.['full_name'] || u?.email?.split('@')[0] || 'Visitante');
const short = (id: string) => id.slice(0, 8);

function Social() {
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<Reaction[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | 'seguindo' | 'meus'>('todos');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [p, l, f, profiles] = await Promise.all([
      db.from('social_posts').select('*').order('created_at', { ascending: false }).limit(200),
      db.from('social_likes').select('post_id,user_id'),
      db.from('social_follows').select('follower_id,following_id'),
      db.from('social_profiles').select('id,display_name'),
    ]);
    if (p.error || l.error || f.error || profiles.error) {
      setError('Não foi possível carregar o Social. Execute o arquivo supabase/social.sql no SQL Editor do seu projeto Supabase.');
    } else {
      setError('');
      setPosts(p.data || []); setLikes(l.data || []); setFollows(f.data || []);
      setNames(Object.fromEntries((profiles.data || []).map((x: { id: string; display_name: string }) => [x.id, x.display_name])));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!user) return;
    void db.from('social_profiles').upsert({ id: user.id, display_name: displayName(user).slice(0, 60) }, { onConflict: 'id' }).then(() => refresh());
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function publish() {
    if (!user) { setAuthOpen(true); return; }
    const body = draft.trim();
    if (!body || body.length > 500) return;
    setBusy(true);
    const { error: err } = await db.from('social_posts').insert({ author_id: user.id, body, parent_id: replyTo });
    setBusy(false);
    if (err) toast.error(err.message);
    else { setDraft(''); setReplyTo(null); toast.success('Publicado!'); await refresh(); }
  }
  async function toggleLike(post: Post) {
    if (!user) { setAuthOpen(true); return; }
    const liked = likes.some(x => x.post_id === post.id && x.user_id === user.id);
    const res = liked ? await db.from('social_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      : await db.from('social_likes').insert({ post_id: post.id, user_id: user.id });
    if (res.error) toast.error(res.error.message); else void refresh();
  }
  async function toggleFollow(id: string) {
    if (!user) { setAuthOpen(true); return; }
    const following = follows.some(x => x.follower_id === user.id && x.following_id === id);
    const res = following ? await db.from('social_follows').delete().eq('follower_id', user.id).eq('following_id', id)
      : await db.from('social_follows').insert({ follower_id: user.id, following_id: id });
    if (res.error) toast.error(res.error.message); else void refresh();
  }
  async function repost(post: Post) {
    if (!user) { setAuthOpen(true); return; }
    const res = await db.from('social_posts').insert({ author_id: user.id, body: post.body, repost_of: post.id });
    if (res.error) toast.error(res.error.message); else { toast.success('Repostado!'); void refresh(); }
  }
  async function remove(post: Post) {
    if (!user || post.author_id !== user.id || !window.confirm('Excluir esta publicação?')) return;
    const res = await db.from('social_posts').delete().eq('id', post.id);
    if (res.error) toast.error(res.error.message); else void refresh();
  }
  async function report(post: Post) {
    if (!user) { setAuthOpen(true); return; }
    const reason = window.prompt('Por que deseja denunciar esta publicação? (mínimo 5 caracteres)');
    if (!reason || reason.trim().length < 5) return;
    const res = await db.from('social_reports').insert({ reporter_id: user.id, post_id: post.id, reason: reason.trim().slice(0, 500) });
    if (res.error) toast.error(res.error.message); else toast.success('Denúncia enviada para análise.');
  }
  const visible = posts.filter(p => !p.parent_id && (filter !== 'meus' || p.author_id === user?.id) && (filter !== 'seguindo' || p.author_id === user?.id || follows.some(f => f.follower_id === user?.id && f.following_id === p.author_id)) && (`${p.body} ${names[p.author_id] || ''}`).toLowerCase().includes(query.toLowerCase()));
  const tagCounts = new Map<string, number>();
  posts.filter(p => !p.parent_id && !p.repost_of).forEach(post => {
    new Set(post.body.toLowerCase().match(/#[\p{L}\p{N}_]+/gu) ?? []).forEach(tag => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1));
  });
  const trends = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const author = (id: string) => id === user?.id ? displayName(user) : names[id] || `Aluno ${short(id)}`;
  return (
    <SocialSiteShell user={user} name={displayName(user)} onSignIn={() => setAuthOpen(true)}>
    <div className="social-page">
      <div className="social-app">

      <div className="social-layout">

        <main className="social-main">

          <div className="social-tabs">{(['todos','seguindo','meus'] as const).map(x => <button key={x} className={filter === x ? 'active' : ''} onClick={() => setFilter(x)}>{x === 'todos' ? 'Para você' : x === 'seguindo' ? 'Seguindo' : 'Minhas publicações'}</button>)}</div>
          <section className="social-compose"><div className="social-avatar">{displayName(user).slice(0, 1).toUpperCase()}</div><div className="social-compose-body">{replyTo && <div className="social-reply-label">Respondendo uma publicação <button onClick={() => setReplyTo(null)}>Cancelar</button></div>}<textarea maxLength={500} value={draft} onChange={e => setDraft(e.target.value)} placeholder={user ? 'O que está acontecendo?' : 'Entre na sua conta para publicar...'} aria-label="Nova publicação" /><div className="social-compose-footer"><span>{draft.length}/500 caracteres</span><button disabled={busy || !draft.trim()} onClick={() => void publish()}><Send size={16} /> Publicar</button></div></div></section>
          {error && <div className="social-error">{error}</div>}
          {loading && <p className="social-status">Carregando publicações...</p>}
          {!loading && !error && visible.length === 0 && <p className="social-status">Ainda não há publicações por aqui. Que tal começar?</p>}
          {!error && visible.map(post => <article className="social-post" key={post.id}><div className="social-avatar">{author(post.author_id).slice(0,1).toUpperCase()}</div><div className="social-post-body"><div className="social-post-top"><strong>{author(post.author_id)}</strong><span>@{short(post.author_id)} · {new Date(post.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div>{post.repost_of && <span className="social-repost-label"><Repeat2 size={13} /> Repost</span>}<p className="social-post-text">{post.body}</p><div className="social-actions"><button onClick={() => { setReplyTo(post.id); document.querySelector('.social-compose')?.scrollIntoView({ behavior: 'smooth' }); }} title="Responder"><MessageCircle size={17}/>{posts.filter(p => p.parent_id === post.id).length}</button><button onClick={() => void repost(post)} title="Repostar"><Repeat2 size={17}/>{posts.filter(p => p.repost_of === post.id).length}</button><button className={likes.some(x => x.post_id === post.id && x.user_id === user?.id) ? 'liked' : ''} onClick={() => void toggleLike(post)} title="Curtir"><Heart size={17}/>{likes.filter(x => x.post_id === post.id).length}</button>{user && user.id !== post.author_id && <button onClick={() => void toggleFollow(post.author_id)} title={follows.some(f => f.follower_id === user.id && f.following_id === post.author_id) ? 'Deixar de seguir' : 'Seguir'}>{follows.some(f => f.follower_id === user.id && f.following_id === post.author_id) ? <UserMinus size={17}/> : <UserPlus size={17}/>}</button>}{user?.id === post.author_id ? <button onClick={() => void remove(post)} title="Excluir"><Trash2 size={17}/></button> : <button onClick={() => void report(post)} title="Denunciar"><ShieldAlert size={17}/></button>}</div>{posts.filter(p => p.parent_id === post.id).slice(0, 5).map(reply => <div className="social-reply" key={reply.id}><b>{author(reply.author_id)}</b> {reply.body}</div>)}</div></article>)}
        </main>
        <aside className="social-right"><label className="social-search"><Search size={16}/><input aria-label="Buscar no Social" placeholder="Explorar" value={query} onChange={e => setQuery(e.target.value)}/></label>
          <section className="social-info social-trends"><h3>Em alta na turma <span>#</span></h3>{trends.length ? trends.map(([tag, count]) => <button className="social-trend" key={tag} onClick={() => setQuery(tag)}><small>NA COMUNIDADE</small><strong>{tag}</strong><span>{count} {count === 1 ? 'publicação' : 'publicações'}</span></button>) : <div className="social-trends-empty"><span>#</span><strong>A conversa começa com você.</strong><p>Use hashtags nas publicações. Os assuntos mais comentados aparecem aqui.</p></div>}<button className="social-profile-link" onClick={() => { setQuery(''); setFilter('todos'); }}>Explorar publicações</button></section>
<section className="social-info"><h3>Conecte-se com a turma</h3>{Object.entries(names).filter(([id]) => id !== user?.id && !follows.some(f => f.follower_id === user?.id && f.following_id === id)).slice(0, 4).map(([id, name]) => <div className="social-person" key={id}><div className="social-avatar">{name.slice(0, 1).toUpperCase()}</div><span>{name}</span><button onClick={() => void toggleFollow(id)}>Seguir</button></div>)}<p>Encontre seus colegas e acompanhe as novidades na aba Seguindo.</p></section>
          <footer className="social-footer">SENAI Conecta · Comunidade independente<br />Terceiro A e Terceiro B.</footer>
        </aside>
      </div>
      </div>
      <CommunityAuth open={authOpen} onOpenChange={setAuthOpen} />
    </div>
    </SocialSiteShell>
  );
}

