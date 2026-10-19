import { createRef } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChatMediaPicker } from "@/components/chat-media-picker";
import { ChatDraftMedia, ChatMessageContent } from "@/components/chat-message-content";
import {
  appendChatGif,
  insertAtSelection,
  normalizeGiphyResults,
  safeGifUrl,
  splitChatMedia,
  klipySearchUrl,
} from "@/lib/chat-media";
import { starterGifs } from "@/data/chat-gifs";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("opens KLIPY search and accepts direct GIFs without a provider API key", () => {
  const change = vi.fn();
  render(
    <ChatMediaPicker draft="" onChange={change} inputRef={createRef()} limit={2000} apiKey="" />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Escolher GIF" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar GIFs" }), {
    target: { value: "gato feliz" },
  });
  expect(screen.getByRole("link", { name: /Pesquisar mais GIFs no KLIPY/ })).toHaveAttribute(
    "href",
    "https://klipy.com/search?q=gato%20feliz",
  );
  const url = "https://static.klipy.com/ii/example/cat.gif";
  fireEvent.change(screen.getByRole("textbox", { name: "Endereço do GIF" }), {
    target: { value: url },
  });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar GIF à mensagem" }));
  expect(change).toHaveBeenCalledWith(url);
  expect(splitChatMedia(url).gifs).toEqual([url]);
  expect(safeGifUrl("https://static.klipy.com.evil.test/cat.gif")).toBeNull();
  expect(klipySearchUrl("")).toBe("https://klipy.com/");
});
it("rejects page links and unrelated hosts instead of embedding them", () => {
  const change = vi.fn();
  render(
    <ChatMediaPicker draft="" onChange={change} inputRef={createRef()} limit={2000} apiKey="" />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Escolher GIF" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Endereço do GIF" }), {
    target: { value: "https://klipy.com/gifs/cat" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar GIF à mensagem" }));
  expect(screen.getByRole("status")).toHaveTextContent("O link da página não é uma imagem");
  expect(change).not.toHaveBeenCalled();
});
it("embeds only GIFs on trusted HTTPS media hosts and keeps other content as text", () => {
  for (const value of [
    "javascript:alert(1)",
    "https://media.giphy.com.evil.test/x.gif",
    "http://media.giphy.com/x.gif",
    "https://user:pw@media.giphy.com/x.gif",
    "https://media.giphy.com/x.svg",
    "https://localhost/x.gif",
  ])
    expect(safeGifUrl(value)).toBeNull();
  const url = starterGifs[0]!.url;
  expect(splitChatMedia(`Oi ${url}`)).toEqual({ text: "Oi", gifs: [url] });
  render(<ChatMessageContent content={`Olá ${url} <script>alert(1)</script>`} />);
  expect(screen.getByRole("img", { name: "GIF compartilhado" })).toHaveAttribute("src", url);
  expect(screen.getByText(/<script>/)).toBeInTheDocument();
  expect(document.querySelector("script")).toBeNull();
});
it("preserves input selection, complete emoji sequences and message length limits", () => {
  expect(insertAtSelection("Oi turma", "👋", 3, 8, 30)).toEqual({ value: "Oi 👋", caret: 5 });
  expect(insertAtSelection("abc", "🧑‍💻", 1, 1, 4)).toBeNull();
  expect(appendChatGif("x".repeat(2000), starterGifs[0]!, 2000)).toBeNull();
});
it("searches emojis in Portuguese and inserts at the current cursor", async () => {
  const input = createRef<HTMLInputElement>();
  const change = vi.fn();
  render(
    <>
      <input ref={input} defaultValue="Oi turma" />
      <ChatMediaPicker draft="Oi turma" onChange={change} inputRef={input} limit={2000} apiKey="" />
    </>,
  );
  input.current!.setSelectionRange(3, 8);
  fireEvent.click(screen.getByRole("button", { name: "Escolher emoji" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar emojis" }), {
    target: { value: "joinha" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Emoji joinha gostei sim" }));
  expect(change).toHaveBeenCalledWith("Oi 👍");
  expect(screen.queryByRole("textbox", { name: "Buscar emojis" })).not.toBeInTheDocument();
});
it("selects a collection GIF without making an API request, saves favorites, and supports removing the draft", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  const input = createRef<HTMLInputElement>();
  const change = vi.fn();
  const first = render(
    <ChatMediaPicker
      userId="alice"
      draft=""
      onChange={change}
      inputRef={input}
      limit={2000}
      apiKey=""
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Escolher GIF" }));
  fireEvent.click(screen.getByRole("button", { name: "Favoritar Aplausos" }));
  fireEvent.click(screen.getByRole("button", { name: "Favoritos" }));
  expect(screen.getByRole("button", { name: "Selecionar GIF Aplausos" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Selecionar GIF Aplausos" }));
  expect(change).toHaveBeenCalledWith(starterGifs[0]!.url);
  expect(request).not.toHaveBeenCalled();
  first.unmount();
  render(<ChatDraftMedia draft={`Oi ${starterGifs[0]!.url}`} onChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: "Remover GIF do rascunho" }));
  expect(change).toHaveBeenLastCalledWith("Oi");
});
it("keeps GIF controls disabled when messaging is not allowed", () => {
  render(
    <ChatMediaPicker
      draft=""
      onChange={vi.fn()}
      inputRef={createRef()}
      limit={2000}
      disabled
      apiKey=""
    />,
  );
  expect(screen.getByRole("button", { name: "Escolher GIF" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Escolher emoji" })).toBeDisabled();
});
it("normalizes API data without accepting hostile media URLs or changing signed URLs", () => {
  const signed = "https://media1.giphy.com/media/abc/200.gif?cid=123&rid=200.gif";
  expect(
    normalizeGiphyResults([
      {
        id: "abc",
        title: "Olá",
        images: { original: { url: signed }, fixed_width: { url: signed } },
      },
    ])[0]!.url,
  ).toBe(signed);
  expect(
    normalizeGiphyResults([
      { id: "evil", images: { original: { url: "https://evil.test/x.gif" } } },
    ]),
  ).toEqual([]);
});
it("loads online results and offers retry after an API error", async () => {
  const gif = starterGifs[0]!;
  const request = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 429 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: gif.id,
            title: "Resultado online",
            images: { original: { url: gif.url }, fixed_width: { url: gif.preview } },
          },
        ],
        pagination: { total_count: 1 },
      }),
    });
  vi.stubGlobal("fetch", request);
  render(
    <ChatMediaPicker
      draft=""
      onChange={vi.fn()}
      inputRef={createRef()}
      limit={2000}
      apiKey="test-key"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Escolher GIF" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Muitas buscas");
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(
    await screen.findByRole("button", { name: "Selecionar GIF Resultado online" }),
  ).toBeInTheDocument();
  expect(request.mock.calls[0]![0]).toContain("rating=pg");
  fireEvent.click(screen.getByRole("button", { name: "Fechar seletor" }));
  await waitFor(() =>
    expect(screen.queryByRole("textbox", { name: "Buscar GIFs" })).not.toBeInTheDocument(),
  );
});
