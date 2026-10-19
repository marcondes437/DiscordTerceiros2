import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useCommunityTheme } from "@/hooks/use-community-theme";
import { CommunityThemeToggle } from "@/components/community-theme-toggle";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});
function ThemeExample() {
  const { theme, toggle } = useCommunityTheme();
  return (
    <section data-testid="surface" data-community-theme={theme}>
      <CommunityThemeToggle theme={theme} onToggle={toggle} />
    </section>
  );
}
it("switches community themes and restores the saved preference on return", () => {
  localStorage.clear();
  const first = render(<ThemeExample />);
  fireEvent.click(screen.getByRole("button", { name: "Ativar modo claro" }));
  expect(screen.getByTestId("surface")).toHaveAttribute("data-community-theme", "light");
  expect(localStorage.getItem("conecta:community-theme")).toBe("light");
  first.unmount();
  render(<ThemeExample />);
  expect(screen.getByRole("button", { name: "Ativar modo escuro" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ativar modo escuro" }));
  expect(screen.getByTestId("surface")).toHaveAttribute("data-community-theme", "dark");
});
it("still switches when browser preference storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage denied");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage denied");
  });
  render(<ThemeExample />);
  fireEvent.click(screen.getByRole("button", { name: "Ativar modo claro" }));
  expect(screen.getByTestId("surface")).toHaveAttribute("data-community-theme", "light");
});
