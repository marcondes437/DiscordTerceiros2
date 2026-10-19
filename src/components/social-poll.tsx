import { useCallback, useEffect, useState } from "react";
import { Check, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { SocialPost } from "@/lib/social";
const db = supabase as any;
type Results = { counts: number[]; total: number; choice: number | null; closed: boolean };
export function SocialPoll({ post }: { post: SocialPost }) {
  const [results, setResults] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const refresh = useCallback(
    async (clearError = true) => {
      try {
        const r = await db.rpc("social_poll_results", { p_post: post.id });
        if (r.error || !r.data) throw Error();
        setResults(r.data);
        if (clearError) setError("");
      } catch {
        setError("Não foi possível carregar a enquete.");
      }
    },
    [post.id],
  );
  useEffect(() => {
    let live = true;
    const update = () => {
      if (live && !document.hidden) {
        setNow(Date.now());
        void refresh();
      }
    };
    update();
    const timer = window.setInterval(update, 15000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [refresh]);
  const closed =
    results?.closed || (!!post.poll_closes_at && new Date(post.poll_closes_at).getTime() <= now);
  const showResults = closed || (results?.choice !== null && results?.choice !== undefined);
  const vote = async (choice: number) => {
    if (busy || closed || !results || results.choice !== null) return;
    setBusy(true);
    try {
      const r = await db.rpc("social_vote", { p_post: post.id, p_choice: choice });
      if (r.error) throw Error();
      await refresh();
    } catch {
      setError(
        "Não foi possível votar. A enquete pode ter encerrado ou seu voto já foi registrado.",
      );
      void refresh(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="social-poll" aria-label="Enquete">
      <div className="social-poll-options">
        {post.poll_options?.map((option, index) => {
          const count = results?.counts[index] ?? 0;
          const percent = results?.total ? Math.round((count / results.total) * 100) : 0;
          return showResults ? (
            <div
              key={index}
              className={`social-poll-result ${results?.choice === index ? "chosen" : ""}`}
            >
              <i style={{ width: `${percent}%` }} />
              <span>
                {option}
                {results?.choice === index && <Check size={13} />}
              </span>
              <b>{percent}%</b>
            </div>
          ) : (
            <button
              key={index}
              type="button"
              disabled={busy || !results}
              onClick={() => void vote(index)}
            >
              {option}
            </button>
          );
        })}
      </div>
      <small>
        <BarChart3 size={13} />
        {results
          ? `${results.total} ${results.total === 1 ? "voto" : "votos"}`
          : "Carregando…"} ·{" "}
        {closed
          ? "Encerrada"
          : post.poll_closes_at
            ? `Até ${new Date(post.poll_closes_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
            : ""}
      </small>
      {error && (
        <p role="alert">
          {error}
          <button onClick={() => void refresh()}>Tentar novamente</button>
        </p>
      )}
    </section>
  );
}
