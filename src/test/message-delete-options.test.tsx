import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MessageDeleteOptions } from "@/components/message-delete-options";
import { useHiddenMessages } from "@/hooks/use-hidden-messages";
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
function Example({ user = "alice" }: { user?: string }) {
  const { hidden, hide } = useHiddenMessages(user);
  return (
    <>
      {!hidden.channel.includes("message") && <p>Mensagem do canal</p>}
      {!hidden.direct.includes("message") && <p>Mensagem privada</p>}
      <button onClick={() => hide("channel", "message")}>Ocultar canal</button>
      <button onClick={() => hide("direct", "message")}>Ocultar privada</button>
    </>
  );
}
it("only offers personal deletion on another person’s message", () => {
  const hide = vi.fn();
  const everyone = vi.fn();
  render(<MessageDeleteOptions own={false} onHide={hide} onDeleteForEveryone={everyone} />);
  fireEvent.click(screen.getByRole("button", { name: "Apagar mensagem" }));
  expect(screen.queryByRole("button", { name: /^Apagar para todos/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Apagar para mim/ }));
  expect(hide).toHaveBeenCalledOnce();
  expect(everyone).not.toHaveBeenCalled();
});
it("offers both choices for own messages and keeps failures reviewable", async () => {
  const everyone = vi.fn().mockResolvedValue(false);
  const hide = vi.fn();
  render(<MessageDeleteOptions own onHide={hide} onDeleteForEveryone={everyone} />);
  fireEvent.click(screen.getByRole("button", { name: "Apagar mensagem" }));
  expect(screen.getByRole("button", { name: /^Apagar para mim/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Apagar para todos/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível apagar");
  expect(hide).not.toHaveBeenCalled();
  everyone.mockResolvedValue(true);
  fireEvent.click(screen.getByRole("button", { name: /^Apagar para todos/ }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("restores personal deletion after remount without hiding messages for another account or message type", () => {
  const first = render(<Example />);
  fireEvent.click(screen.getByRole("button", { name: "Ocultar canal" }));
  expect(screen.queryByText("Mensagem do canal")).not.toBeInTheDocument();
  expect(screen.getByText("Mensagem privada")).toBeInTheDocument();
  first.unmount();
  const second = render(<Example />);
  expect(screen.queryByText("Mensagem do canal")).not.toBeInTheDocument();
  second.rerender(<Example user="bob" />);
  expect(screen.getByText("Mensagem do canal")).toBeInTheDocument();
  second.rerender(<Example user="alice" />);
  expect(screen.queryByText("Mensagem do canal")).not.toBeInTheDocument();
});
it("hides for the current session when storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw Error("denied");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("denied");
  });
  render(<Example />);
  fireEvent.click(screen.getByRole("button", { name: "Ocultar privada" }));
  expect(screen.queryByText("Mensagem privada")).not.toBeInTheDocument();
  expect(screen.getByText("Mensagem do canal")).toBeInTheDocument();
});
