import { useEffect } from "react";
import { Clock3, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useActivityPresence } from "./activity-presence";
import { useFriendships } from "@/hooks/use-friendships";
import { friendshipState } from "@/lib/friendships";
import "./profile-friend-button.css";

/** Mounted only while a profile card is open, using the existing friendship rules. */
export function ProfileFriendButton({ id, name }: { id: string; name: string }) {
  const { user } = useActivityPresence();
  const friends = useFriendships(user?.id);
  const state = friendshipState(friends.rows, user?.id, id);
  useEffect(() => {
    if (friends.error) toast.error(friends.error);
  }, [friends.error]);
  if (user?.id === id) return null;
  const label =
    state === "friend"
      ? `Você e ${name} já são amigos`
      : state === "outgoing"
        ? `Pedido de amizade enviado para ${name}`
        : state === "incoming"
          ? `Aceitar amizade de ${name}`
          : `Adicionar ${name} como amigo`;
  return (
    <button
      type="button"
      className="profile-friend-button"
      aria-label={label}
      title={label}
      disabled={
        !user || friends.loading || friends.busy || state === "friend" || state === "outgoing"
      }
      onClick={() => void friends.act(id, state === "incoming" ? "accept" : "request")}
    >
      {state === "outgoing" ? (
        <Clock3 size={16} />
      ) : state === "friend" || state === "incoming" ? (
        <UserCheck size={16} />
      ) : (
        <UserPlus size={16} />
      )}
      <span className="sr-only" aria-live="polite">
        {state === "outgoing"
          ? "Pedido de amizade enviado"
          : state === "friend"
            ? "Amizade aceita"
            : ""}
      </span>
    </button>
  );
}
