import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import { Compass, House, LogIn, LogOut, Menu, MessageSquare, Swords, Volume2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { CommunityAuth } from '@/components/community-auth';
import { BrandLogo } from '@/components/brand-logo';
import { initials } from '@/components/voice-room';
import { Rivalry } from '@/components/landing/rivalry';
import bannerImage from '@/assets/community-lab.jpg';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'SENAI Conecta | Nosso último ano. Nosso espaço.' },
      { name: 'description', content: 'Jogos, comunidade e momentos que ficam. O espaço do Terceiro A e do Terceiro B.' },
      { property: 'og:title', content: 'SENAI Conecta' },
      { property: 'og:description', content: 'Nosso último ano. Nosso espaço.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Landing,
});

type Message = Database['public']['Tables']['community_messages']['Row'];
type OnlineMember = { id: string; name: string; room: string | null };

const previewChannels = [
  { id: 'geral', name: 'geral' },
  { id: 'avisos', name: 'avisos' },
  { id: 'projetos', name: 'mostre-seu-projeto' },
];
const rooms = [
  { id: 'conexao-livre', name: 'Conexão livre', about: 'Para chegar e conversar' },
  { id: 'grupo-de-estudos', name: 'Grupo de estudos', about: 'Revisar, tirar dúvida, estudar junto' },
  { id: 'laboratorio-de-ideias', name: 'Laboratório de ideias', about: 'Projetos e tela compartilhada' },
];
const roomName = (id: string | null) => rooms.find((r) => r.id === id)?.name ?? '';
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Revela [data-reveal] ao entrar na tela e aplica parallax em [data-parallax]. */
function useScrollEffects(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = el.querySelectorAll<HTMLElement>('[data-reveal]');
    const scroller = el.querySelector<HTMLElement>('[data-scroller]');
    if (reduced) {
      targets.forEach((t) => t.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }),
      { root: scroller, rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    targets.forEach((t) => io.observe(t));

    const layers = el.querySelectorAll<HTMLElement>('[data-parallax]');
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = scroller ? scroller.scrollTop : window.scrollY;
        layers.forEach((l) => {
          const k = Number(l.dataset['parallax'] || 0.1);
          l.style.transform = `translate3d(0, ${y * k}px, 0) scale(1.08)`;
        });
      });
    };
    onScroll();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      target.removeEventListener('scroll', onScroll);
    };
  }, [root]);
}

function Landing() {
  const shell = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [online, setOnline] = useState<OnlineMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState('geral');
  useScrollEffects(shell);

  const name = String(user?.user_metadata?.['display_name'] || user?.user_metadata?.['full_name'] || user?.email?.split('@')[0] || 'Visitante');

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // Quem está online (mesma presença usada pela comunidade)
  useEffect(() => {
    if (!user) {
      setOnline([]);
      return;
    }
    const ch = supabase.channel('senai-voice:online', { config: { private: true, presence: { key: user.id } } });
    ch.on('presence', { event: 'sync' }, () => {
      const byId = new Map<string, OnlineMember>();
      for (const metas of Object.values(ch.presenceState<OnlineMember>())) {
        for (const m of metas) {
          if (!m?.id) continue;
          const prev = byId.get(m.id);
          byId.set(m.id, { id: m.id, name: m.name, room: m.room ?? prev?.room ?? null });
        }
      }
      setOnline([...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') void ch.track({ id: user.id, name, room: null });
    });
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user?.id, name]);

  // Últimas mensagens do canal escolhido na prévia
  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }
    let live = true;
    void supabase
      .from('community_messages')
      .select('*')
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }: { data: Message[] | null }) => {
        if (live) setMessages((data ?? []).reverse());
      });
    return () => {
      live = false;
    };
  }, [user?.id, channel]);

  const inRoom = (id: string) => online.filter((m) => m.room === id);
  const closeMenu = () => setMenu(false);

  return (
    <div className="glass-page">
      <div className="window glass landing-window" ref={shell}>
        <header className="win-header">
          <button type="button" className="win-menu" aria-label="Abrir menu" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <Link to="/" className="win-logo" aria-label="SENAI Conecta, início">
            <BrandLogo />
          </Link>
          <div className="win-header-end">
            {user ? (
              <div className="user-chip">
                <span className="user-avatar">
                  {initials(name)}
                  <span className="dot-online" />
                </span>
                <span className="user-meta">
                  <strong className="truncate">{name}</strong>
                  <small>Online</small>
                </span>
                <button type="button" className="icon-btn" title="Sair da conta" onClick={() => void supabase.auth.signOut()}>
                  <LogOut />
                </button>
              </div>
            ) : (
              <button type="button" className="btn-red btn-sm" onClick={() => setAuthOpen(true)}>
                <LogIn />
                Entrar
              </button>
            )}
          </div>
        </header>

        <div className="win-body">
          <aside className={`win-side ${menu ? 'is-open' : ''}`} aria-label="Navegação">
            <button type="button" className="win-side-close icon-btn" aria-label="Fechar menu" onClick={closeMenu}>
              <X />
            </button>
            <nav className="side-nav">
              <Link to="/" className="side-link is-active" onClick={closeMenu}>
                <House />
                Início
              </Link>
              <Link to="/comunidade" className="side-link" onClick={closeMenu}>
                <MessageSquare />
                Comunidade
              </Link>
              <a href="#salas" className="side-link" onClick={closeMenu}>
                <Volume2 />
                Salas de voz
              </a>
              <a href="#rivalidade" className="side-link" onClick={closeMenu}>
                <Compass />
                Rivalidade
              </a>
            </nav>
            <div className="side-sep" />
            <p className="side-label">Suas turmas</p>
            <a href="#rivalidade" className="side-class" onClick={closeMenu}>
              <span className="class-dot is-a" />
              Terceiro A
            </a>
            <a href="#rivalidade" className="side-class" onClick={closeMenu}>
              <span className="class-dot is-b" />
              Terceiro B
            </a>
            <p className="side-foot">Comunidade independente, sem vínculo oficial com o SENAI.</p>
          </aside>
          {menu && <div className="win-scrim" onClick={closeMenu} />}

          <main className="win-main" data-scroller>
            {/* Banner */}
            <section className="banner" data-reveal>
              <div className="banner-media" aria-hidden>
                <img src={bannerImage} alt="" data-parallax="0.08" />
              </div>
              <div className="banner-copy">
                <span className="pill">
                  <Swords />
                  Terceiro A × Terceiro B
                </span>
                <h1 className="banner-title">
                  <span className="line">Nosso último ano.</span>
                  <span className="line is-red">
                    Nosso espaço<span className="dot-white">.</span>
                  </span>
                </h1>
                <p className="banner-sub">Jogos, comunidade e momentos que ficam.</p>
                <div className="banner-actions">
                  <Link to="/comunidade" className="btn-red">
                    Entrar na comunidade
                  </Link>
                  <a href="#rivalidade" className="btn-glass">
                    <Swords />
                    Ver a rivalidade
                  </a>
                </div>
              </div>
              <div className="banner-aside">
                <div className="mini-card glass-card">
                  {online.length ? (
                    <>
                      <div className="avatar-row">
                        {online.slice(0, 4).map((m) => (
                          <span key={m.id} className="row-avatar">
                            {initials(m.name)}
                          </span>
                        ))}
                        {online.length > 4 && <span className="row-avatar is-more">+{online.length - 4}</span>}
                      </div>
                      <p>{online.length === 1 ? '1 aluno online agora' : `${online.length} alunos online agora`}</p>
                    </>
                  ) : (
                    <p>{user ? 'Só você por aqui agora' : 'Entre para ver quem está online'}</p>
                  )}
                </div>
                <blockquote className="mini-card glass-card quote">“Duas turmas. Uma só conexão.”</blockquote>
              </div>
            </section>

            <div className="dash-grid">
              {/* Prévia da comunidade */}
              <section className="panel" data-reveal style={{ ['--d' as string]: '80ms' }}>
                <header className="panel-head">
                  <h2>
                    <MessageSquare />
                    Comunidade
                  </h2>
                  <Link to="/comunidade" className="btn-red btn-sm">
                    Entrar na comunidade
                  </Link>
                </header>
                <div className="community-preview glass-card">
                  <ul className="preview-channels">
                    {previewChannels.map((c) => (
                      <li key={c.id}>
                        <button type="button" className={channel === c.id ? 'is-active' : ''} onClick={() => setChannel(c.id)}>
                          <span className="hash">#</span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="preview-messages">
                    {!user ? (
                      <div className="preview-empty">
                        <p>Entre para ler a conversa da turma.</p>
                        <button type="button" className="btn-glass btn-sm" onClick={() => setAuthOpen(true)}>
                          <LogIn />
                          Entrar
                        </button>
                      </div>
                    ) : messages.length ? (
                      messages.map((m) => (
                        <div className="preview-msg" key={m.id}>
                          <span className="row-avatar">{initials(m.display_name)}</span>
                          <div className="min-w-0">
                            <div className="preview-msg-head">
                              <strong>{m.display_name}</strong>
                              <time>{timeLabel(m.created_at)}</time>
                            </div>
                            <p className="truncate">{m.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="preview-empty">
                        <p>Ninguém escreveu em #{previewChannels.find((c) => c.id === channel)?.name} ainda.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Online agora */}
              <section className="panel" data-reveal style={{ ['--d' as string]: '160ms' }}>
                <header className="panel-head">
                  <h2>
                    <span className="dot-online is-inline" />
                    Online agora
                  </h2>
                  <Link to="/comunidade" className="panel-link">
                    Ver todos
                  </Link>
                </header>
                <ul className="online-list glass-card">
                  {online.slice(0, 5).map((m) => (
                    <li key={m.id}>
                      <span className="row-avatar">
                        {initials(m.name)}
                        <span className="dot-online" />
                      </span>
                      <div className="min-w-0">
                        <strong className="truncate">
                          {m.name}
                          {m.id === user?.id ? ' (você)' : ''}
                        </strong>
                        <small>{m.room ? `Em ${roomName(m.room)}` : 'Online'}</small>
                      </div>
                    </li>
                  ))}
                  {!online.length && <li className="online-empty">{user ? 'Só você por enquanto.' : 'Entre para ver quem está online.'}</li>}
                </ul>
              </section>
            </div>

            {/* Salas de voz */}
            <section className="rooms" id="salas">
              <header className="panel-head" data-reveal>
                <h2>
                  <Volume2 />
                  Salas de voz
                </h2>
              </header>
              <div className="room-cards">
                {rooms.map((r, i) => {
                  const people = inRoom(r.id);
                  return (
                    <Link to="/comunidade" className="room-card glass-card" key={r.id} data-reveal style={{ ['--d' as string]: `${i * 90}ms` }}>
                      <div className="room-card-top">
                        <span className="room-icon">
                          <Volume2 />
                        </span>
                        <span className={`room-state ${people.length ? 'is-live' : ''}`}>{people.length ? `${people.length} na sala` : 'Vazia'}</span>
                      </div>
                      <h3>{r.name}</h3>
                      <p>{r.about}</p>
                      <div className="room-card-foot">
                        <div className="avatar-row is-small">
                          {people.slice(0, 4).map((m) => (
                            <span key={m.id} className="row-avatar">
                              {initials(m.name)}
                            </span>
                          ))}
                        </div>
                        <span className="room-go">Entrar</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <Rivalry />

            <footer className="win-foot">
              <span>
                <strong>SENAI Conecta</strong>, feito pelo Terceiro A e pelo Terceiro B.
              </span>
              <span>Comunidade independente, sem vínculo oficial com o SENAI.</span>
            </footer>
          </main>
        </div>
      </div>
      <CommunityAuth open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
