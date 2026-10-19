import { useState, type ReactNode } from "react";
import { Copy, EyeOff, MoreHorizontal, Reply, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import "@/routes/message-delete-options.css";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
export function MessageDeleteOptions({
  own,
  onHide,
  onDeleteForEveryone,
  className = "",
  label,
  content,
  onReply,
  menuExtras,
  toolbarExtras,
}: {
  own: boolean;
  onHide: () => void;
  onDeleteForEveryone?: () => Promise<boolean>;
  className?: string;
  label?: string;
  content?: string;
  onReply?: () => void;
  menuExtras?: ReactNode;
  toolbarExtras?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const removeAll = async () => {
    if (!own || !onDeleteForEveryone || busy) return;
    setBusy(true);
    setError("");
    try {
      if (await onDeleteForEveryone()) setOpen(false);
      else setError("Não foi possível apagar. Tente novamente.");
    } catch {
      setError("Não foi possível apagar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className={`message-action-bar ${className}`}>
        {toolbarExtras}
        {onReply && (
          <button type="button" aria-label="Responder mensagem" title="Responder" onClick={onReply}>
            <Reply size={17} />
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={label || "Mais opções da mensagem"}
              title="Mais opções"
            >
              <MoreHorizontal size={19} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="message-context-menu">
            {menuExtras}
            {onReply && (
              <DropdownMenuItem onSelect={onReply}>
                <Reply size={17} />
                Responder
              </DropdownMenuItem>
            )}
            {content !== undefined && (
              <DropdownMenuItem
                onSelect={() => {
                  if (!navigator.clipboard) {
                    toast.error("Seu navegador não permite copiar o texto.");
                    return;
                  }
                  void navigator.clipboard.writeText(content).then(
                    () => toast.success("Texto copiado"),
                    () => toast.error("Não foi possível copiar o texto."),
                  );
                }}
              >
                <Copy size={17} />
                Copiar texto
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="message-context-delete"
              onSelect={() => {
                setError("");
                setOpen(true);
              }}
            >
              <Trash2 size={17} />
              Excluir mensagem
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent className="message-delete-dialog">
          <DialogTitle>Apagar mensagem</DialogTitle>
          <DialogDescription>Escolha como deseja remover esta mensagem.</DialogDescription>
          <div className="message-delete-choices">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                onHide();
                setOpen(false);
              }}
            >
              <EyeOff size={17} />
              <span>
                <strong>Apagar para mim</strong>
                <small>Oculta só para sua conta neste navegador.</small>
              </span>
            </Button>
            {own && onDeleteForEveryone && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => void removeAll()}
              >
                <Trash2 size={17} />
                <span>
                  <strong>{busy ? "Apagando…" : "Apagar para todos"}</strong>
                  <small>Remove sua mensagem da conversa para todos.</small>
                </span>
              </Button>
            )}
          </div>
          {error && (
            <p className="message-delete-error" role="alert">
              {error}
            </p>
          )}
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
