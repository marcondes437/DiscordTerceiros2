import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CommunityPeople } from "@/components/community-people";
afterEach(cleanup);
const props = {
  people: [
    { id: "ana", display_name: "Ana" },
    { id: "bia", display_name: "Bia" },
  ],
  online: [{ id: "ana", name: "Ana", room: "estudos" }],
  unreadIds: ["bia"],
  connected: true,
  selfId: "self",
  friendships: [
    { id: "a", requester_id: "self", recipient_id: "ana", status: "accepted" as const },
    { id: "b", requester_id: "bia", recipient_id: "self", status: "accepted" as const },
  ],
  busy: false,
  onFriendAction: vi.fn(),
};
it("filters real presence, the directory and unread conversations", () => {
  render(<CommunityPeople {...props} onSelect={vi.fn()} />);
  const main = within(screen.getByRole("main"));
  expect(main.getByRole("button", { name: /Conversar com Ana/ })).toBeInTheDocument();
  expect(main.queryByRole("button", { name: /Conversar com Bia/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Todos" }));
  expect(main.getByRole("button", { name: /Conversar com Bia/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Não lidas/ }));
  expect(main.queryByRole("button", { name: /Conversar com Ana/ })).not.toBeInTheDocument();
  expect(main.getByRole("button", { name: /Conversar com Bia/ })).toBeInTheDocument();
});
it("opens conversations from the list and live activity and focuses search", () => {
  const onSelect = vi.fn();
  render(<CommunityPeople {...props} onSelect={onSelect} />);
  fireEvent.click(
    within(screen.getByRole("main")).getByRole("button", { name: /Conversar com Ana/ }),
  );
  expect(onSelect).toHaveBeenLastCalledWith("ana");
  fireEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: /Ana/ }));
  expect(onSelect).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Adicionar amigos" }));
  expect(screen.getByRole("textbox", { name: "Buscar pessoas" })).toHaveFocus();
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar pessoas" }), {
    target: { value: "Inexistente" },
  });
  expect(screen.getByText("Ninguém com esse nome.")).toBeInTheDocument();
});
it("shows connection and empty states without inventing activity", () => {
  const { rerender } = render(
    <CommunityPeople {...props} connected={false} online={[]} onSelect={vi.fn()} />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  rerender(<CommunityPeople {...props} online={[]} unreadIds={[]} onSelect={vi.fn()} />);
  expect(screen.getByText("Seus amigos aparecem aqui.")).toBeInTheDocument();
  expect(screen.getByText("Por enquanto, tudo tranquilo.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Não lidas" }));
  expect(screen.getByText("Tudo em dia por aqui.")).toBeInTheDocument();
});
