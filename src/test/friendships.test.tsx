import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CommunityPeople } from "@/components/community-people";
import { conversationIds, friendshipState, type Friendship } from "@/lib/friendships";
afterEach(cleanup);
const rows: Friendship[] = [
  { id: "a", requester_id: "self", recipient_id: "ana", status: "pending" },
  { id: "b", requester_id: "bia", recipient_id: "self", status: "pending" },
];
const people = [
  { id: "ana", display_name: "Ana" },
  { id: "bia", display_name: "Bia" },
  { id: "carla", display_name: "Carla" },
];
it("distinguishes incoming, outgoing and accepted friendships in both directions", () => {
  expect(friendshipState(rows, "self", "ana")).toBe("outgoing");
  expect(friendshipState(rows, "self", "bia")).toBe("incoming");
  expect(friendshipState(rows, "carla", "bia")).toBe("none");
  expect(friendshipState([{ ...rows[0], status: "accepted" }], "ana", "self")).toBe("friend");
  expect([...conversationIds([], "self")]).toEqual([]);
  expect([
    ...conversationIds(
      [
        { sender_id: "self", recipient_id: "ana" },
        { sender_id: "ana", recipient_id: "self" },
        { sender_id: "carla", recipient_id: "bia" },
      ],
      "self",
    ),
  ]).toEqual(["ana"]);
});
it("keeps strangers and pending requests out of friends and exposes consent actions", () => {
  const onSelect = vi.fn();
  const onFriendAction = vi.fn();
  render(
    <CommunityPeople
      selfId="self"
      friendships={rows}
      busy={false}
      people={people}
      online={people.map((p) => ({ id: p.id, name: p.display_name, room: null }))}
      connected
      unreadIds={[]}
      onSelect={onSelect}
      onFriendAction={onFriendAction}
    />,
  );
  expect(screen.queryByRole("button", { name: /Conversar com/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Pendentes/ }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Colega Bia" })).getByRole("button", {
      name: "Aceitar",
    }),
  );
  expect(onFriendAction).toHaveBeenLastCalledWith("bia", "accept");
  fireEvent.click(
    within(screen.getByRole("group", { name: "Colega Bia" })).getByRole("button", {
      name: "Recusar",
    }),
  );
  expect(onFriendAction).toHaveBeenLastCalledWith("bia", "remove");
  fireEvent.click(
    within(screen.getByRole("group", { name: "Colega Ana" })).getByRole("button", {
      name: "Cancelar pedido",
    }),
  );
  expect(onFriendAction).toHaveBeenLastCalledWith("ana", "remove");
  fireEvent.click(screen.getByRole("button", { name: "Adicionar amigos" }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Colega Carla" })).getByRole("button", {
      name: "Adicionar amigo",
    }),
  );
  expect(onFriendAction).toHaveBeenLastCalledWith("carla", "request");
  expect(onSelect).not.toHaveBeenCalled();
});
it("removes the send action when friendship disappears", () => {
  const props = {
    selfId: "self",
    busy: false,
    people,
    online: [],
    connected: true,
    unreadIds: [],
    onSelect: vi.fn(),
    onFriendAction: vi.fn(),
  };
  const { rerender } = render(
    <CommunityPeople {...props} friendships={[{ ...rows[0], status: "accepted" }]} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Todos" }));
  fireEvent.click(screen.getByRole("button", { name: "Conversar com Ana" }));
  expect(props.onSelect).toHaveBeenCalledWith("ana");
  fireEvent.click(screen.getByRole("button", { name: "Remover amigo" }));
  expect(props.onFriendAction).toHaveBeenCalledWith("ana", "remove");
  rerender(<CommunityPeople {...props} friendships={[]} />);
  expect(screen.queryByRole("button", { name: "Conversar com Ana" })).not.toBeInTheDocument();
});
