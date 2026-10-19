export type ChatGif = {
  id: string;
  title: string;
  url: string;
  preview: string;
  tags?: string;
  category?: string;
};
export const normalizeMediaSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function safeGifUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1500) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (
      !/^(media\d*\.giphy\.com|i\.giphy\.com|media\d*\.tenor\.com|static\.klipy\.com)$/.test(
        url.hostname,
      )
    )
      return null;
    if (!/\.(gif|webp)$/i.test(url.pathname)) return null;
    return value;
  } catch {
    return null;
  }
}
export function klipySearchUrl(query: string) {
  return query.trim()
    ? `https://klipy.com/search?q=${encodeURIComponent(query.trim().slice(0, 100))}`
    : "https://klipy.com/";
}
export function splitChatMedia(content: string): { text: string; gifs: string[] } {
  const gifs: string[] = [];
  const text = content
    .replace(/https:\/\/[^\s<>]+/g, (url) => {
      if (!safeGifUrl(url) || gifs.length >= 3) return url;
      gifs.push(url);
      return "";
    })
    .trim();
  return { text, gifs };
}
export function insertAtSelection(
  draft: string,
  insert: string,
  start: number,
  end: number,
  limit: number,
) {
  const next = draft.slice(0, start) + insert + draft.slice(end);
  return next.length <= limit ? { value: next, caret: start + insert.length } : null;
}
export function appendChatGif(draft: string, gif: ChatGif, limit: number) {
  if (!safeGifUrl(gif.url)) return null;
  const next = `${draft.trimEnd()}${draft.trim() ? " " : ""}${gif.url}`;
  return next.length <= limit ? next : null;
}
export function normalizeGiphyResults(data: unknown): ChatGif[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const url = safeGifUrl(item?.images?.downsized?.url) ?? safeGifUrl(item?.images?.original?.url);
    const preview = safeGifUrl(item?.images?.fixed_width?.url) ?? url;
    if (!url || !preview || typeof item?.id !== "string" || !/^[a-zA-Z0-9]{1,80}$/.test(item.id))
      return [];
    return [
      {
        id: item.id,
        title: typeof item.title === "string" ? item.title.slice(0, 150) : "GIF",
        url,
        preview,
      },
    ];
  });
}
export async function searchGiphy(
  apiKey: string,
  query: string,
  offset: number,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: "24",
    offset: String(offset),
    rating: "pg",
    lang: "pt",
  });
  if (query) params.set("q", query.slice(0, 50));
  const response = await fetch(
    `https://api.giphy.com/v1/gifs/${query ? "search" : "trending"}?${params}`,
    { signal },
  );
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Muitas buscas. Espere um pouco e tente novamente."
        : "Não foi possível buscar GIFs agora.",
    );
  const payload = await response.json();
  if (!Array.isArray(payload.data))
    throw new Error("O serviço de GIFs retornou uma resposta inválida.");
  return {
    gifs: normalizeGiphyResults(payload.data),
    more: offset + payload.data.length < Number(payload.pagination?.total_count ?? 0),
    next: offset + payload.data.length,
  };
}
