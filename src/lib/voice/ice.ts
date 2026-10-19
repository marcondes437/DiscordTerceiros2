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
    const username = env('VITE_TURN_USERNAME');
    const credential = env('VITE_TURN_CREDENTIAL');
    servers.push({
      urls: urls.split(',').map((u) => u.trim()).filter(Boolean),
      ...(username ? { username } : {}),
      ...(credential ? { credential } : {}),
    });
  }

  const domain = env('VITE_METERED_DOMAIN');
  const apiKey = env('VITE_METERED_API_KEY');
  if (domain && apiKey) {
    try {
      const res = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error('Não foi possível obter as credenciais TURN. Confira a configuração do provedor.');
      const list = (await res.json()) as RTCIceServer[];
      if (!Array.isArray(list) || !list.some(isRelay)) throw new Error('O provedor não retornou um servidor TURN válido.');
      servers.push(...list);
    } catch {
      throw new Error('O servidor de chamadas TURN está indisponível. Confira o domínio e a chave configurados na Vercel.');
    }
  }

  cached = { at: Date.now(), servers };
  return servers;
}

function isRelay(server: RTCIceServer) {
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
  return urls.some((url) => typeof url === 'string' && /^turns?:/.test(url));
}

export function hasRelayConfigured() {
  return Boolean(env('VITE_TURN_URLS') || (env('VITE_METERED_DOMAIN') && env('VITE_METERED_API_KEY')));
}
