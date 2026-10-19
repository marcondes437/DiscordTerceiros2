import { useState } from "react";
import { EyeOff, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import "@/routes/message-delete-options.css";
export function MessageDeleteOptions({
  own,
  onHide,
  onDeleteForEveryone,
  className = "",
  label,
}: {
  own: boolean;
  onHide: () => void;
  onDeleteForEveryone?: () => Promise<boolean>;
  className?: string;
  label?: string;
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className}
        aria-label={label || "Apagar mensagem"}
        title="Apagar mensagem"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Trash2 size={15} />
      </Button>
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
