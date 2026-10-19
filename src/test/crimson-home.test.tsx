import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CrimsonHomeHero } from "@/components/landing/crimson-home-hero";
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string;
    search?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a href={`${to}${search ? "?" + new URLSearchParams(search) : ""}`} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
it("keeps the reference panel actions functional and switches the selected game", () => {
  render(<CrimsonHomeHero online={3} connected />);
  expect(screen.getByText("3 online agora")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Jogar Rabisco" })).toHaveAttribute(
    "href",
    "/jogar?game=rabisco",
  );
  fireEvent.click(screen.getByRole("button", { name: "SlitherSenai" }));
  expect(screen.getByRole("link", { name: "Jogar SlitherSenai" })).toHaveAttribute(
    "href",
    "/jogar?game=slithersenai",
  );
  expect(screen.getByRole("link", { name: /Converse de perto/ })).toHaveAttribute(
    "href",
    "/comunidade",
  );
  expect(screen.getByRole("link", { name: /Entre no jogo/ })).toHaveAttribute("href", "/jogos");
});
