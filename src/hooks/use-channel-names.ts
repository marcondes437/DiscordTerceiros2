import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
export type ChannelRecord = { channel_id: string; kind: 'text' | 'voice'; name: string; archived: boolean };

export function useChannelNames(userId?: string) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<ChannelRecord[]>([]);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const result = await (supabase as any).from('community_channel_names').select('channel_id,kind,name,archived');
    if (!result.error) { setRecords(result.data ?? []); setNames(Object.fromEntries((result.data ?? []).map((row: ChannelRecord) => [`${row.kind}:${row.channel_id}`, row.name]))); }
  }, [userId]);
  useEffect(() => {
    if (!userId) { setNames({}); setRecords([]); return; }
    void refresh();
    const channel = supabase.channel(`channel-names:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'community_channel_names' }, () => void refresh()).subscribe();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('focus', onFocus); void supabase.removeChannel(channel); };
  }, [refresh, userId]);
  const channelName = (id: string, kind: 'text' | 'voice', fallback: string) => names[`${kind}:${id}`] || fallback;
  const isChannelDeleted = (id: string, kind: 'text' | 'voice') => records.some(row => row.channel_id === id && row.kind === kind && row.archived);
  return { channelName, isChannelDeleted, deletedChannels: records.filter(row => row.archived), refresh };
}
