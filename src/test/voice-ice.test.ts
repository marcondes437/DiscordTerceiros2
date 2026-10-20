import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

async function setup() {
  vi.resetModules();
  for (const key of ['VITE_TURN_URLS', 'VITE_TURN_USERNAME', 'VITE_TURN_CREDENTIAL', 'VITE_METERED_DOMAIN', 'VITE_METERED_API_KEY']) vi.stubEnv(key, '');
  return import('@/lib/voice/ice');
}

it('rejects incomplete provider configuration instead of silently using STUN', async () => {
  const { getIceServers } = await setup();
  vi.stubEnv('VITE_METERED_DOMAIN', 'example.metered.live');
  await expect(getIceServers()).rejects.toThrow('juntos');
});

it('rejects static TURN without authentication', async () => {
  const { getIceServers } = await setup();
  vi.stubEnv('VITE_TURN_URLS', 'turn:example.com:3478');
  await expect(getIceServers()).rejects.toThrow('credencial');
});

it('accepts a pasted HTTPS Metered domain and loads relay credentials', async () => {
  const { getIceServers } = await setup();
  vi.stubEnv('VITE_METERED_DOMAIN', 'https://example.metered.live/');
  vi.stubEnv('VITE_METERED_API_KEY', 'test');
  const fetcher = vi.fn(async (_url: string, _options?: RequestInit) => ({ ok: true, json: async () => [{ urls: 'turn:relay.example:443', username: 'user', credential: 'test' }] }));
  vi.stubGlobal('fetch', fetcher);
  expect(await getIceServers()).toHaveLength(2);
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://example.metered.live/api/v1/turn/credentials?apiKey=test');
});
