import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NotificationBell, NotificationsProvider } from "@/components/notifications";
import { notificationHref, type SiteNotification } from "@/lib/notifications";
const fixtures = vi.hoisted(() => ({
  user: "40000000-0000-4000-8000-000000000002",
  rows: [] as SiteNotification[],
  callback: (() => {}) as () => void,
  remove: vi.fn(),
  failed: false,
}));
vi.mock("@/components/activity-presence", () => ({
  useActivityPresence: () => ({ user: fixtures.user ? { id: fixtures.user } : null }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const channel = {
        on: (_event: unknown, _filter: unknown, callback: () => void) => {
          fixtures.callback = callback;
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: (channel: unknown) => fixtures.remove(channel),
    from: () => {
      let user = "";
      let id = "";
      let unread = false;
      let head = false;
      let limit = 40;
      let update: { read_at: string } | undefined;
      const q = {
        select: (_fields: string, options?: { head?: boolean }) => {
          head = !!options?.head;
          return q;
        },
        eq: (field: string, value: string) => {
          if (field === "user_id") user = value;
          else if (field === "id") id = value;
          return q;
        },
        is: () => {
          unread = true;
          return q;
        },
        order: () => q,
        limit: (n: number) => {
          limit = n;
          return q;
        },
        update: (payload: { read_at: string }) => {
          update = payload;
          return q;
        },
        then: (resolve: (value: unknown) => unknown) => {
          let rows = fixtures.rows.filter(
            (n) => n.user_id === user && (!id || n.id === id) && (!unread || !n.read_at),
          );
          if (update && !fixtures.failed) {
            rows.forEach((n) => (n.read_at = update!.read_at));
          }
          return Promise.resolve({
            data: head ? null : rows.slice(0, limit).map((n) => ({ ...n })),
            count: rows.length,
            error: fixtures.failed ? { message: "Offline" } : null,
          }).then(resolve);
        },
      };
      return q;
    },
  },
}));
const actor = "40000000-0000-4000-8000-000000000001";
function note(id: string, kind: SiteNotification["kind"] = "message"): SiteNotification {
  return {
    id,
    user_id: fixtures.user,
    actor_id: actor,
    actor_name: "Ana",
    kind,
    message_id: actor,
    post_id: actor,
    invitation_id: actor,
    room_id: actor,
    game: "rabisco",
    created_at: "2026-10-19T10:00:00Z",
    read_at: null,
  };
}
beforeEach(() => {
  fixtures.rows = [];
  fixtures.user = "40000000-0000-4000-8000-000000000002";
  fixtures.failed = false;
  fixtures.remove.mockClear();
});
afterEach(cleanup);
it("shows real events, routes each notification and marks all as read", async () => {
  fixtures.rows = [note("a"), note("b", "post"), note("c", "game_invite")];
  render(
    <NotificationsProvider>
      <NotificationBell />
    </NotificationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Notificações, 3 não lidas" }));
  expect(
    await screen.findByRole("link", { name: /Ana enviou uma mensagem privada/ }),
  ).toHaveAttribute("href", `/comunidade?dm=${actor}`);
  expect(screen.getByRole("link", { name: /Ana publicou no Social/ })).toHaveAttribute(
    "href",
    `/social?post=${actor}`,
  );
  expect(screen.getByRole("link", { name: /Ana chamou você/ })).toHaveAttribute(
    "href",
    `/jogar?game=rabisco&room=${actor}`,
  );
  fireEvent.click(screen.getByRole("button", { name: "Marcar todas como lidas" }));
  await waitFor(() => expect(fixtures.rows.every((n) => !!n.read_at)).toBe(true));
  expect(await screen.findByRole("button", { name: "Notificações" })).toBeInTheDocument();
});
it("refreshes on realtime events, preserves read status and cleans up subscriptions", async () => {
  fixtures.rows = [note("a")];
  fixtures.rows[0].read_at = "2026-10-19T10:01:00Z";
  const page = render(
    <NotificationsProvider>
      <NotificationBell />
    </NotificationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Notificações" }));
  expect(await screen.findByRole("link", { name: /Ana enviou/ })).toBeInTheDocument();
  await act(async () => {
    fixtures.rows.unshift(note("b", "post"));
    fixtures.callback();
  });
  expect(
    await screen.findByRole("button", { name: "Notificações, 1 não lidas" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Não lidas/ }));
  expect(screen.queryByRole("link", { name: /Ana enviou/ })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Ana publicou/ })).toBeInTheDocument();
  page.unmount();
  expect(fixtures.remove).toHaveBeenCalled();
});
it("loads older unread notifications without falsely claiming the inbox is clear", async () => {
  fixtures.rows = Array.from({ length: 45 }, (_, i) => ({
    ...note(String(i)),
    read_at: i < 40 ? "2026-10-19T10:01:00Z" : null,
  }));
  render(
    <NotificationsProvider>
      <NotificationBell />
    </NotificationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Notificações, 5 não lidas" }));
  fireEvent.click(screen.getByRole("button", { name: /^Não lidas/ }));
  expect(screen.getByText(/Há notificações não lidas anteriores/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
  await waitFor(() => expect(screen.getAllByRole("link", { name: /Ana enviou/ })).toHaveLength(5));
});
it("keeps account data isolated and reports failures without losing stored notices", async () => {
  fixtures.rows = [note("a")];
  const { rerender } = render(
    <NotificationsProvider>
      <NotificationBell />
    </NotificationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Notificações, 1 não lidas" }));
  fixtures.failed = true;
  await act(async () => fixtures.callback());
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível atualizar");
  fixtures.failed = false;
  fixtures.user = "40000000-0000-4000-8000-000000000003";
  rerender(
    <NotificationsProvider>
      <NotificationBell />
    </NotificationsProvider>,
  );
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: /Ana enviou/ })).not.toBeInTheDocument(),
  );
});
it("never builds notification targets from arbitrary input", () => {
  expect(notificationHref({ ...note("a", "game_invite"), game: "invalid" as "rabisco" })).toBe(
    "/jogos",
  );
  expect(notificationHref({ ...note("a", "post"), post_id: "javascript:alert(1)" })).toBe(
    "/social",
  );
  expect(notificationHref({ ...note("a"), actor_id: null })).toBe("/comunidade");
});
