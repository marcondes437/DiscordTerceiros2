import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CommunityHub } from "@/components/community-hub";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
const setup = () => {
  const handlers = {
    onChannel: vi.fn(),
    onRoom: vi.fn(),
    onPerson: vi.fn(),
    onInvite: vi.fn(),
    onProfile: vi.fn(),
  };
  render(
    <CommunityHub
      name="Ana"
      space="Geral"
      online={[{ id: "ana", name: "Ana" }]}
      groups={[
        {
          label: "Áreas",
          channels: [
            { id: "programacao", name: "programação", about: "Código e projetos" },
            { id: "design", name: "design", about: "Interfaces" },
          ],
        },
      ]}
      rooms={[
        { id: "estudos", name: "Grupo de estudos", people: [{ id: "ana", name: "Ana" }] },
        { id: "ideias", name: "Ideias", people: [] },
      ]}
      joinedRoom="estudos"
      {...handlers}
    />,
  );
  return handlers;
};
it("opens existing channels and voice rooms without joining on render", () => {
  const h = setup();
  expect(h.onRoom).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /#programação/ }));
  expect(h.onChannel).toHaveBeenCalledWith("programacao");
  fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
  expect(h.onRoom).toHaveBeenCalledWith("estudos");
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  expect(h.onRoom).toHaveBeenCalledWith("ideias");
});
it("filters channels and rooms without accents and reports empty results", () => {
  setup();
  const input = screen.getByRole("textbox", { name: "Buscar canais e salas" });
  fireEvent.change(input, { target: { value: "programacao" } });
  expect(screen.getByRole("button", { name: /#programação/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /#design/ })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: "inexistente" } });
  expect(screen.getByText("Nenhum canal encontrado.")).toBeInTheDocument();
  expect(screen.getByText("Nenhuma sala encontrada.")).toBeInTheDocument();
});
it("uses live presence and connects profile, member and invite actions", () => {
  const h = setup();
  expect(screen.getByText("1 online agora")).toBeInTheDocument();
  expect(screen.getByText("1 sala em atividade")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Editar meu perfil/ }));
  expect(h.onProfile).toHaveBeenCalledOnce();
  fireEvent.click(
    within(screen.getByRole("complementary", { name: "Sua comunidade" })).getByRole("button", {
      name: /Ana Na comunidade/,
    }),
  );
  expect(h.onPerson).toHaveBeenCalledWith("ana");
  fireEvent.click(screen.getByRole("button", { name: "Convidar a turma" }));
  expect(h.onInvite).toHaveBeenCalledOnce();
});
