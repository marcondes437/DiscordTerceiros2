import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useCommunityTheme } from "@/hooks/use-community-theme";
import { CommunityThemeStore } from "@/components/community-theme-store";
import { communitySkinKey } from "@/lib/community-themes";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});
function Experience({ userId = "alice" }: { userId?: string }) {
  const { skin, theme, selectSkin, storageNotice } = useCommunityTheme(userId);
  return (
    <div data-testid="community" data-community-skin={skin.id} data-community-theme={theme}>
      <CommunityThemeStore
        selectedId={skin.id}
        onSelect={selectSkin}
        storageNotice={storageNotice}
      />
    </div>
  );
}
it("applies a theme immediately, restores it after remount and keeps account choices separate", () => {
  const first = render(<Experience />);
  fireEvent.click(screen.getByRole("button", { name: "Usar tema Fallout 4 Terminal" }));
  expect(screen.getByTestId("community")).toHaveAttribute(
    "data-community-skin",
    "fallout-terminal",
  );
  expect(localStorage.getItem(communitySkinKey("alice"))).toBe("fallout-terminal");
  first.unmount();
  const second = render(<Experience />);
  expect(screen.getByRole("button", { name: "Tema ativo Fallout 4 Terminal" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  second.rerender(<Experience userId="bob" />);
  expect(screen.getByTestId("community")).toHaveAttribute("data-community-skin", "dark-matter");
  fireEvent.click(screen.getByRole("button", { name: "Usar tema NieR: Automata UI Light" }));
  expect(screen.getByTestId("community")).toHaveAttribute("data-community-theme", "light");
  second.rerender(<Experience userId="alice" />);
  expect(screen.getByTestId("community")).toHaveAttribute(
    "data-community-skin",
    "fallout-terminal",
  );
});
it("filters by style and creator and allows recovering from an empty search", () => {
  render(<Experience />);
  fireEvent.click(screen.getByRole("button", { name: "Claros" }));
  expect(
    screen.getByRole("button", { name: "Usar tema NieR: Automata UI Light" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Usar tema Ocean" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Todos" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar temas" }), {
    target: { value: "CapnKitten" },
  });
  expect(screen.getByRole("button", { name: "Usar tema Spotify Discord" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Usar tema Translucence" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar temas" }), {
    target: { value: "inexistente" },
  });
  expect(screen.getByText("Nenhum tema encontrado")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ver todos os temas" }));
  expect(screen.getByRole("button", { name: "Usar tema Ocean" })).toBeInTheDocument();
});
it("uses a safe fallback for stale preferences and syncs changes from another tab", () => {
  localStorage.setItem(communitySkinKey("alice"), "removed-or-invalid");
  render(<Experience />);
  expect(screen.getByTestId("community")).toHaveAttribute("data-community-skin", "dark-matter");
  localStorage.setItem(communitySkinKey("alice"), "ocean");
  fireEvent(
    window,
    new StorageEvent("storage", { key: communitySkinKey("alice"), newValue: "ocean" }),
  );
  expect(screen.getByTestId("community")).toHaveAttribute("data-community-skin", "ocean");
});
it("still applies themes and explains session-only persistence when storage is denied", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw Error("denied");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("denied");
  });
  render(<Experience />);
  fireEvent.click(screen.getByRole("button", { name: "Usar tema Dark Neon" }));
  expect(screen.getByTestId("community")).toHaveAttribute("data-community-skin", "dark-neon");
  expect(screen.getByRole("status")).toHaveTextContent("Tema aplicado nesta sessão");
});
