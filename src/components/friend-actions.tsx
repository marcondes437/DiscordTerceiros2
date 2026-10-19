import type { FriendAction, FriendshipState } from "@/lib/friendships";
export function FriendActions({
  state,
  busy,
  onAction,
  canMessage = false,
  onMessage,
  allowConversationRequest = false,
  messageRequest = false,
}: {
  state: FriendshipState;
  busy: boolean;
  onAction: (action: FriendAction) => void;
  canMessage?: boolean;
  onMessage?: () => void;
  allowConversationRequest?: boolean;
  messageRequest?: boolean;
}) {
  return (
    <div className="friend-actions">
      {state === "none" && (
        <>
          <button type="button" disabled={busy} onClick={() => onAction("request")}>
            Adicionar amigo
          </button>
          {allowConversationRequest && (
            <button
              type="button"
              className="friend-secondary"
              disabled={busy}
              onClick={() => onAction("request-message")}
            >
              Solicitar conversa
            </button>
          )}
        </>
      )}
      {state === "incoming" && (
        <>
          <button type="button" disabled={busy} onClick={() => onAction("accept")}>
            {messageRequest ? "Aceitar e adicionar amigo" : "Aceitar"}
          </button>
          <button
            type="button"
            className="friend-secondary"
            disabled={busy}
            onClick={() => onAction("remove")}
          >
            Recusar
          </button>
        </>
      )}
      {state === "outgoing" && (
        <>
          <span>Pedido enviado</span>
          <button
            type="button"
            className="friend-secondary"
            disabled={busy}
            onClick={() => onAction("remove")}
          >
            Cancelar pedido
          </button>
        </>
      )}
      {state === "friend" && (
        <>
          {canMessage && (
            <button type="button" onClick={onMessage}>
              Mensagem
            </button>
          )}
          <button
            type="button"
            className="friend-secondary"
            disabled={busy}
            onClick={() => onAction("remove")}
          >
            Remover amigo
          </button>
        </>
      )}
    </div>
  );
}
