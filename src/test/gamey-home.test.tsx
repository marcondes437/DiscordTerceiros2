import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { GameyHero } from "@/components/landing/gamey-hero";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
it("switches the featured game while preserving real play destinations and community presence", () => {
  render(<GameyHero members={[{ id: "ana", name: "Ana" }]} connected players={0} calls={0} />);
  expect(screen.getByText("1 online agora")).toBeInTheDocument();
  expect(screen.getByText("Ana")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Jogar Rabisco" })).toHaveAttribute(
    "href",
    "/jogar?game=rabisco",
  );
  fireEvent.click(screen.getByRole("button", { name: /SlitherSenai/ }));
  expect(screen.getByRole("link", { name: "Jogar SlitherSenai" })).toHaveAttribute(
    "href",
    "/jogar?game=slithersenai",
  );
  expect(screen.getByRole("button", { name: /SlitherSenai/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("link", { name: /Entrar na comunidade/ })).toHaveAttribute(
    "href",
    "/comunidade",
  );
});
