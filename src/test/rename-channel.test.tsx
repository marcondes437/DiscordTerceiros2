import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RenameChannel } from '@/components/rename-channel';
import { DeletedChannels } from '@/components/deleted-channels';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each(['text', 'voice'] as const)('renames a %s channel without changing its identifier', async kind => {
  mocks.rpc.mockResolvedValue({ error: null });
  const onClose = vi.fn();
  const onSaved = vi.fn().mockResolvedValue(undefined);
  render(<RenameChannel target={{ id: 'geral', kind, name: 'Geral' }} userId="member" onClose={onClose} onSaved={onSaved}/>);
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome do canal' }), { target: { value: '  Novo nome  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(mocks.rpc).toHaveBeenCalledWith('rename_community_channel', { p_channel_id: 'geral', p_kind: kind, p_name: 'Novo nome' });
  expect(onSaved).toHaveBeenCalled();
});

it('keeps the edited name available when saving fails', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'Connection failed' } });
  const onClose = vi.fn();
  render(<RenameChannel target={{ id: 'geral', kind: 'text', name: 'Geral' }} userId="member" onClose={onClose} onSaved={vi.fn()}/>);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Nova conversa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível renomear');
  expect(screen.getByRole('textbox')).toHaveValue('Nova conversa');
  expect(onClose).not.toHaveBeenCalled();
});

it('requires confirmation before removing a channel from the list', async () => {
  mocks.rpc.mockResolvedValue({ error: null });
  const onClose = vi.fn();
  render(<RenameChannel target={{ id: 'geral', kind: 'text', name: 'Geral' }} userId="member" onClose={onClose} onSaved={vi.fn().mockResolvedValue(undefined)}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Excluir canal' }));
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'Excluir Geral?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(mocks.rpc).toHaveBeenCalledWith('set_community_channel_archived', { p_channel_id: 'geral', p_kind: 'text', p_name: 'Geral', p_archived: true });
});

it('restores a deleted voice channel', async () => {
  mocks.rpc.mockResolvedValue({ error: null });
  const onRestored = vi.fn().mockResolvedValue(undefined);
  render(<DeletedChannels open onOpenChange={vi.fn()} channels={[{ channel_id: 'conexao-livre', kind: 'voice', name: 'Sala', archived: true }]} onRestored={onRestored}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
  await waitFor(() => expect(onRestored).toHaveBeenCalled());
  expect(mocks.rpc).toHaveBeenCalledWith('set_community_channel_archived', { p_channel_id: 'conexao-livre', p_kind: 'voice', p_name: 'Sala', p_archived: false });
});
