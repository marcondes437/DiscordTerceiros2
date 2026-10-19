import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CommunityPeople } from "@/components/community-people";
import type { Friendship } from "@/lib/friendships";
afterEach(cleanup);
const friendships: Friendship[] = [
  {
    id: "f",
    requester_id: "ana",
    recipient_id: "self",
    status: "pending",
    request_kind: "friendship",
  },
  {
    id: "m",
    requester_id: "joao",
    recipient_id: "self",
    status: "pending",
    request_kind: "message",
  },
];
const props = {
  people: [
    { id: "ana", display_name: "Ana" },
    { id: "joao", display_name: "João" },
  ],
  online: [],
  unreadIds: [],
  selfId: "self",
  connected: true,
  friendships,
  busy: false,
  onSelect: vi.fn(),
};
it("separates conversation requests and requires explicit friendship acceptance", () => {
  const onFriendAction = vi.fn();
  render(<CommunityPeople {...props} section="requests" onFriendAction={onFriendAction} />);
  expect(screen.getByRole("heading", { name: "Solicitações de mensagens" })).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Colega Ana" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Aceitar e adicionar amigo" }));
  expect(onFriendAction).toHaveBeenCalledWith("joao", "accept");
  expect(screen.queryByRole("textbox", { name: "Mensagem privada" })).not.toBeInTheDocument();
});
it("keeps friendship requests under pending and searches names without accents", () => {
  render(<CommunityPeople {...props} onFriendAction={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Pendentes/ }));
  expect(screen.getByRole("group", { name: "Colega Ana" })).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Colega João" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Adicionar amigos" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar pessoas" }), {
    target: { value: "JOAO" },
  });
  expect(screen.getByRole("group", { name: "Colega João" })).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Colega Ana" })).not.toBeInTheDocument();
});
it("sends only a textless conversation request for a nonfriend", () => {
  const onFriendAction = vi.fn();
  render(<CommunityPeople {...props} friendships={[]} onFriendAction={onFriendAction} />);
  fireEvent.click(screen.getByRole("button", { name: "Adicionar amigos" }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Colega Ana" })).getByRole("button", {
      name: "Solicitar conversa",
    }),
  );
  expect(onFriendAction).toHaveBeenCalledWith("ana", "request-message");
});
