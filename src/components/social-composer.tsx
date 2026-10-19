import { useRef } from "react";
import { BarChart3, Plus, Send, Trash2, X } from "lucide-react";
import { ChatMediaPicker } from "./chat-media-picker";
import { ChatDraftMedia } from "./chat-message-content";
import { validPollOptions, type SocialDraft, type SocialPost } from "@/lib/social";
type Props = {
  userId: string | undefined;
  name: string;
  draft: SocialDraft;
  update: (value: Partial<SocialDraft>) => void;
  busy: boolean;
  publish: () => void;
  context: SocialPost[];
  contextLoading: boolean;
};
export function SocialComposer({
  userId,
  name,
  draft,
  update,
  busy,
  publish,
  context,
  contextLoading,
}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const changeBody = (value: string, index: number) =>
    update({ bodies: draft.bodies.map((body, i) => (i === index ? value : body)) });
  const quote = context.find((p) => p.id === draft.quoteId);
  const reply = context.find((p) => p.id === draft.parentId);
  const invalid =
    draft.bodies.some((body) => !body.trim() || body.length > 500) ||
    !validPollOptions(draft.options) ||
    (!!draft.options && !!draft.quoteId) ||
    contextLoading ||
    (!!draft.quoteId && !quote) ||
    (!!draft.parentId && !reply);
  return (
    <section className="social-compose" aria-label="Criar publicação">
      <div className="social-avatar">{name.slice(0, 1).toUpperCase()}</div>
      <div className="social-compose-body">
        {draft.parentId && (
          <div className="social-reply-label">
            {contextLoading
              ? "Carregando conversa…"
              : reply
                ? `Respondendo a ${reply.author_name}`
                : "Publicação indisponível"}
            <button type="button" onClick={() => update({ parentId: null })}>
              Cancelar resposta
            </button>
          </div>
        )}
        {draft.bodies.map((body, index) => (
          <div className="social-thread-piece" key={index}>
            {index > 0 && (
              <div className="social-thread-piece-label">
                <span>Parte {index + 1} da sequência</span>
                <button
                  type="button"
                  aria-label={`Remover parte ${index + 1}`}
                  disabled={busy}
                  onClick={() => update({ bodies: draft.bodies.filter((_, i) => i !== index) })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            <textarea
              ref={index === 0 ? input : undefined}
              maxLength={500}
              value={body}
              disabled={busy}
              onChange={(e) => changeBody(e.target.value, index)}
              placeholder={index === 0 ? "O que está acontecendo?" : "Continue sua ideia…"}
              aria-label={index === 0 ? "Nova publicação" : `Parte ${index + 1} da sequência`}
            />
            <small className="social-character-count">{body.length}/500</small>
          </div>
        ))}
        {draft.quoteId && (
          <div className="social-compose-quote">
            <strong>
              {contextLoading
                ? "Carregando citação…"
                : quote?.author_name || "Publicação indisponível"}
            </strong>
            <p>{quote?.body}</p>
            <button
              type="button"
              aria-label="Remover citação"
              onClick={() => update({ quoteId: null })}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {draft.options && (
          <div className="social-poll-editor">
            <header>
              <strong>Criar enquete</strong>
              <button
                type="button"
                aria-label="Remover enquete"
                disabled={busy}
                onClick={() => update({ options: null })}
              >
                <X size={15} />
              </button>
            </header>
            {draft.options.map((option, index) => (
              <input
                key={index}
                aria-label={`Opção ${index + 1}`}
                placeholder={`Opção ${index + 1}`}
                value={option}
                maxLength={25}
                disabled={busy}
                onChange={(e) =>
                  update({
                    options: draft.options!.map((value, i) =>
                      i === index ? e.target.value : value,
                    ),
                  })
                }
              />
            ))}
            {draft.options.length < 4 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => update({ options: [...draft.options!, ""] })}
              >
                <Plus size={14} />
                Adicionar opção
              </button>
            )}
            <label>
              Duração
              <select
                aria-label="Duração da enquete"
                disabled={busy}
                value={draft.duration}
                onChange={(e) => update({ duration: Number(e.target.value) })}
              >
                <option value={5}>5 minutos</option>
                <option value={60}>1 hora</option>
                <option value={1440}>1 dia</option>
                <option value={4320}>3 dias</option>
                <option value={10080}>7 dias</option>
              </select>
            </label>
            <small>2 a 4 opções diferentes. Um voto privado por pessoa.</small>
          </div>
        )}
        {!draft.options && (
          <ChatDraftMedia
            draft={draft.bodies[0] || ""}
            onChange={(value) => changeBody(value, 0)}
          />
        )}
        <div className="social-composer-tools">
          <div>
            {!draft.options && (
              <ChatMediaPicker
                draft={draft.bodies[0] || ""}
                onChange={(value) => changeBody(value, 0)}
                inputRef={input}
                limit={500}
                userId={userId}
                disabled={busy || !userId}
              />
            )}
            <button
              type="button"
              title="Criar enquete"
              aria-label="Criar enquete"
              disabled={busy || !!draft.quoteId || !!draft.options}
              onClick={() => update({ options: ["", ""] })}
            >
              <BarChart3 size={19} />
            </button>
            <button
              type="button"
              title="Adicionar publicação à sequência"
              aria-label="Adicionar publicação à sequência"
              disabled={busy || draft.bodies.length >= 8 || !draft.bodies.at(-1)?.trim()}
              onClick={() => update({ bodies: [...draft.bodies, ""] })}
            >
              <Plus size={19} />
            </button>
          </div>
          <button
            type="button"
            className="social-primary-button"
            disabled={busy || invalid}
            onClick={publish}
          >
            <Send size={15} />
            {busy ? "Publicando…" : draft.bodies.length > 1 ? "Publicar sequência" : "Publicar"}
          </button>
        </div>
        <small className="social-draft-note">Rascunho salvo neste navegador para sua conta.</small>
      </div>
    </section>
  );
}
