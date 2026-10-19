import { useState } from "react";
import { splitChatMedia } from "@/lib/chat-media";
export function ChatGifImage({
  url,
  title = "GIF compartilhado",
  preview = false,
}: {
  url: string;
  title?: string;
  preview?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  if (failed)
    return (
      <a className="chat-gif-fallback" href={url} target="_blank" rel="noreferrer">
        Abrir GIF ↗
      </a>
    );
  return (
    <div className={`chat-gif-image ${preview ? "is-preview" : ""}`}>
      {playing ? (
        <img
          src={url}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <button type="button" className="chat-gif-paused" onClick={() => setPlaying(true)}>
          ▶ Reproduzir GIF
        </button>
      )}
      {playing && (
        <button
          type="button"
          className="chat-gif-pause"
          aria-label="Pausar GIF"
          onClick={() => setPlaying(false)}
        >
          Ⅱ
        </button>
      )}
    </div>
  );
}
export function ChatMessageContent({ content }: { content: string }) {
  const { text, gifs } = splitChatMedia(content);
  return (
    <div className="chat-message-content">
      {text && <p className="message-text">{text}</p>}
      {gifs.length > 0 && (
        <div className="chat-gif-attachments">
          {gifs.map((url, index) => (
            <ChatGifImage key={`${url}:${index}`} url={url} />
          ))}
        </div>
      )}
    </div>
  );
}
export function ChatDraftMedia({
  draft,
  onChange,
}: {
  draft: string;
  onChange: (next: string) => void;
}) {
  const { gifs } = splitChatMedia(draft);
  if (!gifs.length) return null;
  return (
    <div className="chat-draft-media" aria-label="GIFs prontos para enviar">
      {gifs.map((url, index) => (
        <div key={`${url}:${index}`}>
          <ChatGifImage url={url} preview />
          <button
            type="button"
            aria-label="Remover GIF do rascunho"
            onClick={() => onChange(draft.replace(url, "").trim())}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
