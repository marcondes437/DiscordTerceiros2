/**
 * Servidores ICE usados nas chamadas.
 *
 * STUN resolve a maioria das redes domésticas. Redes de escola, empresa e 4G/5G
 * (CGNAT) costumam exigir um servidor TURN, que retransmite o áudio/vídeo quando a
 * conexão direta não é possível. Configure UMA das opções abaixo no .env:
 *
 *   # Opção A — TURN próprio (coturn, Twilio, Cloudflare, etc.)
 *   VITE_TURN_URLS=turn:turn.exemplo.com:3478,turns:turn.exemplo.com:5349
 *   VITE_TURN_USERNAME=usuario
 *   VITE_TURN_CREDENTIAL=senha
 *
 *   # Opção B — Metered.ca (tem plano gratuito); credenciais buscadas na hora
 *   VITE_METERED_DOMAIN=seuapp.metered.live
 *   VITE_METERED_API_KEY=sua_chave
 */

const STUN: RTCIceServer = {
  urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'],
};

const env = (key: string) => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

let cached: { at: number; servers: RTCIceServer[] } | null = null;

export async function getIceServers(): Promise<RTCIceServer[]> {
  if (cached && Date.now() - cached.at < 30 * 60_000) return cached.servers;
  const servers: RTCIceServer[] = [STUN];

  const urls = env('VITE_TURN_URLS');
  if (urls) {
    servers.push({
      urls: urls.split(',').map((u) => u.trim()).filter(Boolean),
      username: env('VITE_TURN_USERNAME'),
      credential: env('VITE_TURN_CREDENTIAL'),
    });
  }

  const domain = env('VITE_METERED_DOMAIN');
  const apiKey = env('VITE_METERED_API_KEY');
  if (domain && apiKey) {
    try {
      const res = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`);
      if (res.ok) {
        const list = (await res.json()) as RTCIceServer[];
        if (Array.isArray(list)) servers.push(...list);
      }
    } catch {
      /* sem TURN: segue só com STUN */
    }
  }

  cached = { at: Date.now(), servers };
  return servers;
}

export function hasRelayConfigured() {
  return Boolean(env('VITE_TURN_URLS') || (env('VITE_METERED_DOMAIN') && env('VITE_METERED_API_KEY')));
}
