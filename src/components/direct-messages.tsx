import { CommunityPeople } from "./community-people";
import { useActivityPresence, mergeActivity } from "./activity-presence";
import "@/routes/community-people.css";
import { AvatarDecoration, ProfileEffect } from './profile-decorations';
﻿import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, MessageCircle, SendHorizontal, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CommunityProfile } from '@/hooks/use-community-profiles';

type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };
type Person = { id: string; display_name: string };
// These tables are defined in supabase/direct-messages.sql and supabase/social.sql.
const db = supabase as any;

export function DirectMessages({ user, onSignIn, open, setOpen, sidebarTarget, mainTarget, profiles = {}, requestedRecipient }: { requestedRecipient?: string | null; profiles?: Record<string, CommunityProfile>; user: User | null; onSignIn: () => void; open: boolean; setOpen: (open: boolean) => void; sidebarTarget: HTMLElement | null; mainTarget: HTMLElement | null }) {
  const activity = useActivityPresence();
  const livePeople = mergeActivity([...activity.online, ...activity.classOnline]);
  const [people, setPeople] = useState<Person[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { if (open) { setSelected(requestedRecipient || null); setDraft(''); } }, [open, requestedRecipient]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const unread = messages.filter(m => m.recipient_id === user?.id && !m.read_at).length;
  const directory = people.map(p => ({ ...p, ...profiles[p.id] }));
  const person = directory.find(p => p.id === selected);
  const conversation = messages.filter(m => m.sender_id === selected || m.recipient_id === selected);

  const load = useCallback(async () => {
    if (!user) return;
    const result = await db.from('direct_messages').select('*').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(500);
    if (result.error) { setError('Não foi possível carregar suas mensagens. Tente novamente.'); return; }
    setMessages((result.data ?? []).reverse());
    setError('');
  }, [user?.id]);

  useEffect(() => {
    if (!user) { setMessages([]); setPeople([]); setSelected(null); setOpen(false); return; }
    let live = true;
    const refresh = async () => { if (!document.hidden && live) await load(); };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { live = false; window.clearInterval(timer); };
  }, [load, user?.id]);

  useEffect(() => {
    if (!open || !user) return;
    let live = true;
    const name = String(user.user_metadata?.display_name || user.user_metadata?.full_name || 'Aluno').slice(0, 60);
    void (async () => {
      await db.from('social_profiles').upsert({ id: user.id, display_name: name }, { onConflict: 'id', ignoreDuplicates: true });
      const result = await db.from('social_profiles').select('id,display_name').neq('id', user.id).order('display_name');
      if (!live) return;
      if (result.error) setError('Não foi possível carregar os colegas. Tente novamente.');
      else setPeople(result.data ?? []);
    })();
    return () => { live = false; };
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || !selected || !user) return;
    const unreadIds = messages.filter(m => m.sender_id === selected && m.recipient_id === user.id && !m.read_at).map(m => m.id);
    if (!unreadIds.length) return;
    void db.from('direct_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds).then(({ error: err }: { error: unknown }) => { if (!err) void load(); });
  }, [open, selected, messages, user?.id, load]);

  useEffect(() => { if (open) bottom.current?.scrollIntoView({ block: 'nearest' }); }, [open, selected, conversation.at(-1)?.id]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !selected || !draft.trim() || sending) return;
    setSending(true);
    try {
      const result = await db.from('direct_messages').insert({ sender_id: user.id, recipient_id: selected, body: draft.trim() });
      if (result.error) setError('Não foi possível enviar a mensagem. Seu texto foi mantido.');
      else { setDraft(''); await load(); }
    } catch { setError('Falha na conexão. Tente enviar novamente.'); }
    finally { setSending(false); }
  }

  return <>
    <button className="direct-messages-launch" type="button" title="Mensagens privadas" aria-pressed={open} aria-label={`Mensagens privadas${unread ? `, ${unread} não lidas` : ''}`} onClick={() => user ? setOpen(true) : onSignIn()}>
      <strong><MessageCircle size={24}/></strong>{unread > 0 && <span className="direct-unread">{unread > 99 ? '99+' : unread}</span>}
    </button>
    <div className="direct-rail-separator"/>
    {open && sidebarTarget && createPortal(
      <div className="direct-inbox">
        <label className="direct-find"><span className="sr-only">Encontrar colega</span><input aria-label="Encontrar colega" value={search} onChange={e => setSearch(e.target.value)} placeholder="Encontrar ou começar uma conversa"/></label>
        <button type="button" className="direct-directory-link" onClick={() => setOpen(false)}><ArrowLeft size={16}/><span>Voltar aos canais</span></button>
        <button type="button" className={`direct-directory-link ${!selected ? "is-active" : ""}`} onClick={() => setSelected(null)}><Users size={18}/><strong>Pessoas</strong></button>
        <div className="direct-inbox-heading"><MessageCircle size={18}/><strong>Mensagens diretas</strong></div>
        <div className="direct-people">{directory.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase())).map(p => <button className={selected === p.id ? 'is-active' : ''} key={p.id} onClick={() => { setSelected(p.id); setDraft(''); }}><span className="mini-avatar">{p.avatarSrc ? <img src={p.avatarSrc} alt=""/> : p.display_name.slice(0,1).toUpperCase()}<AvatarDecoration theme={p.avatar_decoration}/></span><span>{p.display_name}</span>{messages.some(m => m.sender_id === p.id && m.recipient_id === user?.id && !m.read_at) && <i aria-label="Mensagens não lidas"/>}</button>)}{!people.length && <p>Nenhum colega disponível ainda.</p>}</div>
      </div>, sidebarTarget)}
    {open && mainTarget && createPortal(
      <div className="direct-workspace">
        {!selected ? <><CommunityPeople people={directory} online={livePeople.filter(p => p.id !== user?.id)} unreadIds={[...new Set(messages.filter(m => m.recipient_id === user?.id && !m.read_at).map(m => m.sender_id))]} connected={activity.connected} onSelect={id => { setSelected(id); setDraft(''); }}/>{error && <div className="direct-error" role="alert">{error}<button onClick={() => void load()}>Tentar novamente</button></div>}</> : <>
        <header className="direct-topbar"><button className="icon-btn" aria-label="Voltar aos canais" onClick={() => setOpen(false)}><ArrowLeft size={18}/></button><span className="mini-avatar">{person?.avatarSrc ? <img src={person.avatarSrc} alt=""/> : person?.display_name.slice(0,1).toUpperCase() ?? '@'}</span><h1>{person?.display_name ?? 'Mensagens diretas'}</h1><span className="direct-private-label">Conversa privada</span></header>
        <div className="direct-workspace-body">
          <section className="direct-chat" aria-label="Conversa privada">{error && <div className="direct-error" role="alert">{error}<button onClick={() => void load()}>Tentar novamente</button></div>}
            <div className="direct-history" aria-live="polite">{!selected ? <div className="direct-welcome"><MessageCircle size={52}/><h2>Suas conversas, seu espaço.</h2><p>Escolha um colega na lista para conversar em privado.</p></div> : <><div className="direct-conversation-intro"><span className="direct-profile-avatar">{person?.avatarSrc ? <img src={person.avatarSrc} alt=""/> : person?.display_name.slice(0,1).toUpperCase()}<AvatarDecoration theme={person?.avatar_decoration}/></span><h2>{person?.display_name}</h2><p>Este é o começo da sua conversa com {person?.display_name}.</p></div>{conversation.map(m => <article className="direct-line" key={m.id}><span className="mini-avatar">{profiles[m.sender_id]?.avatarSrc ? <img src={profiles[m.sender_id].avatarSrc} alt=""/> : (profiles[m.sender_id]?.display_name || (m.sender_id === user?.id ? "V" : person?.display_name || "?")).slice(0,1).toUpperCase()}</span><div><header><strong>{m.sender_id === user?.id ? 'Você' : person?.display_name}</strong><time>{new Date(m.created_at).toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short'})}</time></header><p>{m.body}</p></div></article>)}</>}<div ref={bottom}/></div>
            <form className="direct-compose" onSubmit={send}><input aria-label="Mensagem privada" placeholder={selected ? 'Conversar com @' + (person?.display_name ?? 'colega') : 'Escolha um colega para conversar'} disabled={!selected} maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)}/><button disabled={!selected || !draft.trim() || sending} aria-label="Enviar mensagem privada"><SendHorizontal size={20}/></button></form>
          </section>
          {person && <aside className="direct-person-profile"><ProfileEffect theme={person.profile_effect}/><div className="direct-profile-cover" style={{ backgroundColor: person.banner_color }}>{person.bannerSrc && <img src={person.bannerSrc} alt=""/>}</div><div className="direct-profile-details"><span className="direct-profile-avatar">{person.avatarSrc ? <img src={person.avatarSrc} alt=""/> : person.display_name.slice(0,1).toUpperCase()}<AvatarDecoration theme={person.avatar_decoration}/></span><h2>{person.display_name}</h2><p>{person.bio || 'Aluno da comunidade'}</p><div className="direct-profile-note"><strong>Conversa privada</strong><p>Apenas você e {person.display_name} podem ler estas mensagens.</p></div></div></aside>}
        </div>
        </>}
      </div>, mainTarget)}
  </>;
}
