import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Film, Share2, Trash2, Upload, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { badges, captureError, gameAction, gamingDb } from "@/lib/gaming";
import "@/routes/gaming-features.css";

export type Capture = {
  id: string;
  user_id: string;
  path: string;
  kind: "image" | "video";
  title: string;
  url?: string | undefined;
};
export async function saveCapture(userId: string, file: File, title: string) {
  const invalid = captureError(file);
  if (invalid) throw new Error(invalid);
  const extensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  const path = `${userId}/${crypto.randomUUID()}.${extensions[file.type]}`;
  const upload = await supabase.storage
    .from("gaming-captures")
    .upload(path, file, { contentType: file.type });
  if (upload.error) throw upload.error;
  const row = await gamingDb.from("gaming_media").insert({
    user_id: userId,
    path,
    kind: file.type.startsWith("video/") ? "video" : "image",
    title: title.trim().slice(0, 120) || "Momento de jogo",
  });
  if (row.error) {
    await supabase.storage.from("gaming-captures").remove([path]);
    throw row.error;
  }
}

export function CapturePost({ mediaId }: { mediaId: string }) {
  const [media, setMedia] = useState<Capture | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    setMedia(null);
    setError(false);
    void (async () => {
      const r = await gamingDb.from("gaming_media").select("*").eq("id", mediaId).maybeSingle();
      if (r.error || !r.data) {
        if (live) setError(true);
        return;
      }
      const url = await supabase.storage.from("gaming-captures").createSignedUrl(r.data.path, 3600);
      if (live) {
        if (url.error) setError(true);
        else setMedia({ ...r.data, url: url.data.signedUrl });
      }
    })();
    return () => {
      live = false;
    };
  }, [mediaId]);
  if (error) return <p className="gaming-help">Esta captura foi removida ou está indisponível.</p>;
  if (!media) return <p className="gaming-help">Carregando captura…</p>;
  return (
    <figure className="gaming-post-media">
      {media.kind === "video" ? (
        <video src={media.url} controls playsInline preload="metadata" />
      ) : (
        <img src={media.url} alt={media.title} loading="lazy" />
      )}
      <figcaption>{media.title}</figcaption>
    </figure>
  );
}

export function GamingGallery({ userId }: { userId: string }) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    setError("");
    const r = await gamingDb
      .from("gaming_media")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (r.error) {
      setError("Não foi possível carregar suas capturas.");
      setLoading(false);
      return;
    }
    const rows: Capture[] = r.data ?? [];
    const signed = rows.length
      ? await supabase.storage.from("gaming-captures").createSignedUrls(
          rows.map((c) => c.path),
          3600,
        )
      : null;
    if (signed?.error) setError("Algumas capturas não puderam ser abertas.");
    setCaptures(
      rows.map((c) => ({
        ...c,
        url: signed?.data?.find((s) => s.path === c.path)?.signedUrl ?? undefined,
      })),
    );
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await saveCapture(userId, file, title || file.name.replace(/\.[^.]+$/, ""));
      setTitle("");
      toast.success("Momento salvo! Medalha Colecionador desbloqueada.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function share(capture: Capture) {
    setBusy(true);
    const r = await gamingDb
      .from("social_posts")
      .insert({ author_id: userId, body: `🎮 ${capture.title}`, media_id: capture.id });
    if (r.error) setError("Não foi possível compartilhar. Tente novamente.");
    else toast.success("Captura compartilhada no Social!");
    setBusy(false);
  }
  async function remove(capture: Capture) {
    if (
      !window.confirm(
        "Excluir esta captura do perfil? Ela também deixará de aparecer nas publicações.",
      )
    )
      return;
    setBusy(true);
    const file = await supabase.storage.from("gaming-captures").remove([capture.path]);
    if (file.error) setError("Não foi possível remover o arquivo.");
    else {
      const r = await gamingDb.from("gaming_media").delete().eq("id", capture.id);
      await refresh();
      if (r.error)
        setError(
          "Arquivo removido, mas não foi possível atualizar a galeria. Recarregue e tente excluir novamente.",
        );
    }
    setBusy(false);
  }
  return (
    <div className="gaming-gallery">
      <div className="gaming-upload">
        <label>
          Título do momento
          <input
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Aquela partida com a turma…"
          />
        </label>
        <button disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload size={16} />
          {busy ? "Enviando…" : "Enviar captura ou clipe"}
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </div>
      <p className="gaming-help">
        PNG, JPG, WebP, MP4 ou WebM · até 50 MB. Visível para membros da comunidade. Compartilhar no
        Social é opcional.
      </p>
      {error && (
        <p role="alert" className="console-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando capturas…</p>
      ) : !captures.length ? (
        <div className="console-empty">
          <Camera />
          <h3>Seu primeiro momento começa aqui.</h3>
          <p>Envie uma imagem ou um clipe, ou use os botões de captura dentro dos jogos.</p>
        </div>
      ) : (
        <div className="gaming-capture-grid">
          {captures.map((c) => (
            <article key={c.id}>
              {c.kind === "video" ? (
                <video src={c.url} controls playsInline preload="metadata" />
              ) : (
                <img src={c.url} alt={c.title} loading="lazy" />
              )}
              <strong>{c.title}</strong>
              <div>
                <button disabled={busy} onClick={() => void share(c)}>
                  <Share2 size={14} />
                  Compartilhar
                </button>
                <button
                  disabled={busy}
                  onClick={() => void remove(c)}
                  aria-label={`Excluir ${c.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function GamingAchievements({ userId, onEquip }: { userId: string; onEquip?: () => void }) {
  const [earned, setEarned] = useState<string[]>([]);
  const [cosmetic, setCosmetic] = useState({ frame: "none", title: "none" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void Promise.all([
      gamingDb.from("gaming_badges").select("badge").eq("user_id", userId),
      gamingDb.from("gaming_cosmetics").select("frame,title").eq("user_id", userId).maybeSingle(),
    ]).then(([b, c]) => {
      if (!live) return;
      if (b.error || c.error) setError("Não foi possível carregar suas conquistas.");
      else {
        setEarned((b.data ?? []).map((v: { badge: string }) => v.badge));
        if (c.data) setCosmetic(c.data);
      }
    });
    return () => {
      live = false;
    };
  }, [userId]);
  async function equip(patch: Partial<typeof cosmetic>) {
    const next = { ...cosmetic, ...patch };
    setBusy(true);
    setError("");
    try {
      await gameAction(null, "equip", next);
      setCosmetic(next);
      onEquip?.();
      toast.success("Personalização equipada!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível equipar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <p className="gaming-help">
        Desafios verificados pelo servidor. Cada medalha desbloqueia um título e uma moldura para
        seu perfil de jogos.
      </p>
      {error && (
        <p role="alert" className="console-error">
          {error}
        </p>
      )}
      <div className="gaming-badges">
        {badges.map((b) => (
          <article key={b.id} className={earned.includes(b.id) ? "is-earned" : ""}>
            <Trophy style={{ color: earned.includes(b.id) ? b.color : undefined }} />
            <h3>{b.name}</h3>
            <p>{b.description}</p>
            <span>{earned.includes(b.id) ? "Desbloqueada" : "Bloqueada"}</span>
            <div>
              <button
                disabled={busy || !earned.includes(b.id)}
                onClick={() => void equip({ frame: cosmetic.frame === b.id ? "none" : b.id })}
              >
                {cosmetic.frame === b.id ? "Remover moldura" : "Usar moldura"}
              </button>
              <button
                disabled={busy || !earned.includes(b.id)}
                onClick={() => void equip({ title: cosmetic.title === b.id ? "none" : b.id })}
              >
                {cosmetic.title === b.id ? "Remover título" : "Usar título"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function GameCaptureControls({
  canvas,
  userId,
  gameName,
}: {
  canvas: React.RefObject<HTMLCanvasElement | null>;
  userId: string;
  gameName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      const r = recorder.current;
      if (r && r.state !== "inactive") r.stop();
      r?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);
  async function save(file: File) {
    setBusy(true);
    try {
      await saveCapture(userId, file, `${gameName} · ${new Date().toLocaleDateString("pt-BR")}`);
      if (alive.current) toast.success("Salvo nas capturas do perfil!");
    } catch (e) {
      if (alive.current) toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function photo() {
    canvas.current?.toBlob((blob) => {
      if (blob) void save(new File([blob], "captura.png", { type: "image/png" }));
    }, "image/png");
  }
  function record() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (!canvas.current || typeof MediaRecorder === "undefined" || !canvas.current.captureStream) {
      toast.error("Seu navegador não grava o jogo. Você pode enviar um clipe pelo perfil.");
      return;
    }
    try {
      const stream = canvas.current.captureStream(20);
      const type = MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
        if (!alive.current) return;
        setRecording(false);
        const blob = new Blob(chunks, { type: r.mimeType.split(";")[0] || "video/webm" });
        void save(new File([blob], "clipe.webm", { type: blob.type }));
      };
      r.onerror = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (alive.current) {
          setRecording(false);
          toast.error("A gravação falhou. Tente uma captura.");
        }
      };
      recorder.current = r;
      r.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 30000);
    } catch {
      toast.error("Não foi possível iniciar a gravação.");
    }
  }
  return (
    <div className="game-capture-controls">
      <button disabled={busy || recording} onClick={photo}>
        <Camera size={15} />
        {busy ? "Salvando…" : "Salvar captura"}
      </button>
      <button disabled={busy} onClick={record}>
        <Film size={15} />
        {recording ? "Parar e salvar clipe" : "Gravar clipe (30s)"}
      </button>
      <small>Somente a imagem do jogo; sem microfone.</small>
    </div>
  );
}
