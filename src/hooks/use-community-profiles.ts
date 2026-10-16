import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CommunityProfile = { id: string; display_name: string; bio: string; avatar_url: string | null; banner_url: string | null; banner_color: string; created_at: string; avatar_decoration?: string; profile_effect?: string; avatarSrc?: string; bannerSrc?: string };
const db = supabase as any;

export async function resolveProfileImages(profiles: CommunityProfile[]) {
  const paths = [...new Set(profiles.flatMap(p => [p.avatar_url, p.banner_url]).filter((p): p is string => !!p))];
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from('community-profiles').createSignedUrls(paths, 3600);
    data?.forEach(item => { if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl); });
  }
  return profiles.map(p => ({ ...p, avatarSrc: p.avatar_url ? urls.get(p.avatar_url) : undefined, bannerSrc: p.banner_url ? urls.get(p.banner_url) : undefined }));
}

export function useCommunityProfiles(userId?: string) {
  const [profiles, setProfiles] = useState<Record<string, CommunityProfile>>({});
  const refresh = useCallback(async () => {
    if (!userId) return;
    const result = await db.from('social_profiles').select('*');
    if (!result.error) {
      const resolved = await resolveProfileImages(result.data ?? []);
      setProfiles(Object.fromEntries(resolved.map(p => [p.id, p])));
    }
  }, [userId]);
  useEffect(() => {
    if (!userId) { setProfiles({}); return; }
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh, userId]);
  return { profiles, refresh };
}
