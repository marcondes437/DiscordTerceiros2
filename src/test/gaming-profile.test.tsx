import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toggleFavorite: vi.fn(),
  refreshProfile: vi.fn(async () => {}),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/social-site-shell", () => ({
  SocialSiteShell: ({ children }: any) => <main>{children}</main>,
}));
vi.mock("@/components/community-auth", () => ({ CommunityAuth: () => null }));
vi.mock("@/components/gaming-media", () => ({
  GamingGallery: () => <p>Galeria de capturas</p>,
  GamingAchievements: () => <p>Medalhas desbloqueadas</p>,
}));
vi.mock("@/hooks/use-game-cosmetics", () => ({ useGameCosmetics: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/community-profile-editor", () => ({
  CommunityProfileEditor: ({ onClose }: any) => (
    <section aria-label="Editar perfil">
      <button onClick={onClose}>Voltar</button>
    </section>
  ),
}));
vi.mock("@/components/activity-presence", () => ({
  useActivityPresence: () => ({ connected: true, online: [], classOnline: [] }),
}));
vi.mock("@/hooks/use-gaming-account", () => ({
  useGamingAccount: () => ({
    user: { id: "member", created_at: "2026-10-01T12:00:00Z" },
    profile: { bio: "Jogando com a turma.", banner_color: "#303030" },
    name: "Samuel",
    favorites: ["rabisco"],
    busy: false,
    error: "",
    ...mocks,
  }),
}));
import { GamingProfile } from "@/routes/perfil-jogos";
afterEach(cleanup);

it("switches profile sections using clicks and keyboard without inventing achievements", () => {
  render(<GamingProfile />);
  expect(screen.getByRole("heading", { name: "Samuel" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Conquistas" }));
  expect(screen.getByRole("tabpanel")).toHaveTextContent("Medalhas desbloqueadas");
  fireEvent.keyDown(screen.getByRole("tab", { name: "Conquistas" }), { key: "ArrowRight" });
  expect(screen.getByRole("tab", { name: "Capturas" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel")).toHaveTextContent("Galeria de capturas");
});

it("keeps favorites and profile editing connected to the existing actions", () => {
  render(<GamingProfile />);
  fireEvent.click(screen.getByRole("button", { name: "Remover Rabisco dos favoritos" }));
  expect(mocks.toggleFavorite).toHaveBeenCalledWith("rabisco");
  fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
  expect(screen.getByRole("region", { name: "Editar perfil" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
  expect(screen.getByRole("heading", { name: "Samuel" })).toBeInTheDocument();
});
