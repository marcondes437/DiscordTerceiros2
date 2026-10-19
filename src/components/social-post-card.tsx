import {
  Bookmark,
  Copy,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  Quote,
  Repeat2,
  Share2,
  ShieldAlert,
  Trash2,
  UserMinus,
  UserPlus,
  VolumeX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { CapturePost } from "./gaming-media";
import { PostText } from "./post-text";
import { SocialPoll } from "./social-poll";
import type { SocialPost } from "@/lib/social";
export type SocialAction =
  | "like"
  | "bookmark"
  | "repost"
  | "quote"
  | "share"
  | "copy"
  | "edit"
  | "delete"
  | "report"
  | "pin"
  | "mute"
  | "follow";
export function SocialPostCard({
  post,
  selfId,
  busy,
  following,
  onAction,
  onOpen,
  onProfile,
  onTag,
  onMention,
}: {
  post: SocialPost;
  selfId: string | undefined;
  busy: boolean;
  following: boolean;
  onAction: (action: SocialAction, post: SocialPost) => void;
  onOpen: (id: string) => void;
  onProfile: (id: string) => void;
  onTag: (tag: string) => void;
  onMention: (handle: string) => void;
}) {
  const own = post.author_id === selfId;
  return (
    <article className="social-post" id={`social-post-${post.entry_id || post.id}`}>
      <button
        type="button"
        className="social-avatar"
        aria-label={`Ver publicações de ${post.author_name}`}
        onClick={() => onProfile(post.author_id)}
      >
        {post.author_name.slice(0, 1).toUpperCase()}
      </button>
      <div className="social-post-body">
        {post.repost_actor && (
          <button className="social-repost-label" onClick={() => onProfile(post.repost_actor!)}>
            <Repeat2 size={13} />
            {post.repost_actor === selfId ? "Você" : post.repost_name || "Um membro"} repostou
          </button>
        )}
        {post.pinned && (
          <span className="social-repost-label">
            <Pin size={12} />
            Fixada no perfil
          </span>
        )}
        <div className="social-post-top">
          <button className="social-author-button" onClick={() => onProfile(post.author_id)}>
            {post.author_name}
          </button>
          <button
            className="social-post-date"
            title="Abrir conversa"
            onClick={() => onOpen(post.id)}
          >
            @{post.author_id.slice(0, 8)} ·{" "}
            {new Date(post.created_at).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
            {post.edited_at ? " · Editada" : ""}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="social-post-more"
                aria-label={`Mais opções da publicação de ${post.author_name}`}
              >
                <MoreHorizontal size={19} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="social-post-menu">
              <DropdownMenuItem onSelect={() => onAction("copy", post)}>
                <Copy size={15} />
                Copiar link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction("bookmark", post)} disabled={busy}>
                <Bookmark size={15} />
                {post.bookmarked ? "Remover dos salvos" : "Salvar publicação"}
              </DropdownMenuItem>
              {own ? (
                <>
                  <DropdownMenuSeparator />
                  {!post.poll_options && (
                    <DropdownMenuItem disabled={busy} onSelect={() => onAction("edit", post)}>
                      <Pencil size={15} />
                      Editar publicação
                    </DropdownMenuItem>
                  )}
                  {!post.parent_id && (
                    <DropdownMenuItem disabled={busy} onSelect={() => onAction("pin", post)}>
                      <Pin size={15} />
                      {post.pinned ? "Desafixar do perfil" : "Fixar no meu perfil"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    disabled={busy}
                    className="text-destructive"
                    onSelect={() => onAction("delete", post)}
                  >
                    <Trash2 size={15} />
                    Excluir publicação
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem disabled={busy} onSelect={() => onAction("follow", post)}>
                    {following ? <UserMinus size={15} /> : <UserPlus size={15} />}{" "}
                    {following ? "Deixar de seguir" : "Seguir"} {post.author_name}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={busy} onSelect={() => onAction("mute", post)}>
                    <VolumeX size={15} />
                    Silenciar no meu feed
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={busy} onSelect={() => onAction("report", post)}>
                    <ShieldAlert size={15} />
                    Denunciar publicação
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {post.parent_id && (
          <button className="social-conversation-parent" onClick={() => onOpen(post.parent_id!)}>
            Ver publicação anterior da conversa
          </button>
        )}
        <PostText text={post.body} onTag={onTag} onMention={onMention} />
        {post.media_id && <CapturePost mediaId={post.media_id} />}
        {post.poll_options && <SocialPoll key={`${post.id}:${selfId}`} post={post} />}
        {post.is_quote && (
          <div className="social-quote-card">
            {post.quoted ? (
              <>
                <button className="social-quote-author" onClick={() => onOpen(post.quoted!.id)}>
                  {post.quoted.author_name}
                  <span>Abrir publicação citada ↗</span>
                </button>
                <PostText text={post.quoted.body} onTag={onTag} onMention={onMention} />
                {post.quoted.media_id && <CapturePost mediaId={post.quoted.media_id} />}
              </>
            ) : (
              <p>Esta publicação citada não está mais disponível.</p>
            )}
          </div>
        )}
        <div className="social-actions">
          <button
            title="Abrir conversa e responder"
            aria-label={`Responder, ${post.reply_count} respostas`}
            disabled={busy}
            onClick={() => onOpen(post.id)}
          >
            <MessageCircle size={17} />
            {post.reply_count}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={post.reposted ? "reposted" : ""}
                disabled={busy}
                title="Repostar ou citar"
                aria-label={`Repostar ou citar, ${post.repost_count} reposts`}
              >
                <Repeat2 size={17} />
                {post.repost_count}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled={busy} onSelect={() => onAction("repost", post)}>
                <Repeat2 size={16} />
                {post.reposted ? "Desfazer repost" : "Repostar"}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={busy} onSelect={() => onAction("quote", post)}>
                <Quote size={16} />
                Citar com comentário
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            className={post.liked ? "liked" : ""}
            disabled={busy}
            aria-pressed={post.liked}
            title={post.liked ? "Descurtir" : "Curtir"}
            aria-label={`${post.liked ? "Descurtir" : "Curtir"}, ${post.like_count} curtidas`}
            onClick={() => onAction("like", post)}
          >
            <Heart size={17} />
            {post.like_count}
          </button>
          <button
            className={post.bookmarked ? "bookmarked" : ""}
            disabled={busy}
            aria-pressed={post.bookmarked}
            aria-label={post.bookmarked ? "Remover dos salvos" : "Salvar publicação"}
            title="Salvar publicação"
            onClick={() => onAction("bookmark", post)}
          >
            <Bookmark size={17} />
          </button>
          <button
            title="Compartilhar publicação"
            aria-label="Compartilhar publicação"
            onClick={() => onAction("share", post)}
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
