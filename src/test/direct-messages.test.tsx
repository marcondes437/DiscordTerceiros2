import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DirectMessages } from "@/components/direct-messages";

const fixtures = vi.hoisted(() => ({
  friends: [] as { id: string; requester_id: string; recipient_id: string; status: string }[],
  insert: vi.fn(),
}));
beforeEach(() => {
  fixtures.friends = [];
  fixtures.insert.mockClear();
});
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ["select", "or", "order", "limit", "upsert", "neq"])
        query[method] = () => query;
      query.insert = (payload: unknown) => {
        fixtures.insert(table, payload);
        return query;
      };
      query.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data:
            table === "social_profiles"
              ? [{ id: "colleague", display_name: "Colega" }]
              : table === "community_friendships"
                ? fixtures.friends
                : [],
          error: null,
        }).then(resolve);
      return query;
    },
  },
}));

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

it("renders private messages in the channel and main panels without a dialog", async () => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  const sidebar = document.createElement("div");
  const main = document.createElement("div");
  document.body.append(sidebar, main);
  const setOpen = vi.fn();
  render(
    <DirectMessages
      user={{ id: "member", user_metadata: {} } as User}
      onSignIn={vi.fn()}
      open
      setOpen={setOpen}
      sidebarTarget={sidebar}
      mainTarget={main}
    />,
  );

  expect(sidebar.querySelector("input")).toHaveAttribute(
    "placeholder",
    "Encontrar ou começar uma conversa",
  );
  expect(await screen.findByRole("heading", { name: "Amigos" })).toBeInTheDocument();
  expect(main.querySelector(".direct-workspace")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Voltar aos canais" }));
  expect(setOpen).toHaveBeenCalledWith(false);
});

it("does not turn a newly registered colleague into an inbox conversation", async () => {
  const sidebar = document.createElement("div");
  const main = document.createElement("div");
  document.body.append(sidebar, main);
  render(
    <DirectMessages
      user={{ id: "member", user_metadata: {} } as User}
      onSignIn={vi.fn()}
      open
      setOpen={vi.fn()}
      sidebarTarget={sidebar}
      mainTarget={main}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Adicionar amigos" }));
  expect(await screen.findByRole("group", { name: "Colega Colega" })).toBeInTheDocument();
  expect(within(sidebar).queryByRole("button", { name: /Colega/ })).not.toBeInTheDocument();
  expect(sidebar).toHaveTextContent("Suas conversas aparecem aqui depois da primeira mensagem.");
});

it("blocks the composer and programmatic submit for a nonfriend opened from a profile", async () => {
  const sidebar = document.createElement("div");
  const main = document.createElement("div");
  document.body.append(sidebar, main);
  render(
    <DirectMessages
      user={{ id: "member", user_metadata: {} } as User}
      requestedRecipient="colleague"
      onSignIn={vi.fn()}
      open
      setOpen={vi.fn()}
      sidebarTarget={sidebar}
      mainTarget={main}
    />,
  );
  expect(await screen.findByRole("button", { name: "Adicionar amigo" })).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "Mensagem privada" });
  expect(input).toBeDisabled();
  fireEvent.change(input, { target: { value: "Não autorizado" } });
  fireEvent.submit(input.closest("form")!);
  expect(fixtures.insert).not.toHaveBeenCalled();
  expect(within(sidebar).queryByRole("button", { name: /Colega/ })).not.toBeInTheDocument();
});

it("unlocks sending only after friendship is accepted", async () => {
  fixtures.friends = [
    { id: "friend", requester_id: "member", recipient_id: "colleague", status: "accepted" },
  ];
  const sidebar = document.createElement("div");
  const main = document.createElement("div");
  document.body.append(sidebar, main);
  render(
    <DirectMessages
      user={{ id: "member", user_metadata: {} } as User}
      requestedRecipient="colleague"
      onSignIn={vi.fn()}
      open
      setOpen={vi.fn()}
      sidebarTarget={sidebar}
      mainTarget={main}
    />,
  );
  const input = await screen.findByRole("textbox", { name: "Mensagem privada" });
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: "Oi, amigo" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem privada" }));
  await waitFor(() =>
    expect(fixtures.insert).toHaveBeenCalledWith("direct_messages", {
      sender_id: "member",
      recipient_id: "colleague",
      body: "Oi, amigo",
    }),
  );
});
