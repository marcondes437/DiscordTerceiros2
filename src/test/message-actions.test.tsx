import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MessageActions } from "@/components/message-actions";
import { MessageFeedback } from "@/components/message-feedback";
import type { MessageMark } from "@/hooks/use-message-marks";

const calls = vi.hoisted(() => ({ update: vi.fn(), insert: vi.fn(), eq: vi.fn(), failure: false }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const q: any = {};
      for (const method of ["select", "or", "order", "in"]) q[method] = () => q;
      q.update = (body: unknown) => {
        calls.update(table, body);
        return q;
      };
      q.insert = (body: unknown) => {
        calls.insert(table, body);
        return q;
      };
      q.eq = (key: string, value: string) => {
        calls.eq(key, value);
        return q;
      };
      q.then = (resolve: any) =>
        Promise.resolve({
          error: calls.failure ? { message: "offline" } : null,
          data:
            table === "community_friendships"
              ? [{ requester_id: "self", recipient_id: "friend" }]
              : table === "social_profiles"
                ? [{ id: "friend", display_name: "João" }]
                : [{ id: "message" }],
        }).then(resolve);
      return q;
    },
  },
}));
beforeEach(() => {
  calls.failure = false;
  vi.clearAllMocks();
});
afterEach(() => cleanup());
const base = {
  messageId: "message",
  kind: "channel" as const,
  userId: "self",
  marks: [] as MessageMark[],
  marksBusy: false,
  onToggle: vi.fn(),
  onEdited: vi.fn(),
  own: true,
  onHide: vi.fn(),
  content: "Texto original",
};
function openMenu() {
  fireEvent.keyDown(screen.getByRole("button", { name: "Mais opções da mensagem" }), {
    key: "Enter",
  });
}
it("offers own-message editing and saves only content with an owner filter", async () => {
  const edited = vi.fn();
  render(<MessageActions {...base} onEdited={edited} />);
  openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Editar mensagem" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Texto da mensagem" }), {
    target: { value: "Novo texto" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
  await waitFor(() => expect(edited).toHaveBeenCalledWith("Novo texto"));
  expect(calls.update).toHaveBeenCalledWith("community_messages", { content: "Novo texto" });
  expect(calls.eq).toHaveBeenCalledWith("id", "message");
  expect(calls.eq).toHaveBeenCalledWith("user_id", "self");
});
it("never offers editing another person's message", () => {
  render(<MessageActions {...base} own={false} />);
  openMenu();
  expect(screen.queryByRole("menuitem", { name: "Editar mensagem" })).not.toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Excluir mensagem" })).toBeInTheDocument();
});
it("keeps unsaved text open if editing fails", async () => {
  calls.failure = true;
  render(<MessageActions {...base} />);
  openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Editar mensagem" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Texto da mensagem" }), {
    target: { value: "Não perder" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar");
  expect(screen.getByRole("textbox", { name: "Texto da mensagem" })).toHaveValue("Não perder");
});
it("forwards to an accepted friend selected by name, only after confirmation", async () => {
  render(<MessageActions {...base} />);
  openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Encaminhar" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar amigo para encaminhar" }), {
    target: { value: "joao" },
  });
  fireEvent.click(await screen.findByRole("button", { name: "João" }));
  expect(calls.insert).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Encaminhar" }));
  await waitFor(() =>
    expect(calls.insert).toHaveBeenCalledWith("direct_messages", {
      sender_id: "self",
      recipient_id: "friend",
      body: "↪ Encaminhada\nTexto original",
    }),
  );
  expect(calls.eq).toHaveBeenCalledWith("status", "accepted");
});
it("toggles quick reactions, pins and private favorites", () => {
  const toggle = vi.fn();
  render(<MessageActions {...base} onToggle={toggle} />);
  fireEvent.click(screen.getByRole("button", { name: "Reagir com 😂" }));
  expect(toggle).toHaveBeenCalledWith("reaction", "😂");
  openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Fixar mensagem" }));
  expect(toggle).toHaveBeenCalledWith("pin");
  openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Favoritar mensagem" }));
  expect(toggle).toHaveBeenCalledWith("favorite");
});
it("shows reaction counts and personal selection without rendering another user's favorite", () => {
  const mark = {
    id: "one",
    channel_message_id: "message",
    direct_message_id: null,
    value: "👍",
    kind: "reaction" as const,
    user_id: "self",
  };
  render(
    <MessageFeedback
      marks={[
        mark,
        { ...mark, id: "two", user_id: "other" },
        { ...mark, id: "three", kind: "favorite", value: "", user_id: "other" },
      ]}
      userId="self"
      busy={false}
      onToggle={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "Reagir com 👍, 2 reações" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.queryByText("Favorita")).not.toBeInTheDocument();
});
