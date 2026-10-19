import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { useActivityPresence } from "./activity-presence";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { cleanGameName, gameActivity } from "@/lib/game-activity";
import "@/routes/game-activity.css";

export function GameActivityControl() {
  const activity = useActivityPresence();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const game = activity.currentGame;
  const current = gameActivity(
    game
      ? { game: game.id, gameName: game.name, gameStartedAt: game.startedAt, gameUntil: game.until }
      : undefined,
  );
  if (!activity.user) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Minha atividade de jogo"
        aria-label="Minha atividade de jogo"
        className={current ? "has-game-activity" : ""}
        onClick={() => {
          setName(game?.name || "");
          setOpen(true);
        }}
      >
        <Gamepad2 size={18} />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="game-activity-control">
          <DialogTitle>Minha atividade</DialogTitle>
          <DialogDescription>Mostre à comunidade o que você está jogando.</DialogDescription>
          {current && (
            <div className="game-activity-current">
              <Gamepad2 size={22} />
              <span>
                Jogando <strong>{current.name}</strong>
              </span>
              <Button
                variant="ghost"
                onClick={() => {
                  activity.stopGame();
                  setName("");
                }}
              >
                Limpar status
              </Button>
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (cleanGameName(name)) {
                activity.setCustomGame(name);
                setOpen(false);
              }
            }}
          >
            <label htmlFor="custom-game-name">Nome do jogo</label>
            <Input
              id="custom-game-name"
              value={name}
              maxLength={80}
              placeholder="Ex.: Roblox, FiveM ou Valorant"
              onChange={(event) => setName(event.target.value)}
            />
            <p>
              Jogos externos precisam ser informados aqui. O navegador não detecta jogos abertos no
              computador.
            </p>
            <p>
              O status informado dura até 2 horas enquanto você estiver online. Use “Limpar status”
              ao terminar. Jogos abertos pelos botões do site aparecem por até 30 minutos; partidas
              internas mantêm o status enquanto estão abertas.
            </p>
            <footer>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!cleanGameName(name)}>
                Exibir atividade
              </Button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
