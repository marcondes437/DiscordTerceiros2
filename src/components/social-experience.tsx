import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Bookmark, RefreshCw, Search, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSocialConnections, useSocialDraft, useSocialFeed } from "@/hooks/use-social";
import { postShareUrl, validPollOptions, type SocialMode, type SocialPost } from "@/lib/social";
import { SocialSiteShell } from "./social-site-shell";
import { CommunityAuth } from "./community-auth";
import { SocialComposer } from "./social-composer";
import { SocialPostCard, type SocialAction } from "./social-post-card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import "@/routes/social.css";
import "@/routes/social-features.css";
const db = supabase as any;
export const socialDisplayName = (user: User | null) =>
  String(
    user?.user_metadata?.["display_name"] ||
      user?.user_metadata?.["full_name"] ||
      user?.email?.split("@")[0] ||
      "Visitante",
  );
export function SocialExperience({
  user,
  focusedPost,
}: {
  user: User | null;
  focusedPost?: string | undefined;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<SocialMode>("todos");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mutationId = useRef(0);
  const [thread, setThread] = useState<string | null>(focusedPost ?? null);
  const [threadPosts, setThreadPosts] = useState<SocialPost[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [replyPage, setReplyPage] = useState(0);
  const [moreReplies, setMoreReplies] = useState(false);
  const [version, setVersion] = useState(0);
  const [context, setContext] = useState<SocialPost[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [command, setCommand] = useState<{
    kind: "edit" | "delete" | "report";
    post: SocialPost;
  } | null>(null);
  const [commandText, setCommandText] = useState("");
  const [mutedOpen, setMutedOpen] = useState(false);
  const composerArea = useRef<HTMLDivElement>(null);
  const composer = useSocialDraft(user?.id);
  const feed = useSocialFeed(user?.id, mode, query, profile);
  const connections = useSocialConnections(user?.id);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(queryInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);
  useEffect(() => {
    setThread(focusedPost ?? null);
    setReplyPage(0);
  }, [focusedPost]);
  useEffect(() => {
    if (focusedPost && user?.id) composer.update({ parentId: focusedPost });
  }, [focusedPost, user?.id]);
  useEffect(() => {
    mutationId.current++;
    lock.current = false;
    setBusy(false);
    setCommand(null);
    setContext([]);
    setThreadPosts([]);
    setProfile(null);
    setMutedOpen(false);
  }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    void db
      .from("social_profiles")
      .upsert(
        { id: user.id, display_name: socialDisplayName(user).slice(0, 60) },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .then(() => connections.refresh());
  }, [user?.id]);
  useEffect(() => {
    const ids = [composer.draft.parentId, composer.draft.quoteId].filter(
      (id): id is string => !!id,
    );
    setContext([]);
    if (!user || !ids.length) {
      setContextLoading(false);
      return;
    }
    let live = true;
    setContextLoading(true);
    void (async () => {
      try {
        const r = await db.rpc("social_post_details", { p_ids: ids });
        if (live && !r.error) setContext(r.data ?? []);
      } catch {
        /* Unavailable context stays removable. */
      } finally {
        if (live) setContextLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [user?.id, composer.draft.parentId, composer.draft.quoteId, version]);
  useEffect(() => {
    if (!user || !thread) {
      setThreadPosts([]);
      return;
    }
    let live = true;
    setThreadLoading(true);
    setThreadError("");
    if (!replyPage) setThreadPosts([]);
    void (async () => {
      try {
        const replies = await db
          .from("social_posts")
          .select("id")
          .eq("parent_id", thread)
          .order("created_at")
          .order("id")
          .range(replyPage * 20, replyPage * 20 + 19);
        if (replies.error) throw replies.error;
        const r = await db.rpc("social_post_details", {
          p_ids: [thread, ...(replies.data ?? []).map((p: { id: string }) => p.id)],
        });
        if (r.error) throw r.error;
        if (live) {
          setThreadPosts((previous) =>
            replyPage
              ? [
                  ...previous,
                  ...(r.data ?? []).filter(
                    (p: SocialPost) => !previous.some((old) => old.id === p.id),
                  ),
                ]
              : (r.data ?? []),
          );
          setMoreReplies(replies.data?.length === 20);
        }
      } catch {
        if (live) setThreadError("Não foi possível carregar a conversa.");
      } finally {
        if (live) setThreadLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [thread, user?.id, replyPage, version]);
  const requireUser = () => {
    if (user) return true;
    setAuthOpen(true);
    return false;
  };
  const mutate = async (task: () => Promise<any>, success?: string) => {
    if (!requireUser() || lock.current) return false;
    lock.current = true;
    const run = ++mutationId.current;
    setBusy(true);
    const owner = user?.id;
    try {
      const r = await task();
      if (r?.error) throw r.error;
      if (identity.current !== owner || mutationId.current !== run) return false;
      if (success) toast.success(success);
      await Promise.all([feed.refresh(), connections.refresh()]);
      if (identity.current !== owner || mutationId.current !== run) return false;
      setReplyPage(0);
      setVersion((v) => v + 1);
      return true;
    } catch {
      if (identity.current === owner)
        toast.error("Não foi possível concluir a ação. Tente novamente.");
      return false;
    } finally {
      if (mutationId.current === run) {
        lock.current = false;
        if (identity.current === owner) setBusy(false);
      }
    }
  };
  const focusComposer = () =>
    window.setTimeout(() => {
      composerArea.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      composerArea.current?.querySelector("textarea")?.focus();
    }, 0);
  const openThread = (id: string) => {
    setThread(id);
    setReplyPage(0);
    composer.update({ parentId: id });
  };
  const openProfile = (id: string) => {
    setThread(null);
    setProfile(id);
    setMode("todos");
    setQueryInput("");
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const searchTag = (tag: string) => {
    setThread(null);
    setQueryInput(tag);
    setProfile(null);
    setMode("todos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const mention = (handle: string) => {
    const people = connections.people.filter((p) => p.id.startsWith(handle));
    if (people.length === 1) openProfile(people[0]!.id);
    else toast.info("Este perfil não está disponível.");
  };
  const follow = (id: string) =>
    mutate(() =>
      connections.following.includes(id)
        ? db.from("social_follows").delete().eq("follower_id", user!.id).eq("following_id", id)
        : db.from("social_follows").insert({ follower_id: user!.id, following_id: id }),
    );
  const action = async (kind: SocialAction, post: SocialPost) => {
    if (kind === "copy" || kind === "share") {
      try {
        const url = postShareUrl(post.id);
        if (kind === "share" && navigator.share)
          await navigator.share({ title: `Publicação de ${post.author_name}`, url });
        else {
          await navigator.clipboard.writeText(url);
          toast.success("Link copiado");
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError"))
          toast.error("Não foi possível compartilhar. Tente copiar o link pelo menu.");
      }
      return;
    }
    if (!requireUser() || busy) return;
    if (kind === "quote") {
      if (composer.draft.options) {
        toast.info("Remova a enquete do rascunho antes de adicionar uma citação.");
        return;
      }
      composer.update({ quoteId: post.id });
      setThread(null);
      focusComposer();
      return;
    }
    if (kind === "edit" || kind === "delete" || kind === "report") {
      if ((kind === "edit" || kind === "delete") && post.author_id !== user!.id) return;
      setCommand({ kind, post });
      setCommandText(kind === "edit" ? post.body : "");
      return;
    }
    if (kind === "follow") {
      await follow(post.author_id);
      return;
    }
    if (kind === "mute") {
      await mutate(
        () => db.from("social_mutes").insert({ user_id: user!.id, muted_id: post.author_id }),
        "Pessoa silenciada no seu feed. Você pode desfazer em Silenciados.",
      );
      return;
    }
    if (kind === "pin") {
      await mutate(
        () => db.rpc("social_pin", { p_post: post.pinned ? null : post.id }),
        post.pinned ? "Publicação desafixada" : "Publicação fixada no seu perfil",
      );
      return;
    }
    const table =
      kind === "like"
        ? "social_likes"
        : kind === "bookmark"
          ? "social_bookmarks"
          : "social_reposts";
    const exists =
      kind === "like" ? post.liked : kind === "bookmark" ? post.bookmarked : post.reposted;
    await mutate(() =>
      exists
        ? db.from(table).delete().eq("post_id", post.id).eq("user_id", user!.id)
        : db.from(table).insert({ post_id: post.id, user_id: user!.id }),
    );
  };
  const publish = async () => {
    if (
      composer.draft.bodies.some((b) => !b.trim() || b.length > 500) ||
      !validPollOptions(composer.draft.options)
    )
      return;
    const ok = await mutate(
      () =>
        db.rpc("social_publish", {
          p_bodies: composer.draft.bodies.map((body) => body.trim()),
          p_parent: thread || composer.draft.parentId,
          p_quote: composer.draft.quoteId,
          p_options: composer.draft.options?.map((o) => o.trim()) ?? null,
          p_duration: composer.draft.duration,
        }),
      "Publicado!",
    );
    if (ok) composer.reset();
  };
  const submitCommand = async () => {
    if (!command) return;
    const { post, kind } = command;
    if (
      (kind === "edit" && (!commandText.trim() || commandText.length > 500)) ||
      (kind === "report" && commandText.trim().length < 5)
    )
      return;
    const ok = await mutate(
      async () => {
        if (kind === "report")
          return db.from("social_reports").insert({
            reporter_id: user!.id,
            post_id: post.id,
            reason: commandText.trim().slice(0, 500),
          });
        const q =
          kind === "edit"
            ? db.from("social_posts").update({ body: commandText.trim() })
            : db.from("social_posts").delete();
        const r = await q.eq("id", post.id).eq("author_id", user!.id).select("id");
        if (!r.error && !r.data?.length) throw Error();
        return r;
      },
      kind === "edit"
        ? "Publicação editada"
        : kind === "delete"
          ? "Publicação excluída"
          : "Denúncia enviada para análise",
    );
    if (ok) {
      setCommand(null);
      if (kind === "delete" && thread === post.id) setThread(null);
    }
  };
  const renderPost = (post: SocialPost) => (
    <SocialPostCard
      key={post.entry_id || post.id}
      post={post}
      selfId={user?.id}
      busy={busy}
      following={connections.following.includes(post.author_id)}
      onAction={(kind, p) => void action(kind, p)}
      onOpen={openThread}
      onProfile={openProfile}
      onTag={searchTag}
      onMention={mention}
    />
  );
  const renderComposer = () => (
    <div ref={composerArea}>
      <SocialComposer
        userId={user?.id}
        name={socialDisplayName(user)}
        draft={thread ? { ...composer.draft, parentId: thread } : composer.draft}
        update={(value) => {
          if (thread && value.parentId === null) setThread(null);
          composer.update(value);
        }}
        busy={busy}
        publish={() => void publish()}
        context={
          threadPosts.find((p) => p.id === thread)
            ? [...context, threadPosts.find((p) => p.id === thread)!]
            : context
        }
        contextLoading={contextLoading || (!!thread && threadLoading)}
      />
    </div>
  );
  const profileName =
    connections.people.find((p) => p.id === profile)?.display_name ||
    (profile === user?.id ? socialDisplayName(user) : "Perfil da comunidade");
  const threadRoot = threadPosts.find((p) => p.id === thread);
  const trends = new Map<string, number>();
  [...new Map(feed.posts.map((p) => [p.id, p])).values()].forEach((p) =>
    new Set(p.body.toLowerCase().match(/#[\p{L}\p{N}_]+/gu) || []).forEach((tag) =>
      trends.set(tag, (trends.get(tag) || 0) + 1),
    ),
  );
  return (
    <SocialSiteShell user={user} name={socialDisplayName(user)} onSignIn={() => setAuthOpen(true)}>
      <div className="social-page">
        <div className="social-app">
          <div className="social-layout">
            <main className="social-main">
              <header className="social-feed-heading">
                <div>
                  <small>O QUE A TURMA ESTÁ FALANDO</small>
                  <h1>
                    Social<span>.</span>
                  </h1>
                </div>
                <button
                  type="button"
                  title="Atualizar feed"
                  aria-label="Atualizar feed"
                  disabled={feed.loading}
                  onClick={() => void feed.refresh()}
                >
                  <RefreshCw size={18} />
                </button>
              </header>
              <nav className="social-tabs" aria-label="Feeds do Social">
                {(
                  [
                    ["todos", "Para você"],
                    ["seguindo", "Seguindo"],
                    ["salvos", "Salvos"],
                    ["meus", "Meu perfil"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    className={mode === id && !profile ? "active" : ""}
                    aria-current={mode === id && !profile ? "page" : undefined}
                    onClick={() => {
                      setProfile(null);
                      setMode(id);
                    }}
                  >
                    {id === "salvos" && <Bookmark size={14} />} {label}
                  </button>
                ))}
              </nav>
              <div className="social-feed-description">
                {profile ? (
                  <>
                    <button onClick={() => setProfile(null)} aria-label="Voltar ao feed">
                      <ArrowLeft size={15} />
                    </button>
                    <strong>{profileName}</strong>
                    {profile !== user?.id && (
                      <button disabled={busy} onClick={() => void follow(profile)}>
                        {connections.following.includes(profile) ? "Seguindo" : "Seguir"}
                      </button>
                    )}
                  </>
                ) : mode === "todos" ? (
                  "Recentes e em alta, ordenadas por tempo e interações da comunidade."
                ) : mode === "seguindo" ? (
                  "Publicações e reposts de quem você segue, dos mais recentes para os antigos."
                ) : mode === "salvos" ? (
                  "Suas publicações salvas são privadas."
                ) : (
                  "Suas publicações, sequências e reposts."
                )}
              </div>
              {!thread && renderComposer()}
              {feed.error && (
                <div className="social-error" role="alert">
                  {feed.error}
                  <button onClick={() => void feed.refresh()}>Tentar novamente</button>
                </div>
              )}
              {feed.posts.map(renderPost)}
              {feed.loading && <p className="social-status">Carregando publicações…</p>}
              {!feed.loading && !feed.error && !feed.posts.length && (
                <div className="social-empty">
                  <EmptyFeed mode={mode} query={query} />
                </div>
              )}
              {feed.more && (
                <button
                  className="social-load-more"
                  disabled={feed.loading}
                  onClick={() => void feed.loadMore()}
                >
                  Carregar mais publicações
                </button>
              )}
            </main>
            <aside className="social-right">
              <label className="social-search">
                <Search size={17} />
                <input
                  aria-label="Buscar no Social"
                  maxLength={100}
                  placeholder="Buscar texto, pessoa ou #assunto"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                />
                {queryInput && (
                  <button aria-label="Limpar busca" onClick={() => setQueryInput("")}>
                    <X size={14} />
                  </button>
                )}
              </label>
              <section className="social-info">
                <h3>Sua comunidade</h3>
                <div className="social-stats">
                  <span>
                    <strong>{connections.followers}</strong>seguidores
                  </span>
                  <span>
                    <strong>{connections.following.length}</strong>seguindo
                  </span>
                </div>
                <button
                  className="social-profile-link"
                  onClick={() => {
                    setProfile(null);
                    setMode("meus");
                  }}
                >
                  Ver meu perfil social
                </button>
                <button className="social-muted-link" onClick={() => setMutedOpen(true)}>
                  <VolumeX size={14} />
                  Silenciados ({connections.muted.length})
                </button>
              </section>
              <section className="social-info social-trends">
                <h3>
                  Assuntos deste feed <span>#</span>
                </h3>
                {[...trends.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([tag, count]) => (
                    <button className="social-trend" key={tag} onClick={() => searchTag(tag)}>
                      <small>NAS PUBLICAÇÕES CARREGADAS</small>
                      <strong>{tag}</strong>
                      <span>
                        {count} {count === 1 ? "publicação" : "publicações"}
                      </span>
                    </button>
                  ))}
                {!trends.size && (
                  <p>Use hashtags para conectar suas publicações aos assuntos da turma.</p>
                )}
              </section>
              <section className="social-info">
                <h3>Quem acompanhar</h3>
                {connections.people
                  .filter(
                    (p) =>
                      p.id !== user?.id &&
                      !connections.following.includes(p.id) &&
                      !connections.muted.includes(p.id),
                  )
                  .slice(0, 5)
                  .map((p) => (
                    <div className="social-person" key={p.id}>
                      <button className="social-avatar" onClick={() => openProfile(p.id)}>
                        {p.display_name.slice(0, 1)}
                      </button>
                      <button className="social-suggested-name" onClick={() => openProfile(p.id)}>
                        {p.display_name}
                      </button>
                      <button disabled={busy} onClick={() => void follow(p.id)}>
                        Seguir
                      </button>
                    </div>
                  ))}
              </section>
              <footer className="social-footer">
                SENAI Conecta · Feito para conversar com a turma.
              </footer>
            </aside>
          </div>
        </div>
        <Dialog
          open={!!thread}
          onOpenChange={(open) => {
            if (!open) setThread(null);
          }}
        >
          <DialogContent className="social-dialog social-conversation-dialog">
            <DialogTitle>Conversa</DialogTitle>
            <DialogDescription>Respostas e publicações conectadas.</DialogDescription>
            <div className="social-conversation-scroll">
              {threadError ? (
                <p role="alert">
                  {threadError}
                  <button onClick={() => setVersion((v) => v + 1)}>Tentar novamente</button>
                </p>
              ) : threadRoot ? (
                <>
                  {renderPost(threadRoot)}
                  <h3 className="social-replies-heading">Respostas</h3>
                  {threadPosts
                    .filter((p) => p.parent_id === thread)
                    .sort(
                      (a, b) =>
                        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
                    )
                    .map(renderPost)}
                  {!threadPosts.some((p) => p.parent_id === thread) && !threadLoading && (
                    <p className="social-no-replies">Seja o primeiro a responder.</p>
                  )}
                  {moreReplies && (
                    <button
                      className="social-load-more"
                      disabled={threadLoading}
                      onClick={() => setReplyPage((n) => n + 1)}
                    >
                      Carregar mais respostas
                    </button>
                  )}
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      composer.update({ parentId: thread });
                      focusComposer();
                    }}
                  >
                    Responder a {threadRoot.author_name}
                  </Button>
                </>
              ) : (
                !threadLoading && <p>Esta publicação foi removida ou não está disponível.</p>
              )}
              {threadLoading && <p>Carregando conversa…</p>}
              {renderComposer()}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!command}
          onOpenChange={(open) => {
            if (!open && !busy) setCommand(null);
          }}
        >
          <DialogContent className="social-dialog social-command-dialog">
            <DialogTitle>
              {command?.kind === "edit"
                ? "Editar publicação"
                : command?.kind === "delete"
                  ? "Excluir publicação"
                  : "Denunciar publicação"}
            </DialogTitle>
            <DialogDescription>
              {command?.kind === "delete"
                ? "Sua publicação será excluída para todos. Esta ação não pode ser desfeita."
                : command?.kind === "report"
                  ? "Descreva o problema. A denúncia fica disponível apenas à administração."
                  : "O texto atualizado ficará visível para a comunidade."}
            </DialogDescription>
            {command?.kind !== "delete" && (
              <textarea
                aria-label={command?.kind === "edit" ? "Texto da publicação" : "Motivo da denúncia"}
                maxLength={500}
                rows={6}
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
              />
            )}
            <footer>
              <Button variant="ghost" disabled={busy} onClick={() => setCommand(null)}>
                Cancelar
              </Button>
              <Button
                variant={command?.kind === "delete" ? "destructive" : "default"}
                disabled={
                  busy ||
                  (command?.kind !== "delete" &&
                    commandText.trim().length < (command?.kind === "report" ? 5 : 1))
                }
                onClick={() => void submitCommand()}
              >
                {busy
                  ? "Salvando…"
                  : command?.kind === "edit"
                    ? "Salvar alterações"
                    : command?.kind === "delete"
                      ? "Excluir para todos"
                      : "Enviar denúncia"}
              </Button>
            </footer>
          </DialogContent>
        </Dialog>
        <Dialog open={mutedOpen} onOpenChange={setMutedOpen}>
          <DialogContent className="social-dialog">
            <DialogTitle>Pessoas silenciadas</DialogTitle>
            <DialogDescription>
              O silêncio oculta publicações e reposts dessas pessoas apenas no seu feed. Não
              bloqueia conversas privadas.
            </DialogDescription>
            {connections.muted.map((id) => (
              <div className="social-muted-person" key={id}>
                <span>{connections.people.find((p) => p.id === id)?.display_name || "Membro"}</span>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() =>
                    void mutate(
                      () =>
                        db.from("social_mutes").delete().eq("user_id", user!.id).eq("muted_id", id),
                      "Pessoa removida dos silenciados",
                    )
                  }
                >
                  Deixar de silenciar
                </Button>
              </div>
            ))}
            {!connections.muted.length && <p>Nenhuma pessoa silenciada.</p>}
          </DialogContent>
        </Dialog>
        <CommunityAuth open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    </SocialSiteShell>
  );
}
function EmptyFeed({ mode, query }: { mode: SocialMode; query: string }) {
  return (
    <>
      <Bookmark size={30} />
      <h2>
        {query
          ? "Nenhuma publicação encontrada"
          : mode === "salvos"
            ? "Guarde o que vale reler"
            : mode === "seguindo"
              ? "Seu feed começa com as pessoas"
              : mode === "meus"
                ? "Sua primeira publicação começa aqui"
                : "A conversa começa com você"}
      </h2>
      <p>
        {query
          ? "Tente outro texto, nome ou hashtag."
          : mode === "salvos"
            ? "Toque no marcador de uma publicação para encontrá-la aqui."
            : mode === "seguindo"
              ? "Siga colegas para acompanhar publicações e reposts nesta aba."
              : "Compartilhe uma ideia, uma enquete ou uma sequência com a turma."}
      </p>
    </>
  );
}
