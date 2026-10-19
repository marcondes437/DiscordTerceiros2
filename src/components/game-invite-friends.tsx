import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useFriendships } from "@/hooks/use-friendships";
import { gamingDb } from "@/lib/gaming";
import { matchesPersonName } from "@/lib/friendships";
import { toast } from "sonner";
export function GameInviteFriends({ roomId, userId }: { roomId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        <UserPlus size={15} /> Convidar amigos
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="game-invite-dialog">
          <DialogTitle>Convidar amigos</DialogTitle>
          <DialogDescription>
            Escolha quem você quer chamar. O convite aparece nas notificações do seu amigo.
          </DialogDescription>
          {open && <FriendList roomId={roomId} userId={userId} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
function FriendList({ roomId, userId }: { roomId: string; userId: string }) {
  const friends = useFriendships(userId);
  const [people, setPeople] = useState<{ id: string; display_name: string }[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const ids = friends.rows
    .filter((f) => f.status === "accepted")
    .map((f) => (f.requester_id === userId ? f.recipient_id : f.requester_id))
    .sort()
    .join(",");
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    if (!ids) {
      setPeople([]);
      setLoading(false);
      return;
    }
    void Promise.all([
      gamingDb
        .from("social_profiles")
        .select("id,display_name")
        .in("id", ids.split(","))
        .order("display_name"),
      gamingDb
        .from("gaming_invitations")
        .select("recipient_id")
        .eq("room_id", roomId)
        .eq("sender_id", userId),
    ])
      .then(([p, i]) => {
        if (!live) return;
        if (p.error || i.error)
          setError("Não foi possível carregar os amigos. Feche e tente novamente.");
        else {
          setPeople(p.data ?? []);
          setSent((i.data ?? []).map((r: { recipient_id: string }) => r.recipient_id));
        }
        setLoading(false);
      })
      .catch(() => {
        if (live) {
          setError("Falha ao carregar os convites. Tente novamente.");
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [ids, roomId, userId]);
  async function invite(id: string) {
    if (busy || sent.includes(id)) return;
    setBusy(id);
    setError("");
    try {
      const result = await gamingDb
        .from("gaming_invitations")
        .insert({ room_id: roomId, sender_id: userId, recipient_id: id });
      if (result.error && result.error.code !== "23505") throw result.error;
      setSent((current) => [...current, id]);
      toast.success(result.error ? "Este amigo já recebeu o convite." : "Convite enviado!");
    } catch {
      setError(
        "Não foi possível convidar. Verifique se vocês ainda são amigos e se a sala está ativa.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="game-invite-friends">
      <input
        aria-label="Buscar amigo para convidar"
        placeholder="Buscar amigo pelo nome"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {(error || friends.error) && <p role="alert">{error || friends.error}</p>}
      {friends.loading || loading ? (
        <p role="status">Carregando amigos…</p>
      ) : !people.length ? (
        <p>Você ainda não tem amigos disponíveis para convidar. Adicione amigos na comunidade.</p>
      ) : (
        <div>
          {people
            .filter((p) => matchesPersonName(p.display_name, query))
            .map((p) => (
              <div className="game-invite-person" key={p.id}>
                <span>{p.display_name.slice(0, 1).toUpperCase()}</span>
                <strong>{p.display_name}</strong>
                <button
                  type="button"
                  disabled={!!busy || sent.includes(p.id)}
                  aria-label={`Convidar ${p.display_name}`}
                  onClick={() => void invite(p.id)}
                >
                  {sent.includes(p.id) ? "Enviado" : busy === p.id ? "Enviando…" : "Convidar"}
                </button>
              </div>
            ))}
          {!people.some((p) => matchesPersonName(p.display_name, query)) && (
            <p>Nenhum amigo encontrado com esse nome.</p>
          )}
        </div>
      )}
    </div>
  );
}
