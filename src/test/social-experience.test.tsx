import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import type { SocialPost } from "@/lib/social";
import { SocialExperience } from "@/components/social-experience";
const self = "60000000-0000-4000-8000-000000000001",
  other = "60000000-0000-4000-8000-000000000002",
  id = "60000000-0000-4000-8000-000000000010";
const state = vi.hoisted(() => ({
  posts: [] as any[],
  rpc: vi.fn(),
  write: vi.fn(),
  eq: vi.fn(),
  fail: false,
}));
vi.mock("@/components/social-site-shell", () => ({
  SocialSiteShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/community-auth", () => ({ CommunityAuth: () => null }));
vi.mock("@/components/gaming-media", () => ({ CapturePost: () => null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (name: string, args: any) => {
      state.rpc(name, args);
      if (name === "social_feed")
        return {
          data: state.posts.filter(
            (p) => !p.parent_id && (args.p_mode !== "salvos" || p.bookmarked),
          ),
          error: null,
        };
      if (name === "social_post_details")
        return { data: state.posts.filter((p) => args.p_ids.includes(p.id)), error: null };
      return { data: [], error: state.fail ? { message: "offline" } : null };
    },
    from: (table: string) => {
      const q: any = {};
      let op = "select",
        payload: any,
        filters: Record<string, unknown> = {};
      for (const method of ["select", "order", "limit", "range", "or"]) q[method] = () => q;
      q.eq = (column: string, value: unknown) => {
        state.eq(column, value);
        filters[column] = value;
        return q;
      };
      for (const method of ["insert", "update", "upsert", "delete"])
        q[method] = (body: any) => {
          op = method;
          payload = body;
          return q;
        };
      q.then = (resolve: any) => {
        if (op !== "select") state.write(table, op, payload);
        if (!state.fail && table === "social_bookmarks" && op !== "select")
          state.posts = state.posts.map((p) =>
            p.id === (payload?.post_id || filters["post_id"])
              ? { ...p, bookmarked: op === "insert" }
              : p,
          );
        const data =
          table === "social_profiles"
            ? [
                { id: "60000000-0000-4000-8000-000000000001", display_name: "Ana" },
                { id: "60000000-0000-4000-8000-000000000002", display_name: "Bia" },
              ]
            : table === "social_posts"
              ? op === "select"
                ? state.posts
                    .filter((p) => p.parent_id === filters["parent_id"])
                    .map((p) => ({ id: p.id }))
                : [{ id: filters["id"] }]
              : [];
        return Promise.resolve({
          data,
          error: state.fail && op !== "select" ? { message: "offline" } : null,
          count: 0,
        }).then(resolve);
      };
      return q;
    },
  },
}));
const makePost = (extra: Partial<SocialPost> = {}): SocialPost => ({
  id,
  author_id: other,
  author_name: "Bia",
  body: "Partida hoje #jogos",
  created_at: "2026-10-19T12:00:00Z",
  parent_id: null,
  quote_of: null,
  is_quote: false,
  edited_at: null,
  poll_options: null,
  poll_closes_at: null,
  like_count: 0,
  reply_count: 0,
  repost_count: 0,
  liked: false,
  reposted: false,
  bookmarked: false,
  pinned: false,
  ...extra,
});
const user = {
  id: self,
  user_metadata: { display_name: "Ana" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-10-19T12:00:00Z",
} as User;
beforeEach(() => {
  state.posts = [makePost()];
  state.fail = false;
  vi.clearAllMocks();
  localStorage.clear();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("publishes an entire thread in one operation and clears its saved draft only after success", async () => {
  render(<SocialExperience user={user} />);
  await screen.findByText("Partida hoje");
  fireEvent.change(screen.getByRole("textbox", { name: "Nova publicação" }), {
    target: { value: "Primeira parte" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar publicação à sequência" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Parte 2 da sequência" }), {
    target: { value: "Segunda parte" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Publicar sequência" }));
  await waitFor(() =>
    expect(state.rpc).toHaveBeenCalledWith(
      "social_publish",
      expect.objectContaining({ p_bodies: ["Primeira parte", "Segunda parte"] }),
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Nova publicação" })).toHaveValue(""),
  );
});
it("keeps a failed publication and its poll choices in the draft", async () => {
  render(<SocialExperience user={user} />);
  await screen.findByText("Partida hoje");
  fireEvent.change(screen.getByRole("textbox", { name: "Nova publicação" }), {
    target: { value: "Qual jogo?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Criar enquete" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Opção 1" }), {
    target: { value: "Rabisco" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Opção 2" }), {
    target: { value: "Slither" },
  });
  state.fail = true;
  fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
  await waitFor(() =>
    expect(state.rpc).toHaveBeenCalledWith(
      "social_publish",
      expect.objectContaining({ p_options: ["Rabisco", "Slither"] }),
    ),
  );
  expect(screen.getByRole("textbox", { name: "Nova publicação" })).toHaveValue("Qual jogo?");
  expect(screen.getByRole("textbox", { name: "Opção 1" })).toHaveValue("Rabisco");
});
it("opens the saved feed and saves a post for the current account", async () => {
  render(<SocialExperience user={user} />);
  await screen.findByText("Partida hoje");
  fireEvent.click(screen.getByRole("button", { name: "Salvar publicação" }));
  await waitFor(() =>
    expect(state.write).toHaveBeenCalledWith("social_bookmarks", "insert", {
      post_id: id,
      user_id: self,
    }),
  );
  await screen.findByRole("button", { name: "Remover dos salvos" });
  fireEvent.click(screen.getByRole("button", { name: "Salvos" }));
  await waitFor(() =>
    expect(state.rpc).toHaveBeenCalledWith(
      "social_feed",
      expect.objectContaining({ p_mode: "salvos" }),
    ),
  );
  expect(screen.getByText("Suas publicações salvas são privadas.")).toBeInTheDocument();
});
it("quotes the original post by reference rather than copying its body", async () => {
  render(<SocialExperience user={user} />);
  await screen.findByText("Partida hoje");
  fireEvent.keyDown(screen.getByRole("button", { name: "Repostar ou citar, 0 reposts" }), {
    key: "Enter",
  });
  fireEvent.click(screen.getByRole("menuitem", { name: "Citar com comentário" }));
  await screen.findByRole("button", { name: "Remover citação" });
  fireEvent.change(screen.getByRole("textbox", { name: "Nova publicação" }), {
    target: { value: "Eu participo!" },
  });
  await waitFor(() => expect(screen.getByRole("button", { name: "Publicar" })).not.toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
  await waitFor(() =>
    expect(state.rpc).toHaveBeenCalledWith(
      "social_publish",
      expect.objectContaining({ p_bodies: ["Eu participo!"], p_quote: id }),
    ),
  );
});
it("opens a conversation and publishes a reply to the selected post", async () => {
  render(<SocialExperience user={user} />);
  await screen.findByText("Partida hoje");
  fireEvent.click(screen.getByRole("button", { name: "Responder, 0 respostas" }));
  const dialog = await screen.findByRole("dialog", { name: "Conversa" });
  await within(dialog).findByText("Respostas");
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Nova publicação" }), {
    target: { value: "Estou dentro" },
  });
  await waitFor(() =>
    expect(within(dialog).getByRole("button", { name: "Publicar" })).not.toBeDisabled(),
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));
  await waitFor(() =>
    expect(state.rpc).toHaveBeenCalledWith(
      "social_publish",
      expect.objectContaining({ p_parent: id, p_bodies: ["Estou dentro"] }),
    ),
  );
});
it("offers edit and delete only for own posts and confirms deletion", async () => {
  state.posts = [makePost({ author_id: self, author_name: "Ana" })];
  render(<SocialExperience user={user} />);
  await screen.findByText("Partida hoje");
  fireEvent.keyDown(screen.getByRole("button", { name: "Mais opções da publicação de Ana" }), {
    key: "Enter",
  });
  fireEvent.click(screen.getByRole("menuitem", { name: "Excluir publicação" }));
  expect(state.write).not.toHaveBeenCalledWith("social_posts", "delete", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "Excluir para todos" }));
  await waitFor(() =>
    expect(state.write).toHaveBeenCalledWith("social_posts", "delete", undefined),
  );
  expect(state.eq).toHaveBeenCalledWith("author_id", self);
});
