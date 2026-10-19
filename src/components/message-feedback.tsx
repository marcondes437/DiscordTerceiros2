import { Bookmark, Pin } from "lucide-react";
import type { MessageMark } from "@/hooks/use-message-marks";

export function MessageFeedback({
  marks,
  userId,
  busy,
  onToggle,
}: {
  marks: MessageMark[];
  userId: string;
  busy: boolean;
  onToggle: (kind: MessageMark["kind"], value?: string) => void;
}) {
  const reactions = Array.from(
    new Set(marks.filter((m) => m.kind === "reaction").map((m) => m.value)),
  );
  return (
    <div className="message-feedback">
      {marks.some((m) => m.kind === "pin") && (
        <span title="Fixada na conversa">
          <Pin size={11} />
          Fixada
        </span>
      )}
      {marks.some((m) => m.kind === "favorite" && m.user_id === userId) && (
        <span title="Visível só para você">
          <Bookmark size={11} />
          Favorita
        </span>
      )}
      {reactions.map((emoji) => {
        const group = marks.filter((m) => m.kind === "reaction" && m.value === emoji);
        return (
          <button
            key={emoji}
            type="button"
            disabled={busy}
            aria-label={`Reagir com ${emoji}, ${group.length} reações`}
            aria-pressed={group.some((m) => m.user_id === userId)}
            onClick={() => onToggle("reaction", emoji)}
          >
            {emoji}
            <small>{group.length}</small>
          </button>
        );
      })}
    </div>
  );
}
