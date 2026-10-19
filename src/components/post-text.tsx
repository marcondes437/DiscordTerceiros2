import { splitChatMedia } from "@/lib/chat-media";
import { ChatGifImage } from "./chat-message-content";
export function PostText({
  text,
  onTag,
  onMention,
}: {
  text: string;
  onTag?: (tag: string) => void;
  onMention?: (handle: string) => void;
}) {
  const media = splitChatMedia(text);
  return (
    <div>
      <p className="social-post-text">
        {media.text.split(/(https?:\/\/[^\s]+|#[\p{L}\p{N}_]+|@[0-9a-f]{8}\b)/gu).map((part, i) => {
          if (part.startsWith("#") && onTag)
            return (
              <button
                type="button"
                className="social-inline-tag"
                key={i}
                onClick={() => onTag(part)}
              >
                {part}
              </button>
            );
          if (/^@[0-9a-f]{8}$/.test(part) && onMention)
            return (
              <button
                type="button"
                className="social-inline-tag"
                key={i}
                onClick={() => onMention(part.slice(1))}
              >
                {part}
              </button>
            );
          if (!/^https?:\/\//.test(part)) return part;
          try {
            const url = new URL(part);
            if (url.protocol !== "https:" && url.protocol !== "http:") return part;
            return (
              <a
                key={i}
                href={url.href}
                target="_blank"
                rel="noopener noreferrer"
                className="gaming-post-link"
              >
                {url.pathname === "/jogar" ? "🎮 Entrar na sala" : part}
              </a>
            );
          } catch {
            return part;
          }
        })}
      </p>
      {media.gifs.map((url) => (
        <ChatGifImage key={url} url={url} />
      ))}
    </div>
  );
}
