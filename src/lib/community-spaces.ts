export type Space = 'geral' | 'terceiro-a' | 'terceiro-b';
export const spaces = [
  { id: 'geral', name: 'Geral', badge: 'G' },
  { id: 'terceiro-a', name: 'Terceiro A', badge: 'A' },
  { id: 'terceiro-b', name: 'Terceiro B', badge: 'B' },
] as const;

export function memberClass(metadata: Record<string, unknown> | undefined): Space | null {
  const turma = metadata?.turma;
  return turma === 'terceiro-a' || turma === 'terceiro-b' ? turma : null;
}
export function visibleSpaces(turma: Space | null) {
  return spaces.filter((space) => space.id === 'geral' || space.id === turma);
}
export function spaceChannel(space: Space, channel: string) {
  return space === 'geral' ? channel : `${space}:${channel}`;
}
export function visibleRoom(room: string | null, space: Space) {
  return room && (space === 'geral' ? !room.includes(':') : room.startsWith(`${space}:`)) ? room : null;
}
