import { games } from "@/data/games";
export type GameActivity = { id: string; name?: string; startedAt: number; until: number };
export type GamePresence = {
  game?: string | null | undefined;
  gameName?: string | null | undefined;
  gameStartedAt?: number | undefined;
  gameUntil?: number | undefined;
};
export function cleanGameName(value: unknown) {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80)
    : "";
}
export function gameActivity(member: GamePresence | undefined, now = Date.now()) {
  if (
    !member ||
    typeof member.gameUntil !== "number" ||
    !Number.isFinite(member.gameUntil) ||
    member.gameUntil <= now
  )
    return null;
  const known = games.find((g) => g.id === member.game);
  const name = known?.name || (member.game === "custom" ? cleanGameName(member.gameName) : "");
  if (!name) return null;
  const startedAt =
    typeof member.gameStartedAt === "number" &&
    Number.isFinite(member.gameStartedAt) &&
    member.gameStartedAt > 0 &&
    member.gameStartedAt <= now
      ? member.gameStartedAt
      : null;
  return {
    id: member.game!,
    name,
    startedAt,
    until: member.gameUntil,
    image: known?.image,
    url: known?.url,
    manual: member.game === "custom",
  };
}
export function elapsedGameTime(startedAt: number, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
