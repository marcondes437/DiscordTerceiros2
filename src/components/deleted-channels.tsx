import { useState } from 'react';
import { Hash, RotateCcw, Volume2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { ChannelRecord } from '@/hooks/use-channel-names';

export function DeletedChannels({ open, onOpenChange, channels, onRestored }: { open: boolean; onOpenChange: (open: boolean) => void; channels: ChannelRecord[]; onRestored: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function restore(channel: ChannelRecord) {
    setBusy(`${channel.kind}:${channel.channel_id}`); setError('');
    try {
      const result = await (supabase as any).rpc('set_community_channel_archived', { p_channel_id: channel.channel_id, p_kind: channel.kind, p_name: channel.name, p_archived: false });
      if (result.error) setError('Não foi possível restaurar o canal. Tente novamente.');
      else await onRestored();
    } catch { setError('Falha na conexão. Tente novamente.'); }
    finally { setBusy(null); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogTitle>Canais excluídos</DialogTitle><DialogDescription>Restaure um canal deste espaço para recuperar o acesso às conversas.</DialogDescription><div className="deleted-channel-list">{!channels.length && <p>Nenhum canal excluído neste espaço.</p>}{channels.map(channel => <div key={`${channel.kind}:${channel.channel_id}`}>{channel.kind === 'voice' ? <Volume2 size={18}/> : <Hash size={18}/>}<span>{channel.name}</span><Button variant="secondary" size="sm" disabled={!!busy} onClick={() => void restore(channel)}><RotateCcw size={13}/>{busy === `${channel.kind}:${channel.channel_id}` ? 'Restaurando...' : 'Restaurar'}</Button></div>)}</div>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</DialogContent></Dialog>;
}
