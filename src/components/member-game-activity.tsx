import { useEffect, useState } from "react";
import { Clock3, Gamepad2 } from "lucide-react";
import { useActivityPresence, type ActivityMember } from "./activity-presence";
import { elapsedGameTime, gameActivity } from "@/lib/game-activity";
import "@/routes/game-activity.css";

export function MemberGameActivity({
  member,
  memberId,
  compact = false,
}: {
  member?: ActivityMember;
  memberId?: string;
  compact?: boolean;
}) {
  const presence = useActivityPresence();
  const [now, setNow] = useState(Date.now());
  const own = memberId === presence.user?.id && presence.currentGame;
  const shared = [...presence.online, ...presence.classOnline]
    .filter((p) => p.id === memberId)
    .sort((a, b) => (b.gameStartedAt ?? 0) - (a.gameStartedAt ?? 0))
    .find((p) => gameActivity(p, now));
  const current = own
    ? { game: own.id, gameName: own.name, gameStartedAt: own.startedAt, gameUntil: own.until }
    : member || shared;
  const game = gameActivity(current, now);
  const active = !!game;
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), compact ? 15000 : 1000);
    return () => window.clearInterval(timer);
  }, [active, compact]);
  if (!game) return null;
  if (compact)
    return (
      <small
        className="member-game-status"
        title={`Jogando ${game.name}${game.manual ? " · Informado pelo membro" : ""}`}
      >
        <Gamepad2 size={13} />
        <span>
          Jogando <strong>{game.name}</strong>
        </span>
      </small>
    );
  return (
    <section className="member-game-card" aria-label={`Jogando ${game.name}`}>
      <h3>JOGANDO</h3>
      <div className="member-game-details">
        {game.image ? (
          <img src={game.image} alt="" />
        ) : (
          <div className="member-game-art">
            <Gamepad2 size={28} />
          </div>
        )}
        <div>
          <strong>{game.name}</strong>
          <small>{game.manual ? "Atividade informada pelo membro" : "Jogo da comunidade"}</small>
          {game.startedAt && (
            <span className="member-game-clock">
              <Clock3 size={12} />
              <time>{elapsedGameTime(game.startedAt, now)}</time> decorridos
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
