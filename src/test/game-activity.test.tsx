import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { gameActivity, cleanGameName, elapsedGameTime } from "@/lib/game-activity";
import { MemberGameActivity } from "@/components/member-game-activity";
import { GameActivityControl } from "@/components/game-activity-control";
const fixture = vi.hoisted(() => ({
  user: { id: "self" },
  online: [] as any[],
  classOnline: [] as any[],
  currentGame: null as any,
  setCustomGame: vi.fn(),
  stopGame: vi.fn(),
}));
vi.mock("@/components/activity-presence", () => ({ useActivityPresence: () => fixture }));
beforeEach(() => {
  fixture.online = [];
  fixture.classOnline = [];
  fixture.currentGame = null;
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("accepts known games and sanitized manual names but rejects expired and unknown activity", () => {
  expect(gameActivity({ game: "rabisco", gameUntil: 200 }, 100)?.name).toBe("Rabisco");
  expect(
    gameActivity({ game: "custom", gameName: " Roblox\n com amigos ", gameUntil: 200 }, 100)?.name,
  ).toBe("Roblox com amigos");
  expect(gameActivity({ game: "custom", gameName: "  ", gameUntil: 200 }, 100)).toBeNull();
  expect(gameActivity({ game: "unknown", gameUntil: 200 }, 100)).toBeNull();
  expect(gameActivity({ game: "rabisco", gameUntil: 99 }, 100)).toBeNull();
  expect(cleanGameName("x".repeat(120))).toHaveLength(80);
  expect(elapsedGameTime(1000, 3662000)).toBe("01:01:01");
});
it("shows the game beneath a member name and expires it without navigation", () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  render(
    <MemberGameActivity
      compact
      member={{ id: "a", name: "Ana", room: null, game: "rabisco", gameUntil: 110000 }}
    />,
  );
  expect(screen.getByText("Rabisco")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(15000));
  expect(screen.queryByText("Rabisco")).not.toBeInTheDocument();
});
it("shows a live elapsed timer in a profile and cleans up its timer", () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  fixture.online = [
    {
      id: "a",
      name: "Ana",
      room: null,
      game: "custom",
      gameName: "FiveM",
      gameStartedAt: 90000,
      gameUntil: 200000,
    },
  ];
  const view = render(<MemberGameActivity memberId="a" />);
  expect(screen.getByRole("region", { name: "Jogando FiveM" })).toBeInTheDocument();
  expect(screen.getByText("00:00:10")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.getByText("00:00:12")).toBeInTheDocument();
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it("does not show stale or offline games in a profile", () => {
  render(<MemberGameActivity memberId="a" />);
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
});
it("publishes a manual game only after explicit submission", () => {
  render(<GameActivityControl />);
  fireEvent.click(screen.getByRole("button", { name: "Minha atividade de jogo" }));
  expect(screen.getByRole("button", { name: "Exibir atividade" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Nome do jogo" }), {
    target: { value: "Roblox" },
  });
  expect(fixture.setCustomGame).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Exibir atividade" }));
  expect(fixture.setCustomGame).toHaveBeenCalledWith("Roblox");
});
it("lets the owner stop displaying a game", () => {
  fixture.currentGame = {
    id: "custom",
    name: "Valorant",
    startedAt: Date.now(),
    until: Date.now() + 60000,
  };
  render(<GameActivityControl />);
  fireEvent.click(screen.getByRole("button", { name: "Minha atividade de jogo" }));
  fireEvent.click(screen.getByRole("button", { name: "Limpar status" }));
  expect(fixture.stopGame).toHaveBeenCalledOnce();
});
