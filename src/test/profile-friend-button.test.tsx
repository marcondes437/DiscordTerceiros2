import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Friendship } from "@/lib/friendships";
import { ProfileFriendButton } from "@/components/profile-friend-button";
const fixture = vi.hoisted(() => ({
  rows: [] as Friendship[],
  act: vi.fn(),
  loading: false,
  busy: false,
}));
vi.mock("@/components/activity-presence", () => ({
  useActivityPresence: () => ({ user: { id: "self" } }),
}));
vi.mock("@/hooks/use-friendships", () => ({ useFriendships: () => ({ ...fixture, error: "" }) }));
afterEach(cleanup);
beforeEach(() => {
  fixture.rows = [];
  fixture.act.mockClear();
  fixture.loading = false;
  fixture.busy = false;
});
it("requests friendship from the profile icon and disables duplicate requests", () => {
  const { rerender } = render(<ProfileFriendButton id="ana" name="Ana" />);
  fireEvent.click(screen.getByRole("button", { name: "Adicionar Ana como amigo" }));
  expect(fixture.act).toHaveBeenCalledWith("ana", "request");
  fixture.rows = [{ id: "a", requester_id: "self", recipient_id: "ana", status: "pending" }];
  rerender(<ProfileFriendButton id="ana" name="Ana" />);
  expect(screen.getByRole("button", { name: "Pedido de amizade enviado para Ana" })).toBeDisabled();
});
it("accepts incoming requests and does not offer adding an existing friend or yourself", () => {
  fixture.rows = [{ id: "a", requester_id: "ana", recipient_id: "self", status: "pending" }];
  const { rerender } = render(<ProfileFriendButton id="ana" name="Ana" />);
  fireEvent.click(screen.getByRole("button", { name: "Aceitar amizade de Ana" }));
  expect(fixture.act).toHaveBeenCalledWith("ana", "accept");
  fixture.rows = [{ ...fixture.rows[0], status: "accepted" }];
  rerender(<ProfileFriendButton id="ana" name="Ana" />);
  expect(screen.getByRole("button", { name: "Você e Ana já são amigos" })).toBeDisabled();
  rerender(<ProfileFriendButton id="self" name="Eu" />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
