import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft, Clock, Search, Smile, Star, X, ExternalLink } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { emojiGroups } from "@/data/chat-emojis";
import { starterGifs } from "@/data/chat-gifs";
import {
  appendChatGif,
  insertAtSelection,
  normalizeGiphyResults,
  normalizeMediaSearch,
  searchGiphy,
  safeGifUrl,
  klipySearchUrl,
  type ChatGif,
} from "@/lib/chat-media";
import "@/routes/chat-media.css";

function readList(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((x) => typeof x === "string" && x.length <= 80).slice(0, 60)
      : [];
  } catch {
    return [];
  }
}
function saveList(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Picker remains available in the session. */
  }
}

export function ChatMediaPicker({
  draft,
  onChange,
  inputRef,
  disabled = false,
  limit,
  userId,
  apiKey = import.meta.env["VITE_GIPHY_API_KEY"] || "",
}: {
  draft: string;
  onChange: (draft: string) => void;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  disabled?: boolean;
  limit: number;
  userId?: string | undefined;
  apiKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "gif">("emoji");
  const [query, setQuery] = useState("");
  const [emojiGroup, setEmojiGroup] = useState("all");
  const [gifGroup, setGifGroup] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [results, setResults] = useState<ChatGif[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pastedGif, setPastedGif] = useState("");
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState(0);
  const [more, setMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const favoritesKey = `conecta:gif-favorites:${userId || "guest"}`;
  const recentKey = `conecta:recent-emoji:${userId || "guest"}`;
  useEffect(() => {
    setFavorites(readList(favoritesKey));
    setRecent(readList(recentKey));
    setOpen(false);
  }, [favoritesKey, recentKey]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const favoriteIds = favorites.join(",");
  const isFavorites = gifGroup === "favorites";
  const favoriteDependency = isFavorites ? favoriteIds : "";
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    const version = ++generation.current;
    setError("");
    if (!open || tab !== "gif" || !apiKey) {
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    if (offset === 0) setResults([]);
    const timer = window.setTimeout(
      async () => {
        try {
          if (isFavorites) {
            if (!favoriteIds) {
              setResults([]);
              setMore(false);
              return;
            }
            const params = new URLSearchParams({ api_key: apiKey, ids: favoriteIds, rating: "pg" });
            const response = await fetch(`https://api.giphy.com/v1/gifs?${params}`, {
              signal: controller.signal,
            });
            if (!response.ok) throw Error("Não foi possível carregar seus favoritos.");
            const payload = await response.json();
            if (generation.current === version) {
              setResults(normalizeGiphyResults(payload.data));
              setMore(false);
            }
          } else {
            const result = await searchGiphy(apiKey, query, offset, controller.signal);
            if (generation.current !== version) return;
            setResults((previous) =>
              offset === 0
                ? result.gifs
                : [
                    ...previous,
                    ...result.gifs.filter((item) => !previous.some((p) => p.id === item.id)),
                  ],
            );
            setMore(result.more);
            setNext(result.next);
          }
        } catch (err) {
          if (!controller.signal.aborted && generation.current === version)
            setError(err instanceof Error ? err.message : "Falha ao carregar GIFs.");
        } finally {
          if (generation.current === version) setBusy(false);
        }
      },
      query ? 350 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
      generation.current++;
    };
  }, [open, tab, apiKey, query, offset, isFavorites, favoriteDependency, retry]);
  const show = (nextTab: "emoji" | "gif") => {
    setTab(nextTab);
    setQuery("");
    setOffset(0);
    setNotice("");
    setOpen((current) => (tab === nextTab ? !current : true));
  };
  const chooseEmoji = (emoji: string) => {
    const input = inputRef.current;
    const insertion = insertAtSelection(
      draft,
      emoji,
      input?.selectionStart ?? draft.length,
      input?.selectionEnd ?? draft.length,
      limit,
    );
    if (!insertion) {
      setNotice("A mensagem atingiu o limite de caracteres.");
      return;
    }
    onChange(insertion.value);
    const history = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, 24);
    setRecent(history);
    saveList(recentKey, history);
    setOpen(false);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(insertion.caret, insertion.caret);
    });
  };
  const chooseGif = (gif: ChatGif) => {
    if (splitCount(draft) >= 3) {
      setNotice("Envie até três GIFs por mensagem.");
      return;
    }
    const value = appendChatGif(draft, gif, limit);
    if (!value) {
      setNotice("Não há espaço para esse GIF na mensagem.");
      return;
    }
    onChange(value);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const favorite = (id: string) => {
    const nextIds = favorites.includes(id)
      ? favorites.filter((value) => value !== id)
      : [id, ...favorites].slice(0, 60);
    setFavorites(nextIds);
    saveList(favoritesKey, nextIds);
  };
  const normalized = normalizeMediaSearch(query);
  const allEmoji = emojiGroups.flatMap((group) => group.items);
  const visibleEmoji = (
    emojiGroup === "recent"
      ? recent.flatMap((value) => allEmoji.filter((item) => item.emoji === value))
      : emojiGroups
          .filter((group) => emojiGroup === "all" || group.id === emojiGroup)
          .flatMap((group) => group.items)
  ).filter((item) => normalizeMediaSearch(`${item.label} ${item.emoji}`).includes(normalized));
  const localGifs = starterGifs.filter(
    (item) =>
      (isFavorites
        ? favorites.includes(item.id)
        : gifGroup === "all" || item.category === gifGroup) &&
      normalizeMediaSearch(`${item.title} ${item.tags}`).includes(normalized),
  );
  const gifs = apiKey
    ? isFavorites
      ? results.filter((gif) => normalizeMediaSearch(gif.title).includes(normalized))
      : results
    : localGifs;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="chat-media-tools">
          <button
            disabled={disabled}
            type="button"
            onClick={() => show("gif")}
            aria-label="Escolher GIF"
            aria-expanded={open && tab === "gif"}
          >
            <span>GIF</span>
          </button>
          <button
            disabled={disabled}
            type="button"
            onClick={() => show("emoji")}
            aria-label="Escolher emoji"
            aria-expanded={open && tab === "emoji"}
          >
            <Smile size={20} />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="chat-media-popover"
        side="top"
        align="end"
        collisionPadding={10}
        aria-label="Emojis e GIFs"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <header>
          <nav aria-label="Tipo de expressão">
            <button
              type="button"
              aria-pressed={tab === "gif"}
              onClick={() => {
                setTab("gif");
                setQuery("");
                setOffset(0);
              }}
            >
              GIFs
            </button>
            <button
              type="button"
              aria-pressed={tab === "emoji"}
              onClick={() => {
                setTab("emoji");
                setQuery("");
              }}
            >
              Emojis
            </button>
          </nav>
          <button
            type="button"
            className="chat-picker-close"
            aria-label="Fechar seletor"
            onClick={() => setOpen(false)}
          >
            <X size={17} />
          </button>
        </header>
        <label className="chat-picker-search">
          <Search size={16} />
          <input
            autoFocus
            aria-label={tab === "emoji" ? "Buscar emojis" : "Buscar GIFs"}
            placeholder={
              tab === "emoji"
                ? "Encontre o emoji perfeito"
                : apiKey
                  ? "Buscar no GIPHY"
                  : "Buscar nesta coleção"
            }
            value={query}
            maxLength={50}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
          />
        </label>
        {tab === "emoji" ? (
          <>
            <nav className="chat-emoji-categories" aria-label="Categorias de emojis">
              <button
                type="button"
                aria-label="Todos os emojis"
                aria-pressed={emojiGroup === "all"}
                onClick={() => setEmojiGroup("all")}
              >
                <Smile size={18} />
              </button>
              <button
                type="button"
                aria-label="Emojis recentes"
                aria-pressed={emojiGroup === "recent"}
                onClick={() => setEmojiGroup("recent")}
              >
                <Clock size={18} />
              </button>
              {emojiGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  title={group.name}
                  aria-label={group.name}
                  aria-pressed={emojiGroup === group.id}
                  onClick={() => setEmojiGroup(group.id)}
                >
                  {group.icon}
                </button>
              ))}
            </nav>
            <div className="chat-emoji-grid">
              {visibleEmoji.map((item) => (
                <button
                  type="button"
                  key={item.emoji}
                  title={item.label}
                  aria-label={`Emoji ${item.label}`}
                  onClick={() => chooseEmoji(item.emoji)}
                >
                  {item.emoji}
                </button>
              ))}
              {!visibleEmoji.length && (
                <p className="chat-picker-empty">
                  {emojiGroup === "recent"
                    ? "Os emojis que você usar aparecerão aqui."
                    : "Nenhum emoji encontrado."}
                </p>
              )}
            </div>
            <footer>Emojis para todas as conversas.</footer>
          </>
        ) : (
          <>
            <div className="chat-gif-provider">
              <a href={klipySearchUrl(query)} target="_blank" rel="noopener noreferrer">
                Pesquisar mais GIFs no KLIPY <ExternalLink size={14} />
              </a>
              <p>Abre o catálogo em outra aba. Copie o endereço da imagem GIF e cole abaixo.</p>
              <label>
                <span className="sr-only">Endereço do GIF</span>
                <input
                  type="url"
                  aria-label="Endereço do GIF"
                  placeholder="Cole o link direto do GIF (.gif ou .webp)"
                  maxLength={1500}
                  value={pastedGif}
                  onChange={(event) => {
                    setPastedGif(event.target.value);
                    setNotice("");
                  }}
                />
              </label>
              <button
                type="button"
                disabled={!pastedGif.trim()}
                onClick={() => {
                  const url = safeGifUrl(pastedGif.trim());
                  if (!url) {
                    setNotice(
                      "Cole o endereço direto de uma imagem GIF/WebP do KLIPY, GIPHY ou Tenor. O link da página não é uma imagem.",
                    );
                    return;
                  }
                  chooseGif({ id: "pasted-gif", title: "GIF escolhido", url, preview: url });
                }}
              >
                Adicionar GIF à mensagem
              </button>
            </div>
            <div className="chat-gif-categories">
              <button
                type="button"
                aria-pressed={!isFavorites && gifGroup === "all"}
                onClick={() => {
                  setGifGroup("all");
                  setQuery("");
                  setOffset(0);
                }}
              >
                {apiKey ? "Em alta" : "Coleção"}
              </button>
              <button
                type="button"
                aria-pressed={isFavorites}
                onClick={() => {
                  setGifGroup("favorites");
                  setQuery("");
                  setOffset(0);
                }}
              >
                <Star size={12} /> Favoritos
              </button>
            </div>
            {!query && !isFavorites && (
              <div className="chat-gif-topics">
                {(apiKey
                  ? ["Reações", "Gatos", "Festa", "Surpresa", "Anime", "Jogos"]
                  : ["Reações", "Gatos", "Festa", "Surpresa"]
                ).map((category) => (
                  <button
                    type="button"
                    key={category}
                    onClick={() => {
                      if (apiKey) setQuery(category);
                      else setGifGroup(category);
                      setOffset(0);
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
            {!apiKey && gifGroup !== "all" && !isFavorites && (
              <button type="button" className="chat-gif-back" onClick={() => setGifGroup("all")}>
                <ArrowLeft size={13} />
                {gifGroup} · Ver todos
              </button>
            )}
            <div className="chat-gif-results" aria-busy={busy}>
              {gifs.map((gif) => (
                <div className="chat-gif-option" key={gif.id}>
                  <button
                    type="button"
                    aria-label={`Selecionar GIF ${gif.title}`}
                    onClick={() => chooseGif(gif)}
                  >
                    {!reduceMotion && (
                      <img
                        src={gif.preview}
                        alt={gif.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.opacity = "0";
                        }}
                      />
                    )}
                    <span>{gif.title}</span>
                  </button>
                  <button
                    type="button"
                    className="chat-gif-star"
                    aria-label={`${favorites.includes(gif.id) ? "Remover dos favoritos" : "Favoritar"} ${gif.title}`}
                    aria-pressed={favorites.includes(gif.id)}
                    onClick={() => favorite(gif.id)}
                  >
                    <Star size={15} fill={favorites.includes(gif.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              ))}
            </div>
            {busy && (
              <p className="chat-picker-empty" role="status">
                Buscando GIFs…
              </p>
            )}
            {error && (
              <div className="chat-picker-error" role="alert">
                {error}
                <button type="button" onClick={() => setRetry((current) => current + 1)}>
                  Tentar novamente
                </button>
              </div>
            )}
            {!busy && !error && !gifs.length && (
              <p className="chat-picker-empty">
                {isFavorites
                  ? "Use a estrela para guardar seus GIFs favoritos."
                  : apiKey
                    ? "Nenhum GIF encontrado."
                    : "Nenhum GIF nesta coleção para essa busca. Tente “gato”, “festa” ou “parabéns”."}
              </p>
            )}
            {apiKey && more && !error && (
              <button
                type="button"
                className="chat-gif-more"
                disabled={busy}
                onClick={() => setOffset(next)}
              >
                Carregar mais
              </button>
            )}
            <footer>
              <span>{apiKey ? "Busca online" : "Coleção inicial"}</span>
              <a href="https://giphy.com" target="_blank" rel="noreferrer">
                Powered by <strong>GIPHY</strong>
              </a>
            </footer>
          </>
        )}
        {notice && (
          <p className="chat-picker-error" role="status">
            {notice}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
function splitCount(draft: string) {
  return (draft.match(/https:\/\/[^\s]+\.(?:gif|webp)(?:\?[^\s]*)?/g) || []).length;
}
