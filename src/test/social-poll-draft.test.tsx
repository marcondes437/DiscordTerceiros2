import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SocialPoll } from "@/components/social-poll";
import { useSocialDraft } from "@/hooks/use-social";
import { parseSocialDraft, validPollOptions, type SocialPost } from "@/lib/social";
const backend = vi.hoisted(() => ({
  rpc: vi.fn(),
  results: { counts: [0, 0], total: 0, choice: null as number | null, closed: false },
  fail: false,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (name: string, args: any) => {
      backend.rpc(name, args);
      if (name === "social_vote") {
        if (backend.fail) return { data: null, error: { message: "closed" } };
        backend.results = { counts: [1, 0], total: 1, choice: args.p_choice, closed: false };
        return { data: null, error: null };
      }
      return { data: backend.results, error: null };
    },
  },
}));
const post = {
  id: "60000000-0000-4000-8000-000000000010",
  poll_options: ["Rabisco", "Slither"],
  poll_closes_at: new Date(Date.now() + 3600000).toISOString(),
} as SocialPost;
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  backend.fail = false;
  backend.results = { counts: [0, 0], total: 0, choice: null, closed: false };
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("shows aggregate results after voting and prevents another vote", async () => {
  render(<SocialPoll post={post} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Rabisco" })).not.toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: "Rabisco" }));
  expect(await screen.findByText("100%")).toBeInTheDocument();
  expect(screen.getByText(/1 voto/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Slither" })).not.toBeInTheDocument();
  expect(backend.rpc).toHaveBeenCalledWith("social_vote", { p_post: post.id, p_choice: 0 });
});
it("renders closed polls as results without offering voting", async () => {
  backend.results = { counts: [1, 1], total: 2, choice: null, closed: true };
  render(
    <SocialPoll post={{ ...post, poll_closes_at: new Date(Date.now() - 10000).toISOString() }} />,
  );
  expect(await screen.findByText("Encerrada", { exact: false })).toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByText("50%")).toHaveLength(2));
  expect(screen.queryByRole("button", { name: "Rabisco" })).not.toBeInTheDocument();
  expect(backend.rpc).not.toHaveBeenCalledWith("social_vote", expect.anything());
});
it("keeps drafts isolated between accounts and restores the original account's draft", () => {
  const { result, rerender } = renderHook(({ id }) => useSocialDraft(id), {
    initialProps: { id: "ana" },
  });
  act(() => result.current.update({ bodies: ["Texto da Ana"], options: ["Um", "Dois"] }));
  rerender({ id: "bia" });
  expect(result.current.draft.bodies).toEqual([""]);
  act(() => result.current.update({ bodies: ["Texto da Bia"] }));
  rerender({ id: "ana" });
  expect(result.current.draft.bodies).toEqual(["Texto da Ana"]);
  expect(result.current.draft.options).toEqual(["Um", "Dois"]);
});
it("recovers safely from malformed drafts and disallows empty or duplicate poll choices", () => {
  expect(parseSocialDraft("bad-json").bodies).toEqual([""]);
  expect(parseSocialDraft(JSON.stringify({ bodies: ["x".repeat(900)] })).bodies[0]).toHaveLength(
    500,
  );
  expect(validPollOptions(["Um", ""])).toBe(false);
  expect(validPollOptions(["Um", " um "])).toBe(false);
  expect(validPollOptions(["Um", "Dois"])).toBe(true);
});
it("ignores a late draft callback from a previous account", () => {
  const { result, rerender } = renderHook(({ id }) => useSocialDraft(id), {
    initialProps: { id: "ana" },
  });
  const oldUpdate = result.current.update;
  rerender({ id: "bia" });
  act(() => result.current.update({ bodies: ["Texto da Bia"] }));
  act(() => oldUpdate({ bodies: ["Resposta atrasada da Ana"] }));
  expect(result.current.draft.bodies).toEqual(["Texto da Bia"]);
});
