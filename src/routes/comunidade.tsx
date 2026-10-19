import { useCommunityTheme } from "@/hooks/use-community-theme";
import { CommunityThemeToggle } from "@/components/community-theme-toggle";
import "./community-layout.css";
import { CommunityHub } from "@/components/community-hub";
import "./community-hub.css";
import { useActivityPresence } from '@/components/activity-presence';
import { DeletedChannels } from '@/components/deleted-channels';
﻿import { AvatarDecoration } from '@/components/profile-decorations';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
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
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CommunityAuth } from '@/components/community-auth';
import { VoiceRoom, initials } from '@/components/voice-room';
import { BrandLogo } from '@/components/brand-logo';
import { DirectMessages } from '@/components/direct-messages';
import { CommunityProfileEditor } from '@/components/community-profile-editor';
import { CommunityProfileCard } from '@/components/community-profile-card';
import { useCommunityProfiles } from '@/hooks/use-community-profiles';
import { useChannelNames } from '@/hooks/use-channel-names';
import { RenameChannel, type RenameTarget } from '@/components/rename-channel';
import { useCommunityCall } from '@/hooks/use-community-call';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { memberClass, visibleSpaces, spaceChannel, type Space } from '@/lib/community-spaces';

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
const defaultRoomName = (id: string | null) => baseRooms.find((r) => r.id === id?.split(':').at(-1))?.name ?? '';

function Avatar({ name, src, decoration, online = false, tone = 'brand' }: { name: string; src?: string; decoration?: string; online?: boolean; tone?: 'brand' | 'plain' }) {
  return (
    <div className={`avatar ${tone === 'plain' ? 'is-plain' : ''}`} aria-hidden>
      {src ? <img src={src} alt=""/> : initials(name)}
      {online && <span className="online-dot" />}
      <AvatarDecoration theme={decoration}/>
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
  const {theme: communityTheme,toggle: toggleCommunityTheme}=useCommunityTheme();
  const themeControl=<CommunityThemeToggle theme={communityTheme} onToggle={toggleCommunityTheme}/>;
  const [overview, setOverview] = useState(true);
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
  const activity = useActivityPresence();
  const online = space === 'geral' ? activity.online : activity.classOnline;
  const [loading, setLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [showDeletedChannels, setShowDeletedChannels] = useState(false);
  const { channelName, isChannelDeleted, deletedChannels, refresh: refreshChannelNames } = useChannelNames(user?.id);
  const roomName = (id: string | null) => id ? channelName(id, 'voice', defaultRoomName(id)) : '';
  const [directView, setDirectView] = useState(false);
  const [directRecipient, setDirectRecipient] = useState<string | null>(null);
  const [profileView, setProfileView] = useState(false);
  const { profiles, refresh: refreshProfiles } = useCommunityProfiles(user?.id);
  const [directSidebar, setDirectSidebar] = useState<HTMLDivElement | null>(null);
  const [directMain, setDirectMain] = useState<HTMLDivElement | null>(null);

  const call = useCommunityCall();
  const bottom = useRef<HTMLDivElement>(null);

  const liveRoom = call.room && !call.connecting ? call.room : null;


  const name = profiles[user?.id ?? '']?.display_name || String(user?.user_metadata?.['display_name'] || user?.user_metadata?.['full_name'] || user?.email?.split('@')[0] || 'Visitante');
  function openProfileEditor() { setProfileView(true); setDirectView(false); setDrawer(false); }
  function openPrivateChat(id: string) { setDirectRecipient(id); setDirectView(true); setProfileView(false); setPanel(null); setDrawer(false); }
  const turma = memberClass(user?.app_metadata);
  const availableSpaces = visibleSpaces(turma);
  const groups = (space === 'geral' ? generalGroups : classGroups).map(group => ({ ...group, channels: group.channels.filter(c => !isChannelDeleted(spaceChannel(space, c.id), 'text')).map(c => ({ ...c, name: channelName(spaceChannel(space, c.id), 'text', c.name) })) }));
  const allChannels = groups.flatMap((g) => g.channels);
  const messageChannel = spaceChannel(space, active);
  const rooms = baseRooms.filter(r => !isChannelDeleted(spaceChannel(space, r.id), 'voice')).map((r) => ({ ...r, id: spaceChannel(space, r.id), name: channelName(spaceChannel(space, r.id), 'voice', r.name) }));
  const spaceName = availableSpaces.find((s) => s.id === space)?.name ?? 'Geral';
  const selectedChannel = useRef(messageChannel);
  selectedChannel.current = messageChannel;
  const channel = allChannels.find((c) => c.id === active) ?? allChannels[0] ?? { id: '', name: 'Nenhum canal', about: '' };
  const textUnavailable = !active || isChannelDeleted(messageChannel, 'text');
  const nextActive = allChannels.some(c => c.id === active) ? active : allChannels[0]?.id ?? '';
  const voiceUnavailable = !!voiceView && isChannelDeleted(voiceView, 'voice');
  const joinedUnavailable = !!call.room && isChannelDeleted(call.room, 'voice');
  useEffect(() => { if (nextActive !== active) { setActive(nextActive); setDraft(''); } }, [nextActive, active]);
  useEffect(() => { if (voiceUnavailable) setVoiceView(null); }, [voiceUnavailable]);
  useEffect(() => { if (joinedUnavailable) call.leave(); }, [joinedUnavailable, call.leave]);

  // Sessão
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // Mensagens do canal
  useEffect(() => {
    if (!user || textUnavailable) {
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
  }, [messageChannel, user?.id, textUnavailable]);

  useEffect(() => { activity.setRoom(liveRoom); return () => activity.setRoom(null); }, [liveRoom, activity.setRoom]);

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
    setOverview(true);
    setVoiceView(null);
    setDrawer(false);
    setProfileView(false);
    setDirectView(false);
    if (!availableSpaces.some((s) => s.id === next) || next === space) return;
    call.leave();
    setMessages([]);
    setDraft('');
    setSearch('');
    setVoiceView(null);
    setActive('geral');
    setSpace(next);
  }

  function selectChannel(id: string) {
    setProfileView(false);
    setDirectView(false);
    setOverview(false);
    if (!allChannels.some((c) => c.id === id)) return;
    if (id !== active) { setMessages([]); setDraft(''); }
    setActive(id);
    setVoiceView(null);
    setDrawer(false);
    setSearch('');
  }
  function selectRoom(id: string) {
    setProfileView(false);
    setDirectView(false);
    setOverview(false);
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
    <div data-community-theme={communityTheme} className={`community-app ${showMembers && !voiceView ? '' : 'no-members'} ${directView ? 'is-direct-view' : ''} ${profileView && user ? 'is-profile-view' : ''}`}>
      {/* ───────── Barra lateral ───────── */}
      <aside className={`sidebar ${drawer ? 'is-open' : ''}`} aria-label="Canais">
        <nav className="community-spaces" aria-label="Espaços da comunidade">
          <DirectMessages themeControl={themeControl} user={user} profiles={profiles} requestedRecipient={directRecipient} onSignIn={() => setAuthOpen(true)} open={directView} setOpen={(open) => { setDirectView(open); if (open) { setProfileView(false); setDirectRecipient(null); } }} sidebarTarget={directSidebar} mainTarget={directMain} />
          {availableSpaces.map((s) => <button key={s.id} type="button" title={s.name} aria-label={s.name} aria-pressed={space === s.id} onClick={() => selectSpace(s.id)}><strong>{s.badge}</strong><span>{s.name}</span></button>)}
        </nav>
        <div className="direct-sidebar-target" ref={setDirectSidebar} />
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
                <DropdownMenuItem onSelect={() => { if (user) { setProfileView(true); setDirectView(false); setDrawer(false); } else setAuthOpen(true); }}>
                  <Settings />Editar perfil
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowDeletedChannels(true)}><Trash2/>Canais excluídos</DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/jogos">Jogos</Link></DropdownMenuItem>
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
          <button type="button" className="community-overview-link" onClick={() => { setDirectRecipient(null); setDirectView(true); setProfileView(false); setDrawer(false); }}><Users size={17}/><span>Pessoas e mensagens</span></button>
          <button type="button" className={`community-overview-link ${overview && !directView && !profileView ? "is-active" : ""}`} onClick={() => { setOverview(true); setDirectView(false); setProfileView(false); setVoiceView(null); setDrawer(false); }}><House size={17}/><span>Explorar comunidade</span></button>
          <div className="space-heading"><strong>{spaceName}</strong><small>{space === 'geral' ? 'Terceiro A + Terceiro B' : 'Somente membros da sua turma'}</small></div>
          {!turma && <p className="space-missing">Sua conta ainda não tem uma turma vinculada. O espaço Geral continua disponível.</p>}
          {groups.map((g) => (
            <section className="nav-group" key={g.label}>
              <h2 className="nav-label">{g.label}</h2>
              {g.channels.map((c) => (
                <div className="channel-nav-row" key={c.id}><button type="button" className={`nav-item ${active === c.id && !voiceView && !overview ? 'is-active' : ''}`} onClick={() => selectChannel(c.id)}>
                  <Hash />
                  <span className="truncate">{c.name}</span>
                </button>{user && <button type="button" className="channel-rename-button" title={`Renomear #${c.name}`} aria-label={`Renomear canal ${c.name}`} onClick={() => setRenameTarget({ id: spaceChannel(space, c.id), kind: 'text', name: c.name })}><Settings size={14}/></button>}</div>
              ))}
            </section>
          ))}

          <section className="nav-group">
            <h2 className="nav-label">Salas de voz</h2>
            {rooms.map((r) => {
              const people = peopleIn(r.id);
              return (
                <Fragment key={r.id}>
                  <div className="channel-nav-row"><button type="button" className={`nav-item ${voiceView === r.id ? 'is-active' : ''} ${call.room === r.id ? 'is-joined' : ''}`} onClick={() => selectRoom(r.id)}>
                    <Volume2 />
                    <span className="truncate">{r.name}</span>
                    {people.length > 0 && <span className="nav-count">{people.length}</span>}
                  </button>{user && <button type="button" className="channel-rename-button" title={`Renomear ${r.name}`} aria-label={`Renomear sala ${r.name}`} onClick={() => setRenameTarget({ id: r.id, kind: 'voice', name: r.name })}><Settings size={14}/></button>}</div>
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
          {user ? <CommunityProfileCard id={user.id} name={name} profile={profiles[user.id]} online self onMessage={openPrivateChat} onEdit={openProfileEditor}><Avatar name={name} src={profiles[user.id]?.avatarSrc} decoration={profiles[user.id]?.avatar_decoration} online/></CommunityProfileCard> : <Avatar name={name}/>}
          <div className="me-text">
            <div className="me-name truncate">{name}</div>
            <div className="me-status">{user ? 'Online' : 'Não conectado'}</div>
          </div>
          <Button variant="ghost" size="icon" title="Editar perfil" onClick={() => { if (user) { setProfileView(true); setDirectView(false); setDrawer(false); } else setAuthOpen(true); }}><Settings /></Button>
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
          {overview ? <House className="topbar-icon" /> : voiceView ? <Volume2 className="topbar-icon" /> : <Hash className="topbar-icon" />}
          <h1 className="topbar-title">{overview ? "Explorar comunidade" : voiceView ? roomName(voiceView) : channel.name}</h1>
          {!voiceView && <span className="topbar-about">{overview ? spaceName : channel.about}</span>}
          <div className="topbar-tools">
            {themeControl}
            {!voiceView && !overview && (
              <label className="search">
                <Search />
                <Input aria-label="Buscar mensagens" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
            )}
            {!voiceView && !overview && (
              <Button variant="ghost" size="icon" className="members-toggle" title={showMembers ? 'Ocultar membros' : 'Mostrar membros'} aria-pressed={showMembers} onClick={() => setShowMembers(!showMembers)}>
                <Users />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="members-sheet" title="Membros" onClick={() => setPanel('members')}>
              <Users />
            </Button>
          </div>
        </header>

        {overview ? <CommunityHub name={name} avatar={profiles[user?.id ?? '']?.avatarSrc} space={spaceName} online={online.map(p => ({ id: p.id, name: profiles[p.id]?.display_name || p.name, avatar: profiles[p.id]?.avatarSrc, room: p.room }))} groups={groups} rooms={rooms.map(r => ({ ...r, people: peopleIn(r.id).map(p => ({ ...p, name: profiles[p.id]?.display_name || p.name, avatar: profiles[p.id]?.avatarSrc })) }))} joinedRoom={call.room} onChannel={selectChannel} onRoom={id => { selectRoom(id); if (call.room !== id) joinRoom(id); }} onPerson={id => id === user?.id ? openProfileEditor() : openPrivateChat(id)} onInvite={() => setPanel('invite')} onProfile={openProfileEditor}/> : !allChannels.length && !voiceView ? <div className="channel-empty-state"><Hash size={36}/><h2>Nenhum canal de texto neste espaço</h2><p>Você pode restaurar os canais excluídos ou entrar em uma sala de voz.</p><Button onClick={() => setShowDeletedChannels(true)}>Ver canais excluídos</Button></div> : voiceView ? (
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
                          {grouped ? <time className="message-gutter-time">{timeLabel(m.created_at)}</time> : <CommunityProfileCard id={m.user_id} name={m.display_name} profile={profiles[m.user_id]} online={online.some(p => p.id === m.user_id)} self={m.user_id === user?.id} onMessage={openPrivateChat} onEdit={openProfileEditor}><Avatar name={profiles[m.user_id]?.display_name || m.display_name} src={profiles[m.user_id]?.avatarSrc} decoration={profiles[m.user_id]?.avatar_decoration} tone={m.user_id === user?.id ? 'brand' : 'plain'}/></CommunityProfileCard>}
                          <div className="message-body">
                            {!grouped && (
                              <div className="message-head">
                                <CommunityProfileCard id={m.user_id} name={m.display_name} profile={profiles[m.user_id]} online={online.some(p => p.id === m.user_id)} self={m.user_id === user?.id} onMessage={openPrivateChat} onEdit={openProfileEditor}><span className="message-author">{profiles[m.user_id]?.display_name || m.display_name}</span></CommunityProfileCard>
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
                  <CommunityProfileCard id={m.id} name={m.name} profile={profiles[m.id]} online room={m.room ? roomName(m.room) : undefined} self={m.id === user?.id} onMessage={openPrivateChat} onEdit={openProfileEditor} onRoom={() => m.room && selectRoom(m.room)}><Avatar name={profiles[m.id]?.display_name || m.name} src={profiles[m.id]?.avatarSrc} decoration={profiles[m.id]?.avatar_decoration} online tone={m.id === user?.id ? 'brand' : 'plain'}/></CommunityProfileCard>
                  <div className="min-w-0">
                    <div className="member-name truncate">
                      <CommunityProfileCard id={m.id} name={m.name} profile={profiles[m.id]} online room={m.room ? roomName(m.room) : undefined} self={m.id === user?.id} onMessage={openPrivateChat} onEdit={openProfileEditor} onRoom={() => m.room && selectRoom(m.room)}>{profiles[m.id]?.display_name || m.name}</CommunityProfileCard>
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
      <div className="direct-main-target" ref={setDirectMain} />
      <DeletedChannels open={showDeletedChannels} onOpenChange={setShowDeletedChannels} channels={deletedChannels.filter(c => space === 'geral' ? !c.channel_id.includes(':') : c.channel_id.startsWith(space + ':'))} onRestored={refreshChannelNames}/>
      <RenameChannel target={renameTarget} userId={user?.id} onClose={() => setRenameTarget(null)} onSaved={refreshChannelNames}/>
      {profileView && user && <div className="profile-main-target"><CommunityProfileEditor key={profiles[user.id] ? user.id : 'loading'} user={user} profile={profiles[user.id]} onClose={() => setProfileView(false)} onSaved={refreshProfiles}/></div>}

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
                    <Avatar name={profiles[m.id]?.display_name || m.name} src={profiles[m.id]?.avatarSrc} decoration={profiles[m.id]?.avatar_decoration} online tone="plain" />
                    <div className="member-name">{profiles[m.id]?.display_name || m.name}</div>
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
