import { useRef, useState, type ComponentProps } from "react";
import { Bookmark, Forward, Pencil, Pin, SmilePlus } from "lucide-react";
import { MessageDeleteOptions } from "./message-delete-options";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { MessageKind, MessageMark } from "@/hooks/use-message-marks";
import { matchesPersonName } from "@/lib/friendships";
import { toast } from "sonner";

const db = supabase as any;
const quick = ["😂", "👌", "✅"];
const emojis = [
  ...quick,
  "❤️",
  "🔥",
  "👍",
  "👎",
  "🎉",
  "😮",
  "😢",
  "🤣",
  "🥰",
  "😍",
  "🤔",
  "👀",
  "💀",
  "💯",
  "🙏",
  "👏",
  "🚀",
  "🎮",
  "🫡",
  "😎",
  "🤝",
];
type Friend = { id: string; display_name: string };
type Props = ComponentProps<typeof MessageDeleteOptions> & {
  messageId: string;
  kind: MessageKind;
  userId: string;
  marks: MessageMark[];
  marksBusy: boolean;
  onToggle: (kind: MessageMark["kind"], value?: string) => void;
  onEdited: (content: string) => void;
};
export function MessageActions({
  messageId,
  kind,
  userId,
  marks,
  marksBusy,
  onToggle,
  onEdited,
  ...props
}: Props) {
  const [dialog, setDialog] = useState<"edit" | "forward" | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState("");
  const limit = kind === "channel" ? 4000 : 2000;
  const ownPin = marks.some((m) => m.kind === "pin" && m.user_id === userId);
  const favorite = marks.some((m) => m.kind === "favorite" && m.user_id === userId);
  const openForward = async () => {
    setDialog("forward");
    setFriends([]);
    setRecipient("");
    setQuery("");
    setError("");
    setLoading(true);
    try {
      const relations = await db
        .from("community_friendships")
        .select("requester_id,recipient_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
      if (relations.error) throw Error();
      const ids = (relations.data ?? []).map((f: { requester_id: string; recipient_id: string }) =>
        f.requester_id === userId ? f.recipient_id : f.requester_id,
      );
      if (!ids.length) return;
      const people = await db
        .from("social_profiles")
        .select("id,display_name")
        .in("id", ids)
        .order("display_name");
      if (people.error) throw Error();
      setFriends(people.data ?? []);
    } catch {
      setError("Não foi possível carregar seus amigos. Feche e tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  const submit = async () => {
    if (lock.current) return;
    if (dialog === "edit" && (!props.own || !draft.trim() || draft.length > limit)) return;
    if (dialog === "forward" && !friends.some((f) => f.id === recipient)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (dialog === "edit") {
        const table = kind === "channel" ? "community_messages" : "direct_messages";
        const column = kind === "channel" ? "content" : "body";
        const owner = kind === "channel" ? "user_id" : "sender_id";
        const result = await db
          .from(table)
          .update({ [column]: draft.trim() })
          .eq("id", messageId)
          .eq(owner, userId)
          .select("id");
        if (result.error || !result.data?.some((r: { id: string }) => r.id === messageId))
          throw Error();
        onEdited(draft.trim());
        toast.success("Mensagem editada");
      } else {
        const body = `↪ Encaminhada\n${props.content || ""}`;
        if (body.length > 2000) {
          setError("Esta mensagem ultrapassa o limite de 2.000 caracteres das conversas privadas.");
          return;
        }
        const result = await db
          .from("direct_messages")
          .insert({ sender_id: userId, recipient_id: recipient, body })
          .select("id");
        if (result.error || !result.data?.length) throw Error();
        toast.success("Mensagem encaminhada");
      }
      setDialog(null);
    } catch {
      setError("Não foi possível salvar. Verifique sua conexão e tente novamente.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <MessageDeleteOptions
        {...props}
        toolbarExtras={
          <>
            {quick.map((emoji) => (
              <button
                key={emoji}
                type="button"
                disabled={marksBusy}
                aria-label={`Reagir com ${emoji}`}
                title={`Reagir com ${emoji}`}
                onClick={() => onToggle("reaction", emoji)}
              >
                {emoji}
              </button>
            ))}
          </>
        }
        menuExtras={
          <>
            <div className="message-quick-reactions">
              {quick.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={marksBusy}
                  aria-label={`Reagir com ${emoji}`}
                  onClick={() => onToggle("reaction", emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <SmilePlus size={17} />
                Adicionar reação
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="message-reaction-menu">
                <div>
                  {emojis.map((emoji) => (
                    <DropdownMenuItem
                      key={emoji}
                      disabled={marksBusy}
                      aria-label={`Reagir com ${emoji}`}
                      onSelect={() => onToggle("reaction", emoji)}
                    >
                      {emoji}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {props.own && (
              <DropdownMenuItem
                onSelect={() => {
                  setDraft(props.content || "");
                  setError("");
                  setDialog("edit");
                }}
              >
                <Pencil size={17} />
                Editar mensagem
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => void openForward()}>
              <Forward size={17} />
              Encaminhar
            </DropdownMenuItem>
            <DropdownMenuItem disabled={marksBusy} onSelect={() => onToggle("pin")}>
              <Pin size={17} />
              {ownPin ? "Desafixar mensagem" : "Fixar mensagem"}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={marksBusy} onSelect={() => onToggle("favorite")}>
              <Bookmark size={17} />
              {favorite ? "Remover dos favoritos" : "Favoritar mensagem"}
            </DropdownMenuItem>
          </>
        }
      />
      <Dialog
        open={dialog !== null}
        onOpenChange={(next) => {
          if (!next && !busy) setDialog(null);
        }}
      >
        <DialogContent className="message-command-dialog">
          <DialogTitle>{dialog === "edit" ? "Editar mensagem" : "Encaminhar mensagem"}</DialogTitle>
          <DialogDescription>
            {dialog === "edit"
              ? "Altere o texto e salve para todos os participantes."
              : "Escolha um amigo para receber esta mensagem em uma conversa privada."}
          </DialogDescription>
          {dialog === "edit" ? (
            <textarea
              aria-label="Texto da mensagem"
              value={draft}
              maxLength={limit}
              rows={5}
              onChange={(e) => setDraft(e.target.value)}
              disabled={busy}
            />
          ) : (
            <>
              <blockquote>{props.content}</blockquote>
              <Input
                aria-label="Buscar amigo para encaminhar"
                placeholder="Buscar amigo pelo nome"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={busy}
              />
              <div className="message-forward-friends">
                {loading ? (
                  <p>Carregando amigos…</p>
                ) : (
                  friends
                    .filter((f) => matchesPersonName(f.display_name, query))
                    .map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        disabled={busy}
                        aria-pressed={recipient === f.id}
                        onClick={() => setRecipient(f.id)}
                      >
                        {f.display_name}
                      </button>
                    ))
                )}
                {!loading && !friends.length && !error && (
                  <p>Adicione e aceite amigos para encaminhar mensagens.</p>
                )}
                {!loading &&
                  friends.length > 0 &&
                  !friends.some((f) => matchesPersonName(f.display_name, query)) && (
                    <p>Nenhum amigo encontrado.</p>
                  )}
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="message-delete-error">
              {error}
            </p>
          )}
          <footer>
            <Button variant="ghost" disabled={busy} onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button
              disabled={busy || loading || (dialog === "edit" ? !draft.trim() : !recipient)}
              onClick={() => void submit()}
            >
              {busy ? "Salvando…" : dialog === "edit" ? "Salvar alterações" : "Encaminhar"}
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    </>
  );
}
