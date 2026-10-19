import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DirectMessages } from "@/components/direct-messages";

const fixtures = vi.hoisted(() => ({
  friends: [] as { id: string; requester_id: string; recipient_id: string; status: string }[],
  insert: vi.fn(),
  messages: [] as {
    id: string;
    sender_id: string;
    recipient_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
  }[],
  remove: vi.fn(),
  equal: vi.fn(),
}));
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  fixtures.friends = [];
  fixtures.insert.mockClear();
  fixtures.messages = [];
  fixtures.remove.mockClear();
  fixtures.equal.mockClear();
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
      query.delete = () => {
        fixtures.remove(table);
        return query;
      };
      query.eq = (column: string, value: string) => {
        fixtures.equal(column, value);
        return query;
      };
      query.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data:
            table === "social_profiles"
              ? [{ id: "colleague", display_name: "Colega" }]
              : table === "community_friendships"
                ? fixtures.friends
                : table === "direct_messages"
                  ? fixtures.messages
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

it('opens the theme store directly below message requests and returns to friends', async () => {
  const sidebar = document.createElement('div');
  const main = document.createElement('div');
  document.body.append(sidebar, main);
  const choose = vi.fn();
  render(<DirectMessages user={{id:'member',user_metadata:{}} as User} onSignIn={vi.fn()} open setOpen={vi.fn()} sidebarTarget={sidebar} mainTarget={main} onSelectSkin={choose}/>);
  const store = screen.getByRole('button',{name:'Loja de temas Novo'});
  expect(screen.getByRole('button',{name:'Solicitações de mensagens'}).nextElementSibling).toBe(store);
  fireEvent.click(store);
  expect(screen.getByRole('heading',{name:'Loja de temas'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Usar tema Ocean'}));
  expect(choose).toHaveBeenCalledWith('ocean');
  fireEvent.click(screen.getByRole('button',{name:'Voltar para amigos'}));
  expect(screen.queryByRole('heading',{name:'Loja de temas'})).not.toBeInTheDocument();
});

it("lets the sender delete their own message without exposing deletion on someone else's", async () => {
  fixtures.friends = [
    { id: "friend", requester_id: "member", recipient_id: "colleague", status: "accepted" },
  ];
  fixtures.messages = [
    {
      id: "own",
      sender_id: "member",
      recipient_id: "colleague",
      body: "Minha mensagem",
      created_at: "2026-10-19T10:00:00Z",
      read_at: "2026-10-19T10:01:00Z",
    },
    {
      id: "other",
      sender_id: "colleague",
      recipient_id: "member",
      body: "Mensagem do colega",
      created_at: "2026-10-19T10:02:00Z",
      read_at: "2026-10-19T10:03:00Z",
    },
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
  expect(await screen.findByText("Minha mensagem")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Apagar minha mensagem" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Apagar minha mensagem" }));
  await waitFor(() => expect(screen.queryByText("Minha mensagem")).not.toBeInTheDocument());
  expect(screen.getByText("Mensagem do colega")).toBeInTheDocument();
  expect(fixtures.remove).toHaveBeenCalledWith("direct_messages");
  expect(fixtures.equal).toHaveBeenCalledWith("id", "own");
  expect(fixtures.equal).toHaveBeenCalledWith("sender_id", "member");
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
