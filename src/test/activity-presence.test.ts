import { describe, it, expect } from "vitest";
import { mergeActivity } from "@/components/activity-presence";
describe("activity presence", () => {
  it("preserves a manual game across scopes and prefers the newest game across tabs", () => {
    const [member] = mergeActivity(
      [
        { id: "a", name: "Ana", room: null, game: "rabisco", gameStartedAt: 10, gameUntil: 200 },
        {
          id: "a",
          name: "Ana",
          room: "conexao-livre",
          game: "custom",
          gameName: "Roblox",
          gameStartedAt: 20,
          gameUntil: 200,
        },
        { id: "a", name: "Ana", room: null, game: "rabisco", gameStartedAt: 10, gameUntil: 200 },
      ],
      100,
    );
    expect(member).toMatchObject({
      game: "custom",
      gameName: "Roblox",
      gameStartedAt: 20,
      room: "conexao-livre",
    });
  });
  it("deduplicates tabs while preserving calls and valid games", () => {
    const members = mergeActivity(
      [
        { id: "a", name: "Ana", room: "conexao-livre" },
        { id: "a", name: "Ana", room: null, game: "rabisco", gameUntil: 200 },
        { id: "b", name: "Bia", room: null, game: "slithersenai", gameUntil: 200 },
      ],
      100,
    );
    expect(members).toHaveLength(2);
    expect(members[0]).toMatchObject({ room: "conexao-livre", game: "rabisco" });
    expect(members[1]?.game).toBe("slithersenai");
  });
  it("clears expired and unknown games, and disconnected members disappear", () => {
    expect(
      mergeActivity([{ id: "a", name: "Ana", room: null, game: "rabisco", gameUntil: 99 }], 100)[0]
        ?.game,
    ).toBeNull();
    expect(
      mergeActivity([{ id: "a", name: "Ana", room: null, game: "unknown", gameUntil: 200 }], 100)[0]
        ?.game,
    ).toBeNull();
    expect(mergeActivity([])).toEqual([]);
  });
});
