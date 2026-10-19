import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CrimsonHomeHero } from "@/components/landing/crimson-home-hero";
import { HomeCatalog } from "@/components/landing/home-catalog";
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
it("filters the home catalog and preserves published play links", () => {
  render(<HomeCatalog />);
  expect(screen.getByRole("link", { name: "Jogar Rabisco (nova aba)" })).toHaveAttribute(
    "href",
    "https://rabisco-rho.vercel.app/",
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar jogos na home" }), {
    target: { value: "Slither" },
  });
  expect(screen.queryByRole("link", { name: "Jogar Rabisco (nova aba)" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Jogar SlitherSenai (nova aba)" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar jogos na home" }), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Criatividade" }));
  expect(
    screen.queryByRole("link", { name: "Jogar SlitherSenai (nova aba)" }),
  ).not.toBeInTheDocument();
});
it("keeps the reference panel actions functional and switches the selected game", () => {
  render(<CrimsonHomeHero online={3} connected />);
  expect(screen.getByText("3 online agora")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Jogar Rabisco" })).toHaveAttribute(
    "href",
    "https://rabisco-rho.vercel.app/",
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
