import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Hash, ShieldCheck, Volume2, Trash2 } from 'lucide-react';

export type RenameTarget = { id: string; kind: 'text' | 'voice'; name: string };
export function RenameChannel({ target, userId, onClose, onSaved }: { target: RenameTarget | null; userId?: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'permissions' | 'delete'>('overview');
  useEffect(() => { setName(target?.name ?? ''); setError(''); setTab('overview'); }, [target]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!target || !userId || busy) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) { setError('Use entre 1 e 60 caracteres.'); return; }
    setBusy(true); setError('');
    try {
      const result = await (supabase as any).rpc('rename_community_channel', { p_channel_id: target.id, p_kind: target.kind, p_name: trimmed });
      if (result.error) { setError('Não foi possível renomear o canal. Tente novamente.'); return; }
      await onSaved();
      onClose();
    } catch { setError('Falha na conexão. Seu nome foi mantido para tentar novamente.'); }
    finally { setBusy(false); }
  }
  async function deleteChannel() {
    if (!target || !userId || busy) return;
    setBusy(true); setError('');
    try {
      const result = await (supabase as any).rpc('set_community_channel_archived', { p_channel_id: target.id, p_kind: target.kind, p_name: target.name, p_archived: true });
      if (result.error) { setError('Não foi possível excluir o canal. Tente novamente.'); return; }
      await onSaved(); onClose();
    } catch { setError('Falha na conexão. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={!!target} onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="channel-settings-screen">
    <DialogDescription className="sr-only">Configurações do canal. Altere o nome ou consulte quem pode editar.</DialogDescription>
    <div className="channel-settings-layout">
      <aside className="channel-settings-nav"><div className="channel-settings-nav-inner"><p className="channel-settings-caption">{target?.kind === 'voice' ? <Volume2 size={13}/> : <Hash size={13}/>}<strong>{target?.name}</strong><span>{target?.kind === 'voice' ? 'CANAL DE VOZ' : 'CANAL DE TEXTO'}</span></p><nav aria-label="Configurações do canal"><button className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}>Visão geral</button><button className={tab === 'permissions' ? 'is-active' : ''} onClick={() => setTab('permissions')}>Permissões</button></nav><div className="channel-settings-nav-separator"/><button className="channel-settings-delete" onClick={() => { setTab('delete'); setError(''); }} disabled={busy}><span>Excluir canal</span><Trash2 size={15}/></button><button className="channel-settings-return" onClick={onClose} disabled={busy}>Voltar à comunidade</button></div></aside>
      <section className="channel-settings-content"><div className="channel-settings-content-inner">
        <DialogTitle>{tab === 'overview' ? 'Visão geral' : tab === 'permissions' ? 'Permissões' : 'Excluir canal'}</DialogTitle>
        {tab === 'overview' ? <form onSubmit={save} className="channel-settings-form"><label htmlFor="channel-settings-name">Nome do canal</label><Input id="channel-settings-name" autoFocus maxLength={60} value={name} disabled={busy} onChange={e => setName(e.target.value)} required/><p className="channel-settings-help">Escolha um nome para {target?.kind === 'voice' ? 'sua sala de voz' : 'o canal de texto'}. Ele será atualizado para todos os membros deste espaço.</p><section className="channel-settings-details"><h2>{target?.kind === 'voice' ? 'Sala de voz' : 'Canal de texto'}</h2><p>{target?.kind === 'voice' ? 'Mudar o nome mantém todos na chamada e preserva o compartilhamento de tela.' : 'Mudar o nome mantém o histórico de mensagens e todos os participantes do canal.'}</p></section>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="channel-settings-save"><span>{name.trim() !== target?.name ? 'Você tem alterações não salvas.' : 'As alterações aparecem para todos.'}</span><div><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy || !name.trim() || name.trim() === target?.name}>{busy ? 'Salvando...' : 'Salvar nome'}</Button></div></div></form> : tab === 'permissions' ? <div className="channel-settings-permissions"><ShieldCheck size={30}/><h2>Os membros podem renomear este canal</h2><p>Qualquer membro conectado com acesso a este espaço pode alterar o nome.</p><dl><div><dt>Espaço</dt><dd>{target?.id.startsWith('terceiro-a:') ? 'Terceiro A' : target?.id.startsWith('terceiro-b:') ? 'Terceiro B' : 'Geral'}</dd></div><div><dt>Quem pode editar</dt><dd>{target?.id.includes(':') ? 'Membros desta turma' : 'Todos os membros conectados'}</dd></div></dl></div> : <div className="channel-delete-confirm"><Trash2 size={34}/><h2>Excluir {target?.name}?</h2><p>O canal vai desaparecer da lista para todos os membros. O histórico fica preservado e o canal pode ser recuperado em <strong>Canais excluídos</strong>, no menu da comunidade.</p>{target?.kind === 'voice' && <p>Quem estiver nesta sala será desconectado da chamada.</p>}{error && <p role="alert" className="profile-editor-error">{error}</p>}<div><Button variant="ghost" disabled={busy} onClick={() => { setTab('overview'); setError(''); }}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={() => void deleteChannel()}>{busy ? 'Excluindo...' : 'Confirmar exclusão'}</Button></div></div>}
      </div></section>
    </div>
  </DialogContent></Dialog>;
}
