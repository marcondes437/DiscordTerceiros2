import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('Browser authentication startup', () => {
  it('renders login with public configuration and no session', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    const { AccountGate } = await import('@/components/account-gate');
    render(<AccountGate><p>Private content</p></AccountGate>);
    expect(await screen.findByRole('button', { name: /entrar na comunidade/i })).toBeInTheDocument();
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
  });

  it('reports missing public configuration explicitly', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    const { supabase } = await import('@/integrations/supabase/client');
    let failure: unknown;
    try { void supabase.auth; } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain('Missing Supabase environment');
  });
});

