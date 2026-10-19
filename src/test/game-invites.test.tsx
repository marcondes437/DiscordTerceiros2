import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GameInviteFriends } from "@/components/game-invite-friends";
const mocks = vi.hoisted(() => ({
  ids: vi.fn(),
  insert: vi.fn(),
  rows: [
    { id: "a", requester_id: "self", recipient_id: "ana", status: "accepted" },
    { id: "b", requester_id: "self", recipient_id: "bia", status: "pending" },
  ],
}));
vi.mock("@/hooks/use-friendships", () => ({
  useFriendships: () => ({ rows: mocks.rows, loading: false, error: "" }),
}));
vi.mock("@/lib/gaming", () => ({
  gamingDb: {
    from: (table: string) => {
      const q = {
        select: () => q,
        in: (_field: string, ids: string[]) => {
          mocks.ids(ids);
          return q;
        },
        order: () => q,
        eq: () => q,
        insert: (payload: unknown) => {
          mocks.insert(table, payload);
          return q;
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data: table === "social_profiles" ? [{ id: "ana", display_name: "Ana" }] : [],
            error: null,
          }).then(resolve),
      };
      return q;
    },
  },
}));
afterEach(() => {
  cleanup();
  mocks.insert.mockClear();
  mocks.ids.mockClear();
});
it("lets the player choose an accepted friend and sends a single targeted invitation", async () => {
  render(<GameInviteFriends roomId="room" userId="self" />);
  fireEvent.click(screen.getByRole("button", { name: "Convidar amigos" }));
  expect(await screen.findByRole("button", { name: "Convidar Ana" })).toBeInTheDocument();
  expect(mocks.ids).toHaveBeenCalledWith(["ana"]);
  expect(screen.queryByText("Bia")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Convidar Ana" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Convidar Ana" })).toBeDisabled());
  expect(mocks.insert).toHaveBeenCalledWith("gaming_invitations", {
    room_id: "room",
    sender_id: "self",
    recipient_id: "ana",
  });
  fireEvent.click(screen.getByRole("button", { name: "Convidar Ana" }));
  expect(mocks.insert).toHaveBeenCalledTimes(1);
});
