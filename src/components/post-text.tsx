export function PostText({ text }: { text: string }) {
  return (
    <p className="social-post-text">
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
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
  );
}
