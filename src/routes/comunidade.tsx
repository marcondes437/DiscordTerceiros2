import { Link, createFileRoute } from '@tanstack/react-router';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import {
  Check,
  ChevronDown,
  Code2,
  Hash,
  Headphones,
  HeadphoneOff,
  House,
  Info,
  LogIn,
  LogOut,
  Menu,
  Mic,
  MicOff,
  MonitorUp,
  Palette,
  PhoneOff,
  Search,
  SendHorizontal,
  Trash2,
  UserPlus,
  Users,
  Volume2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CommunityAuth } from '@/components/community-auth';
import { VoiceRoom, initials } from '@/components/voice-room';
import { BrandLogo } from '@/components/brand-logo';
import { useCommunityCall } from '@/hooks/use-community-call';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { memberClass, visibleSpaces, spaceChannel, visibleRoom, type Space } from '@/lib/community-spaces';
import labImage from '@/assets/community-lab.jpg';

export const Route = createFileRoute('/comunidade')({
  head: () => ({
    meta: [
      { title: 'Comunidade | SENAI Conecta' },
      { name: 'description', content: 'Seu ponto de encontro em Sorocaba. Converse com sua turma, compartilhe projetos e participe de salas de voz.' },
      { property: 'og:title', content: 'SENAI Conecta | Comunidade Sorocaba' },
      { property: 'og:description', content: 'Aprender juntos. Criar conexões. A comunidade independente de Sorocaba.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Community,
});

type Message = Database['public']['Tables']['community_messages']['Row'];
type OnlineMember = { id: string; name: string; room: string | null };
type Panel = 'invite' | 'explore' | 'members' | 'about' | null;

const generalGroups: { label: string; channels: { id: string; name: string; about: string }[] }[] = [
  {
    label: 'Comunidade',
    channels: [
      { id: 'geral', name: 'geral', about: 'Conversa livre da comunidade' },
      { id: 'apresentacoes', name: 'apresentações', about: 'Conte quem você é e o que estuda' },
      { id: 'avisos', name: 'avisos', about: 'Datas, eventos e recados importantes' },
      { id: 'projetos', name: 'mostre-seu-projeto', about: 'Compartilhe o que você está construindo' },
    ],
  },
  {
    label: 'Áreas',
    channels: [
      { id: 'programacao', name: 'programação', about: 'Código, dúvidas e ferramentas' },
      { id: 'mecanica', name: 'mecânica', about: 'Usinagem, manutenção e projetos mecânicos' },
      { id: 'eletrica', name: 'elétrica', about: 'Instalações, comandos e eletrônica' },
      { id: 'design', name: 'design', about: 'Interfaces, gráficos e produto' },
    ],
  },
];
const classGroups = [{ label: 'Sua turma · exclusivo', channels: [{ id: 'geral', name: 'bate-papo', about: 'Conversa exclusiva da sua turma' }, { id: 'avisos', name: 'avisos', about: 'Recados da sua turma' }, { id: 'estudos', name: 'estudos', about: 'Dúvidas e trabalhos da turma' }] }];

const baseRooms = [
  { id: 'conexao-livre', name: 'Conexão livre' },
  { id: 'grupo-de-estudos', name: 'Grupo de estudos' },
  { id: 'laboratorio-de-ideias', name: 'Laboratório de ideias' },
];
const roomName = (id: string | null) => baseRooms.find((r) => r.id === id?.split(':').at(-1))?.name ?? '';

function Avatar({ name, online = false, tone = 'brand' }: { name: string; online?: boolean; tone?: 'brand' | 'plain' }) {
  return (
    <div className={`avatar ${tone === 'plain' ? 'is-plain' : ''}`} aria-hidden>
      {initials(name)}
      {online && <span className="online-dot" />}
    </div>
  );
}

const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function Community() {
  const [space, setSpace] = useState<Space>('geral');
  const [active, setActive] = useState('geral');
  const [voiceView, setVoiceView] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [online, setOnline] = useState<OnlineMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(true);

  const call = useCommunityCall();
  const bottom = useRef<HTMLDivElement>(null);
  const onlineChannel = useRef<RealtimeChannel | null>(null);
  const liveRoom = call.room && !call.connecting ? call.room : null;
  const liveRoomRef = useRef<string | null>(null);

  const name = String(user?.user_metadata?.['display_name'] || user?.user_metadata?.['full_name'] || user?.email?.split('@')[0] || 'Visitante');
  const turma = memberClass(user?.app_metadata);
  const availableSpaces = visibleSpaces(turma);
  const groups = space === 'geral' ? generalGroups : classGroups;
  const allChannels = groups.flatMap((g) => g.channels);
  const messageChannel = spaceChannel(space, active);
  const rooms = baseRooms.map((r) => ({ ...r, id: spaceChannel(space, r.id) }));
  const spaceName = availableSpaces.find((s) => s.id === space)?.name ?? 'Geral';
  const selectedChannel = useRef(messageChannel);
  selectedChannel.current = messageChannel;
  const channel = allChannels.find((c) => c.id === active) ?? allChannels[0]!;

  // Sessão
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // Mensagens do canal
  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }
    let live = true;
    setMessages([]);
    setLoading(true);
    async function load() {
      const { data, error } = await supabase.from('community_messages').select('*').eq('channel', messageChannel).order('created_at', { ascending: false }).limit(100);
      if (!live) return;
      if (error) toast.error('Não foi possível carregar as mensagens. Recarregue a página.');
      else setMessages((data ?? []).reverse());
      setLoading(false);
    }
    void load();
    const ch = supabase
      .channel(`community-chat:${messageChannel}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages', filter: `channel=eq.${messageChannel}` }, () => void load())
      .subscribe();
    return () => {
      live = false;
      void supabase.removeChannel(ch);
    };
  }, [messageChannel, user?.id]);

  // Quem está online (e em qual sala de voz)
  useEffect(() => {
    if (!user) {
      setOnline([]);
      return;
    }
    const ch = supabase.channel(space === 'geral' ? 'senai-voice:online' : `senai-voice:${space}:online`, { config: { private: true, presence: { key: user.id } } });
    onlineChannel.current = ch;
    ch.on('presence', { event: 'sync' }, () => {
      const byId = new Map<string, OnlineMember>();
      for (const metas of Object.values(ch.presenceState<OnlineMember>())) {
        for (const m of metas) {
          if (!m?.id) continue;
          const prev = byId.get(m.id);
          byId.set(m.id, { id: m.id, name: m.name, room: visibleRoom(m.room ?? prev?.room ?? null, space) });
        }
      }
      setOnline([...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') void ch.track({ id: user.id, name, room: visibleRoom(liveRoomRef.current, space) });
    });
    return () => {
      onlineChannel.current = null;
      void supabase.removeChannel(ch);
    };
  }, [user?.id, name, space]);

  useEffect(() => {
    liveRoomRef.current = liveRoom;
    if (user) void onlineChannel.current?.track({ id: user.id, name, room: visibleRoom(liveRoom, space) });
  }, [liveRoom, space]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user && call.room) call.leave();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    const { data, error } = await supabase.from('community_messages').insert({ channel: messageChannel, user_id: user.id, display_name: name.slice(0, 60), content }).select().single();
    setSending(false);
    if (error) {
      toast.error('A mensagem não foi enviada. Tente de novo.');
      return;
    }
    if (data && selectedChannel.current === messageChannel) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    if (selectedChannel.current === messageChannel) setDraft('');
  }

  async function remove(id: string) {
    const { error } = await supabase.from('community_messages').delete().eq('id', id);
    if (error) toast.error('Não foi possível apagar a mensagem.');
    else setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  function selectSpace(next: Space) {
    if (!availableSpaces.some((s) => s.id === next) || next === space) return;
    call.leave();
    setOnline([]);
    setMessages([]);
    setDraft('');
    setSearch('');
    setVoiceView(null);
    setActive('geral');
    setSpace(next);
  }

  function selectChannel(id: string) {
    if (!allChannels.some((c) => c.id === id)) return;
    setMessages([]);
    setDraft('');
    setActive(id);
    setVoiceView(null);
    setDrawer(false);
    setSearch('');
  }
  function selectRoom(id: string) {
    if (!rooms.some((r) => r.id === id)) return;
    setVoiceView(id);
    setDrawer(false);
  }
  function joinRoom(id: string) {
    if (!rooms.some((r) => r.id === id)) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }
    void call.join(id, user.id, name);
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? messages.filter((m) => `${m.content} ${m.display_name}`.toLowerCase().includes(q)) : messages;
  }, [messages, search]);

  const peopleIn = (roomId: string) => {
    if (call.room === roomId && !call.connecting) return call.participants.map((p) => ({ id: p.peerId, name: p.name, speaking: call.speaking.has(p.peerId), muted: p.muted, deafened: p.deafened, sharing: p.sharing }));
    return online.filter((m) => m.room === roomId).map((m) => ({ id: m.id, name: m.name, speaking: false, muted: false, deafened: false, sharing: false }));
  };

  return (
    <div className={`community-app ${showMembers && !voiceView ? '' : 'no-members'}`}>
      {/* ───────── Barra lateral ───────── */}
      <aside className={`sidebar ${drawer ? 'is-open' : ''}`} aria-label="Canais">
        <div className="brand">
          <Link to="/" className="brand-home" aria-label="SENAI Conecta, página inicial">
            <BrandLogo />
          </Link>
          {drawer ? (
            <Button variant="ghost" size="icon" title="Fechar" onClick={() => setDrawer(false)}>
              <X />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Opções da comunidade">
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => setPanel('invite')}>
                  <UserPlus />
                  Convidar pessoas
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPanel('explore')}>
                  <Hash />
                  Explorar áreas
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <House />
                    Página inicial
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPanel('about')}>
                  <Info />
                  Sobre a comunidade
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <nav className="sidebar-scroll">
          <div className="community-spaces" aria-label="Espaços da comunidade">{availableSpaces.map((s) => <button key={s.id} type="button" aria-pressed={space === s.id} onClick={() => selectSpace(s.id)}><strong>{s.badge}</strong><span>{s.name}</span></button>)}</div>
          <div className="space-heading"><strong>{spaceName}</strong><small>{space === 'geral' ? 'Terceiro A + Terceiro B' : 'Somente membros da sua turma'}</small></div>
          {!turma && <p className="space-missing">Sua conta ainda não tem uma turma vinculada. O espaço Geral continua disponível.</p>}
          {groups.map((g) => (
            <section className="nav-group" key={g.label}>
              <h2 className="nav-label">{g.label}</h2>
              {g.channels.map((c) => (
                <button key={c.id} type="button" className={`nav-item ${active === c.id && !voiceView ? 'is-active' : ''}`} onClick={() => selectChannel(c.id)}>
                  <Hash />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </section>
          ))}

          <section className="nav-group">
            <h2 className="nav-label">Salas de voz</h2>
            {rooms.map((r) => {
              const people = peopleIn(r.id);
              return (
                <Fragment key={r.id}>
                  <button type="button" className={`nav-item ${voiceView === r.id ? 'is-active' : ''} ${call.room === r.id ? 'is-joined' : ''}`} onClick={() => selectRoom(r.id)}>
                    <Volume2 />
                    <span className="truncate">{r.name}</span>
                    {people.length > 0 && <span className="nav-count">{people.length}</span>}
                  </button>
                  {people.length > 0 && (
                    <ul className="room-people">
                      {people.map((p) => (
                        <li key={p.id} className={p.speaking ? 'is-speaking' : ''}>
                          <span className="mini-avatar">{initials(p.name)}</span>
                          <span className="truncate">{p.name}</span>
                          {p.sharing && <span className="mini-live">Ao vivo</span>}
                          {p.deafened ? <HeadphoneOff className="mini-icon" /> : p.muted ? <MicOff className="mini-icon" /> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </Fragment>
              );
            })}
          </section>
        </nav>

        {call.room && (
          <div className="voice-dock">
            <button type="button" className="dock-info" onClick={() => selectRoom(call.room!)}>
              <span className={`dock-state ${call.connecting ? 'is-connecting' : ''}`}>{call.connecting ? 'Conectando…' : 'Voz conectada'}</span>
              <span className="dock-room truncate">{roomName(call.room)}</span>
            </button>
            <div className="dock-actions">
              <Button variant="ghost" size="icon" title={call.muted ? 'Ligar microfone' : 'Desligar microfone'} className={call.muted ? 'is-off' : ''} onClick={() => void call.toggleMute()}>
                {call.muted ? <MicOff /> : <Mic />}
              </Button>
              <Button variant="ghost" size="icon" title={call.deafened ? 'Ligar áudio' : 'Desligar áudio'} className={call.deafened ? 'is-off' : ''} onClick={call.toggleDeafen}>
                {call.deafened ? <HeadphoneOff /> : <Headphones />}
              </Button>
              {call.canShare && (
                <Button variant="ghost" size="icon" title={call.screen ? 'Parar de compartilhar' : 'Compartilhar tela'} className={call.screen ? 'is-active' : ''} onClick={() => void call.toggleShare()}>
                  <MonitorUp />
                </Button>
              )}
              <Button variant="ghost" size="icon" title="Sair da chamada" className="is-leave" onClick={call.leave}>
                <PhoneOff />
              </Button>
            </div>
          </div>
        )}

        <div className="me">
          <Avatar name={name} online={!!user} />
          <div className="me-text">
            <div className="me-name truncate">{name}</div>
            <div className="me-status">{user ? 'Online' : 'Não conectado'}</div>
          </div>
          <Button variant="ghost" size="icon" title={user ? 'Sair da conta' : 'Entrar'} onClick={() => (user ? void supabase.auth.signOut() : setAuthOpen(true))}>
            {user ? <LogOut /> : <LogIn />}
          </Button>
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      {/* ───────── Conteúdo ───────── */}
      <main className={`main ${voiceView ? 'is-stage' : ''}`}>
        <header className="topbar">
          <Button variant="ghost" size="icon" className="menu-button" title="Abrir canais" onClick={() => setDrawer(true)}>
            <Menu />
          </Button>
          {voiceView ? <Volume2 className="topbar-icon" /> : <Hash className="topbar-icon" />}
          <h1 className="topbar-title">{voiceView ? roomName(voiceView) : channel.name}</h1>
          {!voiceView && <span className="topbar-about">{channel.about}</span>}
          <div className="topbar-tools">
            {!voiceView && (
              <label className="search">
                <Search />
                <Input aria-label="Buscar mensagens" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
            )}
            {!voiceView && (
              <Button variant="ghost" size="icon" className="members-toggle" title={showMembers ? 'Ocultar membros' : 'Mostrar membros'} aria-pressed={showMembers} onClick={() => setShowMembers(!showMembers)}>
                <Users />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="members-sheet" title="Membros" onClick={() => setPanel('members')}>
              <Users />
            </Button>
          </div>
        </header>

        {voiceView ? (
          <VoiceRoom
            roomId={voiceView}
            roomName={roomName(voiceView)}
            call={call}
            visitors={online.filter((m) => m.room === voiceView)}
            otherRoomName={call.room && call.room !== voiceView ? roomName(call.room) : null}
            onJoin={() => joinRoom(voiceView)}
          />
        ) : (
          <div className="workspace">
            <section className="chat">
              <div className="chat-scroll">
                {!search && (
                  <div className="intro">
                    {active === 'geral' && (
                      <figure className="cover">
                        <img src={labImage} width={1536} height={640} alt="Estudantes colaborando em um laboratório de robótica" />
                        <figcaption>
                          <strong>Aprender junto vai mais longe.</strong>
                          <span>Converse com sua turma, mostre seus projetos e entre nas salas de voz.</span>
                        </figcaption>
                      </figure>
                    )}
                    <h2 className="intro-title">Bem-vindo a #{channel.name}</h2>
                    <p className="intro-copy">{channel.about}. Seja gentil e compartilhe o que sabe.</p>
                  </div>
                )}

                {!user && !search && (
                  <div className="guest-card">
                    <p>Entre na comunidade para ver as mensagens e participar das conversas.</p>
                    <Button onClick={() => setAuthOpen(true)}>
                      <LogIn />
                      Entrar
                    </Button>
                  </div>
                )}

                {loading && !messages.length && <p className="chat-note">Carregando mensagens…</p>}

                <ol className="messages" key={active}>
                  {visible.map((m, i) => {
                    const prev = visible[i - 1];
                    const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
                    const grouped = !newDay && !!prev && prev.user_id === m.user_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
                    return (
                      <Fragment key={m.id}>
                        {newDay && (
                          <li className="day-divider">
                            <span>{dayLabel(m.created_at)}</span>
                          </li>
                        )}
                        <li className={`message ${grouped ? 'is-grouped' : ''}`}>
                          {grouped ? <time className="message-gutter-time">{timeLabel(m.created_at)}</time> : <Avatar name={m.display_name} tone={m.user_id === user?.id ? 'brand' : 'plain'} />}
                          <div className="message-body">
                            {!grouped && (
                              <div className="message-head">
                                <span className="message-author">{m.display_name}</span>
                                <time className="message-time">{timeLabel(m.created_at)}</time>
                              </div>
                            )}
                            <p className="message-text">{m.content}</p>
                          </div>
                          {m.user_id === user?.id && (
                            <Button className="message-delete" variant="ghost" size="icon" title="Apagar mensagem" onClick={() => void remove(m.id)}>
                              <Trash2 />
                            </Button>
                          )}
                        </li>
                      </Fragment>
                    );
                  })}
                </ol>

                {search && !visible.length && <p className="chat-note">Nenhuma mensagem com “{search}”.</p>}
                {user && !loading && !messages.length && !search && <p className="chat-note">Nenhuma mensagem ainda. Mande a primeira.</p>}
                <div ref={bottom} />
              </div>

              <form className="composer" onSubmit={send}>
                <Input aria-label="Mensagem" maxLength={4000} placeholder={user ? `Mensagem em #${channel.name}` : 'Entre para conversar'} value={draft} onChange={(e) => setDraft(e.target.value)} onFocus={() => !user && setAuthOpen(true)} />
                <Button size="icon" type="submit" disabled={sending || (!!user && !draft.trim())} title="Enviar">
                  <SendHorizontal />
                </Button>
              </form>
            </section>

            <aside className="members" aria-label="Membros online">
              <h2 className="nav-label">{online.length ? `${online.length} online` : 'Online'}</h2>
              {online.map((m) => (
                <div className="member" key={m.id}>
                  <Avatar name={m.name} online tone={m.id === user?.id ? 'brand' : 'plain'} />
                  <div className="min-w-0">
                    <div className="member-name truncate">
                      {m.name}
                      {m.id === user?.id ? ' (você)' : ''}
                    </div>
                    {m.room && (
                      <button type="button" className="member-room" onClick={() => selectRoom(m.room!)}>
                        <Volume2 />
                        {roomName(m.room)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!online.length && <p className="members-empty">{user ? 'Só você por enquanto.' : 'Entre para ver quem está online.'}</p>}
              <p className="members-foot">Comunidade independente, sem vínculo oficial com o SENAI.</p>
            </aside>
          </div>
        )}
      </main>

      <CommunityAuth open={authOpen} onOpenChange={setAuthOpen} />

      <Dialog open={!!panel} onOpenChange={(open) => !open && setPanel(null)}>
        <DialogContent className="max-w-md">
          {panel === 'invite' && (
            <>
              <DialogTitle>Convidar pessoas</DialogTitle>
              <DialogDescription>Mande o link para sua turma entrar na comunidade.</DialogDescription>
              <Button
                onClick={() => {
                  void navigator.clipboard
                    .writeText(window.location.origin)
                    .then(() => toast.success('Link copiado.'))
                    .catch(() => toast.error('Não foi possível copiar o link.'));
                }}
              >
                <Check />
                Copiar link
              </Button>
            </>
          )}
          {panel === 'explore' && space === 'geral' && (
            <>
              <DialogTitle>Explorar áreas</DialogTitle>
              <DialogDescription>Escolha um canal para entrar na conversa.</DialogDescription>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'programacao', label: 'Programação', icon: Code2 },
                  { id: 'mecanica', label: 'Mecânica', icon: Wrench },
                  { id: 'eletrica', label: 'Elétrica', icon: Zap },
                  { id: 'design', label: 'Design', icon: Palette },
                ].map((c) => (
                  <Button
                    key={c.id}
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      selectChannel(c.id);
                      setPanel(null);
                    }}
                  >
                    <c.icon />
                    {c.label}
                  </Button>
                ))}
              </div>
            </>
          )}
          {panel === 'members' && (
            <>
              <DialogTitle>Online agora</DialogTitle>
              <DialogDescription>{online.length ? `${online.length} pessoa${online.length > 1 ? 's' : ''} na comunidade.` : 'Entre para ver quem está online.'}</DialogDescription>
              <div className="grid gap-3">
                {online.map((m) => (
                  <div className="member" key={m.id}>
                    <Avatar name={m.name} online tone="plain" />
                    <div className="member-name">{m.name}</div>
                    {m.room && <span className="ml-auto text-xs text-muted-foreground">{roomName(m.room)}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
          {panel === 'about' && (
            <>
              <DialogTitle>Sobre a comunidade</DialogTitle>
              <DialogDescription>
                Um espaço independente para estudantes e pessoas que querem trocar conhecimento em Sorocaba. Sem vínculo oficial com o SENAI.
              </DialogDescription>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
