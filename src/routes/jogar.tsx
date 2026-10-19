import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, Copy, Gamepad2, Play, Users, Share2, Eraser } from "lucide-react";
import { toast } from "sonner";
import { SocialSiteShell } from "@/components/social-site-shell";
import { useGamingAccount } from "@/hooks/use-gaming-account";
import { useActivityPresence } from "@/components/activity-presence";
import { useGameRoom } from "@/hooks/use-game-room";
import { gameAction, gamingDb, inviteUrl, type RoomSnapshot, type Stroke } from "@/lib/gaming";
import { GameCaptureControls } from "@/components/gaming-media";
import { GameInviteFriends } from "@/components/game-invite-friends";
import "./gaming-features.css";

export const Route = createFileRoute("/jogar")({
  validateSearch: (search: Record<string, unknown>) => ({
    game: search["game"] === "slithersenai" ? ("slithersenai" as const) : ("rabisco" as const),
    room:
      typeof search["room"] === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(search["room"])
        ? search["room"]
        : "",
  }),
  head: () => ({ meta: [{ title: "Jogar com a turma | SENAI Conecta" }] }),
  component: PlayPage,
});

function PlayPage() {
  const { game, room: roomId } = Route.useSearch();
  const { user, name } = useGamingAccount();
  return (
    <SocialSiteShell user={user} name={name} activePage="games" onSignIn={() => {}}>
      <main className="gaming-hub">
        <header className="gaming-hub-header">
          <Link to="/jogos">
            <ArrowLeft size={16} />
            Catálogo
          </Link>
          <span>
            <Gamepad2 size={18} />
            {game === "rabisco" ? "Rabisco" : "SlitherSenai"}
          </span>
          <Link to="/perfil-jogos">Meu perfil</Link>
        </header>
        {!user ? (
          <p role="status">Preparando sua conta…</p>
        ) : roomId ? (
          <GameRoom key={roomId} userId={user.id} roomId={roomId} />
        ) : (
          <GameLobby game={game} />
        )}
      </main>
    </SocialSiteShell>
  );
}

type LobbyRoom = {
  id: string;
  game: "rabisco" | "slithersenai";
  phase: string;
  gaming_members: { user_id: string; name: string; seen_at: string }[];
};
function GameLobby({ game }: { game: "rabisco" | "slithersenai" }) {
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState("");
  useEffect(() => {
    let live = true;
    const load = async () => {
      const r = await gamingDb
        .from("gaming_rooms")
        .select("id,game,phase:state->>phase,gaming_members(user_id,name,seen_at)")
        .eq("game", game)
        .gte("updated_at", new Date(Date.now() - 90000).toISOString())
        .order("updated_at", { ascending: false })
        .limit(20);
      if (live) {
        if (r.error) setError("Não foi possível carregar as salas.");
        else {
          setRooms(
            (r.data ?? [])
              .map((v: LobbyRoom) => ({
                ...v,
                gaming_members: v.gaming_members.filter(
                  (p) => Date.now() - new Date(p.seen_at).getTime() < 60000,
                ),
              }))
              .filter((v: LobbyRoom) => v.gaming_members.length),
          );
          setError("");
        }
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [game]);
  async function create() {
    setBusy(true);
    try {
      const room = await gameAction(null, "create", { game });
      window.location.assign(inviteUrl(room, window.location.origin));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a sala.");
      setBusy(false);
    }
  }
  function enter() {
    try {
      const url = new URL(invite, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== "/jogar" ||
        !url.searchParams.get("room")?.match(/^[0-9a-f-]{36}$/i)
      )
        throw Error();
      window.location.assign(url.href);
    } catch {
      setError("Cole um convite válido deste site.");
    }
  }
  return (
    <>
      <section className="gaming-lobby-intro">
        <span>JOGUE COM A TURMA</span>
        <h1>
          {game === "rabisco"
            ? "Um desenho. Muitos palpites."
            : "Sua cobra. Uma arena. A turma inteira."}
        </h1>
        <p>
          {game === "rabisco"
            ? "Desenhe a palavra secreta, acerte os desenhos dos amigos e some pontos. Rodadas de 60 segundos."
            : "Colete alimentos, cresça e desvie das cobras e das paredes. Rodadas de 90 segundos, com até 8 jogadores."}
        </p>
        <button className="btn-red" disabled={busy} onClick={() => void create()}>
          <Play size={16} />
          {busy ? "Criando…" : "Criar sala"}
        </button>
      </section>
      <div className="gaming-invite-input">
        <label htmlFor="room-invite">Recebeu um convite?</label>
        <div>
          <input
            id="room-invite"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="Cole o link da sala"
          />
          <button onClick={enter} disabled={!invite.trim()}>
            Entrar
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="console-error">
          {error}
        </p>
      )}
      <div className="gaming-section-title">
        <h2>Salas da comunidade</h2>
        <span>Atualiza automaticamente</span>
      </div>
      <div className="gaming-room-grid">
        {rooms.length ? (
          rooms.map((r) => (
            <article key={r.id}>
              <Users />
              <h3>Sala {r.id.slice(0, 6).toUpperCase()}</h3>
              <p>
                {r.gaming_members.length}/8 jogadores ·{" "}
                {r.phase === "playing" ? "Em partida" : "Aguardando a turma"}
              </p>
              <small>{r.gaming_members.map((m) => m.name).join(", ")}</small>
              <a href={inviteUrl(r, typeof window !== "undefined" ? window.location.origin : "")}>
                Entrar na sala
              </a>
            </article>
          ))
        ) : (
          <div className="console-empty">
            <Users />
            <h3>A primeira sala pode ser sua.</h3>
            <p>Crie uma sala e copie o convite para jogar com seus amigos.</p>
          </div>
        )}
      </div>
    </>
  );
}

function GameRoom({ userId, roomId }: { userId: string; roomId: string }) {
  const { room, error, ready, act } = useGameRoom(userId, roomId);
  const activity = useActivityPresence();
  const activityRef = useRef(activity);
  activityRef.current = activity;
  const [now, setNow] = useState(Date.now());
  const [shareBusy, setShareBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!room?.game) return;
    activityRef.current.startGame(room.game);
    const timer = window.setInterval(() => activityRef.current.startGame(room.game), 5 * 60_000);
    return () => {
      window.clearInterval(timer);
      activityRef.current.stopGame();
    };
  }, [room?.game, activity.user?.id]);
  async function copy() {
    if (!room) return;
    const link = inviteUrl(room, window.location.origin);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Convite copiado!");
    } catch {
      window.prompt("Copie este convite:", link);
    }
  }
  async function share() {
    if (!room) return;
    setShareBusy(true);
    const link = inviteUrl(room, window.location.origin);
    const r = await gamingDb.from("social_posts").insert({
      author_id: userId,
      body: `🎮 Bora jogar ${room.game === "rabisco" ? "Rabisco" : "SlitherSenai"}? Entre na minha sala: ${link}`,
    });
    if (r.error) toast.error("Não foi possível compartilhar o convite.");
    else toast.success("Convite publicado no Social!");
    setShareBusy(false);
  }
  if (!room)
    return (
      <div className="console-empty" role="status">
        <p>{error || "Entrando na sala…"}</p>
        <Link to="/jogos">Voltar ao catálogo</Link>
      </div>
    );
  const remaining = Math.max(0, Math.ceil(((room.state.endsAt ?? 0) - now) / 1000));
  const host = room.host === userId;
  const active = room.state.phase === "playing" && remaining > 0;
  const drawer = room.members.find((m) => m.user_id === room.state.drawer);
  return (
    <>
      <div className="gaming-room-toolbar">
        <div>
          <h1>Sala {room.id.slice(0, 6).toUpperCase()}</h1>
          <span>
            {room.members.length}/8 jogadores · {host ? "Você é o anfitrião" : "Sala da comunidade"}
          </span>
        </div>
        <div>
          <button onClick={() => void copy()}>
            <Copy size={15} />
            Copiar convite
          </button>
          <button disabled={shareBusy} onClick={() => void share()}>
            <Share2 size={15} />
            Publicar convite no Social
          </button>
          <GameInviteFriends roomId={room.id} userId={userId} />
        </div>
      </div>
      {error && (
        <p className="console-error" role="alert">
          {error}
        </p>
      )}
      <div className="gaming-room-layout">
        <section className="gaming-board-area">
          <div className="gaming-round-status">
            <strong>
              {room.game === "rabisco"
                ? active
                  ? room.state.drawer === userId
                    ? `Desenhe: ${room.word ?? "…"}`
                    : `${drawer?.name ?? "Alguém"} desenha · ${room.state.letters} letras`
                  : room.word
                    ? `A palavra era: ${room.word}`
                    : "Aguardando jogadores"
                : active
                  ? "Colete alimentos. Não bata nas cobras ou paredes."
                  : room.state.phase === "finished"
                    ? "Rodada encerrada! Confira o placar."
                    : "Prepare-se para a arena."}
            </strong>
            <span>
              {active
                ? `${remaining}s`
                : room.state.phase === "finished"
                  ? "Fim da rodada"
                  : "Sala aberta"}
            </span>
          </div>
          {room.game === "rabisco" ? (
            <DrawingGame room={room} self={userId} canvas={canvas} act={act} active={active} />
          ) : (
            <SnakeGame room={room} self={userId} canvas={canvas} act={act} active={active} />
          )}
          <div className="gaming-round-actions">
            {host && (
              <button
                disabled={!ready || active || (room.game === "rabisco" && room.members.length < 2)}
                className="btn-red"
                onClick={() => void act("start")}
              >
                <Play size={15} />
                {room.state.phase === "lobby" ? "Iniciar rodada" : "Próxima rodada"}
              </button>
            )}
            <span>
              {room.game === "rabisco" && room.members.length < 2
                ? "Convide mais uma pessoa para começar."
                : !host && !active
                  ? "O anfitrião inicia a próxima rodada."
                  : ""}
            </span>
          </div>
          <GameCaptureControls
            canvas={canvas}
            userId={userId}
            gameName={room.game === "rabisco" ? "Rabisco" : "SlitherSenai"}
          />
        </section>
        <aside className="gaming-scoreboard">
          <h2>
            <Users size={17} />
            Jogadores e placar
          </h2>
          {room.members.map((m, i) => (
            <div key={m.user_id}>
              <span>{i + 1}</span>
              <strong>
                {m.name}
                {m.user_id === userId ? " (você)" : ""}
                <small>
                  {m.user_id === room.state.drawer && room.game === "rabisco"
                    ? "Desenhando"
                    : m.user_id === room.host
                      ? "Anfitrião"
                      : ""}
                </small>
              </strong>
              <b>{m.score}</b>
            </div>
          ))}
          <p>
            Os pontos e as conquistas são calculados no servidor. As medalhas ficam no seu perfil.
          </p>
          <Link to="/perfil-jogos">Ver conquistas e capturas</Link>
        </aside>
      </div>
    </>
  );
}

type BoardProps = {
  room: RoomSnapshot;
  self: string;
  canvas: React.RefObject<HTMLCanvasElement | null>;
  act: (action: string, data?: Record<string, unknown>) => Promise<RoomSnapshot | null>;
  active: boolean;
};
function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  s.points.forEach(([x, y], i) =>
    i ? ctx.lineTo(x * 1000, y * 650) : ctx.moveTo(x * 1000, y * 650),
  );
  if (s.points.length === 1) {
    const p = s.points[0]!;
    ctx.lineTo(p[0] * 1000 + 0.1, p[1] * 650 + 0.1);
  }
  ctx.stroke();
}
function DrawingGame({ room, self, canvas, act, active }: BoardProps) {
  const [color, setColor] = useState("#171717");
  const [width, setWidth] = useState(5);
  const [guess, setGuess] = useState("");
  const [sending, setSending] = useState(false);
  const points = useRef<[number, number][]>([]);
  const down = useRef(false);
  const drawing = room.state.drawer === self && active;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, 1000, 650);
    for (const s of room.state.strokes ?? []) paintStroke(ctx, s);
    if (points.current.length) paintStroke(ctx, { points: points.current, color, width });
  }, [room.state.strokes, canvas, color, width]);
  const flush = () => {
    if (!points.current.length) return;
    const batch = [...points.current];
    points.current = [];
    void act("draw", { points: batch, color, width });
  };
  const position = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    ];
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!down.current || !drawing) return;
    const point = position(e);
    const prev = points.current.at(-1) ?? point;
    points.current.push(point);
    const ctx = canvas.current?.getContext("2d");
    if (ctx) paintStroke(ctx, { points: [prev, point], color, width });
    if (points.current.length >= 30) {
      flush();
      points.current = [point];
    }
  };
  async function submit() {
    if (!guess.trim() || sending) return;
    setSending(true);
    await act("guess", { guess: guess.trim() });
    setGuess("");
    setSending(false);
  }
  return (
    <>
      <canvas
        ref={canvas}
        width={1000}
        height={650}
        className={`gaming-canvas ${drawing ? "can-draw" : ""}`}
        aria-label="Desenho da rodada"
        onPointerDown={(e) => {
          if (!drawing) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          down.current = true;
          points.current = [position(e)];
        }}
        onPointerMove={move}
        onPointerUp={() => {
          if (down.current) {
            down.current = false;
            flush();
          }
        }}
        onPointerCancel={() => {
          down.current = false;
          flush();
        }}
      />
      {drawing ? (
        <div className="gaming-draw-tools">
          {["#171717", "#e32636", "#f4bd31", "#29a76b", "#317be4", "#9c51d6", "#fafafa"].map(
            (c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ background: c }}
                aria-label={`Cor ${c}`}
                aria-pressed={color === c}
              />
            ),
          )}
          <label>
            Traço
            <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
              <option value={3}>Fino</option>
              <option value={5}>Médio</option>
              <option value={12}>Grosso</option>
            </select>
          </label>
          <button onClick={() => void act("clear")}>
            <Eraser size={15} />
            Limpar
          </button>
        </div>
      ) : (
        <form
          className="gaming-guess"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            aria-label="Seu palpite"
            maxLength={60}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="O que está sendo desenhado?"
            disabled={!active}
          />
          <button disabled={!active || !guess.trim() || sending}>Enviar palpite</button>
        </form>
      )}
      <p className="gaming-message" aria-live="polite">
        {room.state.message || "Quem desenha recebe uma palavra secreta. A turma tenta adivinhar."}
      </p>
    </>
  );
}

function SnakeGame({ room, self, canvas, act, active }: BoardProps) {
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0b1114";
    ctx.fillRect(0, 0, 1000, 650);
    ctx.strokeStyle = "#ffffff08";
    for (let x = 0; x <= 40; x++) {
      ctx.beginPath();
      ctx.moveTo(x * 25, 0);
      ctx.lineTo(x * 25, 650);
      ctx.stroke();
    }
    for (let y = 0; y <= 26; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * 25);
      ctx.lineTo(1000, y * 25);
      ctx.stroke();
    }
    for (const p of room.state.food ?? []) {
      ctx.fillStyle = "#f7bb57";
      ctx.beginPath();
      ctx.arc((p % 40) * 25 + 12.5, Math.floor(p / 40) * 25 + 12.5, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    const colors = [
      "#f0a4f1",
      "#f07999",
      "#78b8ff",
      "#c39aff",
      "#efd77b",
      "#5ed1d9",
      "#ffac72",
      "#c4d5d5",
    ];
    Object.entries(room.state.snakes ?? {}).forEach(([id, snake], i) => {
      ctx.fillStyle = id === self ? "#73efa2" : colors[i % colors.length]!;
      snake.body.forEach((p, j) => {
        ctx.globalAlpha = j === 0 ? 1 : 0.75;
        ctx.fillRect((p % 40) * 25 + 2, Math.floor(p / 40) * 25 + 2, 21, 21);
      });
      ctx.globalAlpha = 1;
      if (snake.body[0] !== undefined) {
        const p = snake.body[0];
        ctx.fillStyle = "#fff";
        ctx.font = "13px sans-serif";
        ctx.fillText(
          room.members.find((m) => m.user_id === id)?.name.slice(0, 14) ?? "",
          (p % 40) * 25,
          Math.max(14, Math.floor(p / 40) * 25 - 4),
        );
      }
    });
  }, [room.state.snakes, room.state.food, room.members, self, canvas]);
  const direction = useCallback(
    (d: string) => {
      if (active) void act("direction", { direction: d });
    },
    [act, active],
  );
  return (
    <>
      <div
        className="gaming-arena"
        tabIndex={0}
        role="group"
        aria-label="Arena. Use as setas ou WASD para mover sua cobra."
        onKeyDown={(e) => {
          const keys: Record<string, string> = {
            ArrowUp: "up",
            w: "up",
            ArrowDown: "down",
            s: "down",
            ArrowLeft: "left",
            a: "left",
            ArrowRight: "right",
            d: "right",
          };
          const d = keys[e.key];
          if (d) {
            e.preventDefault();
            if (!e.repeat) direction(d);
          }
        }}
      >
        <canvas
          className="gaming-canvas"
          ref={canvas}
          width={1000}
          height={650}
          aria-label="Arena de SlitherSenai"
          onPointerDown={(e) => e.currentTarget.parentElement?.focus()}
        />
      </div>
      <div className="gaming-direction-controls">
        <button
          aria-label="Mover para esquerda"
          disabled={!active}
          onClick={() => direction("left")}
        >
          ←
        </button>
        <button aria-label="Mover para cima" disabled={!active} onClick={() => direction("up")}>
          ↑
        </button>
        <button aria-label="Mover para baixo" disabled={!active} onClick={() => direction("down")}>
          ↓
        </button>
        <button
          aria-label="Mover para direita"
          disabled={!active}
          onClick={() => direction("right")}
        >
          →
        </button>
        <span>
          Sua cobra é verde. Clique na arena e use as setas/WASD. Ao colidir, você reaparece.
        </span>
      </div>
    </>
  );
}
