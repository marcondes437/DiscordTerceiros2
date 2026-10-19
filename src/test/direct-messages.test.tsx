import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { afterEach, expect, it, vi } from 'vitest';
import { DirectMessages } from '@/components/direct-messages';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => {
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'or', 'order', 'limit', 'upsert', 'neq']) query[method] = () => query;
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
    return query;
  } },
}));

afterEach(() => { cleanup(); document.body.replaceChildren(); });

it('renders private messages in the channel and main panels without a dialog', async () => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  const sidebar = document.createElement('div');
  const main = document.createElement('div');
  document.body.append(sidebar, main);
  const setOpen = vi.fn();
  render(<DirectMessages user={{ id: 'member', user_metadata: {} } as User} onSignIn={vi.fn()} open setOpen={setOpen} sidebarTarget={sidebar} mainTarget={main}/>);

  expect(sidebar.querySelector('input')).toHaveAttribute('placeholder', 'Encontrar ou começar uma conversa');
  expect(await screen.findByRole('heading', { name: 'Pessoas' })).toBeInTheDocument();
  expect(main.querySelector('.direct-workspace')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar aos canais' }));
  expect(setOpen).toHaveBeenCalledWith(false);
});
