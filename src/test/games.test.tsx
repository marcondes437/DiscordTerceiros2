import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { games, filterGames, configuredGameUrl } from '@/data/games';
import { GameCard } from '@/components/game-card';

afterEach(cleanup);
it('opens a configured game directly from its cover', () => {
  const game = { ...games[0]!, url: 'https://example.com/rabisco' };
  render(<GameCard game={game}/>);
  const link = screen.getByRole('link', { name: `Jogar ${game.name} (nova aba)` });
  expect(link).toHaveAttribute('href', game.url);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link.querySelector('img')).toHaveAttribute('src', game.image);
});

it('combines search and category filters while ignoring accents', () => {
  expect(filterGames('acao', 'Todos').map(g => g.id)).toContain('slithersenai');
  expect(filterGames('Rabisco', 'Criatividade').map(g => g.id)).toEqual(['rabisco']);
  expect(filterGames('Rabisco', 'Ação')).toEqual([]);
  expect(filterGames('', 'Todos')).toHaveLength(games.length);
});

it('contains only the two community games and does not invent links', () => {
  expect(games.map(g => g.name)).toEqual(['Rabisco', 'SlitherSenai']);
  render(<GameCard game={{ ...games[0]!, url: null }}/>);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Rabisco — em breve')).toBeInTheDocument();
  expect(configuredGameUrl('')).toBeNull();
  expect(configuredGameUrl('javascript:alert(1)')).toBeNull();
  expect(configuredGameUrl('https://example.com/rabisco')).toBe('https://example.com/rabisco');
});
