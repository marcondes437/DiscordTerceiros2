import { describe, it, expect } from "vitest";
import { mergeActivity } from "@/components/activity-presence";
describe("activity presence", () => {
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
