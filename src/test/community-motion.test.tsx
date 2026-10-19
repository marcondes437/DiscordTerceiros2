import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  CommunityMotionProvider,
  MotionSettings,
  useMessageMotion,
  useMotionSurface,
} from "@/components/community-motion";
const motions: {
  cancel: ReturnType<typeof vi.fn>;
  onfinish: (() => void) | null;
  oncancel: (() => void) | null;
}[] = [];
const animate = vi.fn(() => {
  const animation = { cancel: vi.fn(), onfinish: null, oncancel: null };
  motions.push(animation);
  return animation;
});
beforeEach(() => {
  motions.length = 0;
  animate.mockClear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as any).animate;
});
function Surface({ view }: { view: string }) {
  const ref = useMotionSurface<HTMLDivElement>(view);
  return (
    <div ref={ref}>
      <input aria-label="Rascunho" defaultValue="Não perder" />
    </div>
  );
}
function Messages({
  ids,
  scope = "channel",
  ready = true,
}: {
  ids: string[];
  scope?: string;
  ready?: boolean;
}) {
  const ref = useMessageMotion<HTMLDivElement>(scope, ids, ready);
  return (
    <div ref={ref}>
      {ids.map((id) => (
        <div data-message-id={id} key={id}>
          {id}
        </div>
      ))}
    </div>
  );
}
it("animates channel changes on the existing surface without remounting its children", () => {
  const first = render(<Surface view="geral" />);
  const input = screen.getByRole("textbox", { name: "Rascunho" });
  fireEvent.change(input, { target: { value: "Minha mensagem" } });
  first.rerender(<Surface view="jogos" />);
  expect(screen.getByRole("textbox", { name: "Rascunho" })).toBe(input);
  expect(input).toHaveValue("Minha mensagem");
  expect(animate).toHaveBeenCalledTimes(2);
  expect(motions[0]!.cancel).toHaveBeenCalledOnce();
  first.unmount();
  expect(motions[1]!.cancel).toHaveBeenCalledOnce();
});
it("animates only new messages, not initial history, polling, deletions or another channel", () => {
  const test = render(<Messages ids={[]} ready={false} />);
  test.rerender(<Messages ids={["history"]} ready />);
  expect(animate).not.toHaveBeenCalled();
  test.rerender(<Messages ids={["history", "new"]} ready />);
  expect(animate).toHaveBeenCalledOnce();
  test.rerender(<Messages ids={["history", "new"]} ready />);
  test.rerender(<Messages ids={["new"]} ready />);
  test.rerender(<Messages ids={["other-history"]} scope="other" ready />);
  expect(animate).toHaveBeenCalledOnce();
  expect(motions[0]!.cancel).toHaveBeenCalledOnce();
});
it("persists the intensity and cancels active effects when animations are turned off", () => {
  render(
    <CommunityMotionProvider>
      <MotionSettings />
      <Surface view="geral" />
    </CommunityMotionProvider>,
  );
  expect(document.body).toHaveAttribute("data-conecta-motion", "full");
  const count = animate.mock.calls.length;
  fireEvent.change(screen.getByRole("combobox", { name: "Intensidade das animações" }), {
    target: { value: "off" },
  });
  expect(localStorage.getItem("conecta:animations")).toBe("off");
  expect(document.body).toHaveAttribute("data-conecta-motion", "off");
  expect(animate).toHaveBeenCalledTimes(count);
  expect(motions.every((animation) => animation.cancel.mock.calls.length > 0)).toBe(true);
});
it("honors reduced motion and responds when the device preference changes", () => {
  let listener: () => void = () => {};
  const media = {
    matches: true,
    addEventListener: vi.fn((_event: string, callback: () => void) => {
      listener = callback;
    }),
    removeEventListener: vi.fn(),
  };
  vi.spyOn(window, "matchMedia").mockReturnValue(media as unknown as MediaQueryList);
  const view = render(
    <CommunityMotionProvider>
      <MotionSettings />
      <Surface view="geral" />
    </CommunityMotionProvider>,
  );
  expect(document.body).toHaveAttribute("data-conecta-motion", "off");
  expect(animate).not.toHaveBeenCalled();
  expect(screen.getByText("Movimento reduzido ativo no dispositivo.")).toBeInTheDocument();
  media.matches = false;
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "subtle" } });
  act(() => listener());
  expect(document.body).toHaveAttribute("data-conecta-motion", "subtle");
  view.unmount();
  expect(media.removeEventListener).toHaveBeenCalled();
});
it("restores the off preference and cleans the document attribute on unmount", () => {
  localStorage.setItem("conecta:animations", "off");
  const view = render(
    <CommunityMotionProvider>
      <Surface view="geral" />
    </CommunityMotionProvider>,
  );
  expect(animate).not.toHaveBeenCalled();
  expect(document.body).toHaveAttribute("data-conecta-motion", "off");
  view.unmount();
  expect(document.body).not.toHaveAttribute("data-conecta-motion");
});
