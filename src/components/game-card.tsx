import { useActivityPresence } from "@/components/activity-presence";
import type { CSSProperties } from "react";
import { ArrowUpRight, Globe, Heart, Play } from "lucide-react";
import type { BrowserGame } from "@/data/games";

export function GameCard({
  game,
  favorite = false,
  onFavorite,
  busy = false,
}: {
  game: BrowserGame;
  favorite?: boolean;
  onFavorite?: () => void;
  busy?: boolean;
}) {
  const { startGame } = useActivityPresence();
  const content = (
    <>
      <div className="game-card-art">
        <img src={game.image} alt={`Capa de ${game.name}`} loading="lazy" />
        <span className="game-card-badge">
          <Globe size={11} />
          {game.url ? "Navegador" : "Em breve"}
        </span>
        {game.url && (
          <span className="game-card-play">
            <Play size={21} fill="currentColor" />
          </span>
        )}
      </div>
      <div className="game-card-caption">
        <div>
          <h3>{game.name}</h3>
          <p>{game.categories.join(" · ")}</p>
        </div>
        {game.url ? (
          <ArrowUpRight size={18} />
        ) : (
          <span className="game-coming-label">Em breve</span>
        )}
      </div>
    </>
  );
  return (
    <article className="game-item" style={{ "--game-color": game.color } as CSSProperties}>
      {game.url ? (
        <a
          className={`game-card game-card-${game.id}`}
          href={game.url}
          onClick={() => startGame(game.id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Jogar ${game.name} (nova aba)`}
        >
          {content}
        </a>
      ) : (
        <div
          className={`game-card game-card-${game.id} game-coming-soon`}
          aria-label={`${game.name} — em breve`}
        >
          {content}
        </div>
      )}
      {onFavorite && (
        <button
          className="game-favorite-button"
          disabled={busy}
          aria-label={`${favorite ? "Remover" : "Adicionar"} ${game.name} ${favorite ? "dos" : "aos"} favoritos`}
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          <Heart size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
      )}
    </article>
  );
}
