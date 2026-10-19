import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, Check, ExternalLink, Hash, Palette, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionSettings } from "./community-motion";
import { communitySkins, findCommunitySkin, type CommunitySkin } from "@/lib/community-themes";
import "@/routes/community-theme-store.css";

function ThemePreview({ skin }: { skin: CommunitySkin }) {
  const p = skin.palette;
  return (
    <div
      className={`theme-preview preview-${skin.id}`}
      aria-hidden="true"
      style={
        {
          "--preview-bg": p.canvas,
          "--preview-panel": p.panel,
          "--preview-card": p.card,
          "--preview-ink": p.ink,
          "--preview-text": p.text,
          "--preview-muted": p.muted,
          "--preview-primary": p.primary,
          "--preview-radius": p.radius,
          "--preview-header": p.header,
        } as CSSProperties
      }
    >
      <div className="theme-preview-rail">
        <b>C</b>
        <i />
        <i />
        <i />
      </div>
      <div className="theme-preview-channels">
        <strong>Conecta</strong>
        <span>COMUNIDADE</span>
        <em># geral</em>
        <span># jogos</span>
        <span># projetos</span>
        <span>◉ Sala da turma</span>
      </div>
      <div className="theme-preview-chat">
        <header>
          <Hash size={11} />
          geral
        </header>
        <div>
          <i />
          <section>
            <b>A sua turma</b>
            <span>Um espaço com a sua cara.</span>
          </section>
        </div>
        <div>
          <i />
          <section>
            <b>Você</b>
            <span>Curti esse tema! ✦</span>
          </section>
        </div>
        <footer>
          Conversar em #geral <span>↗</span>
        </footer>
      </div>
    </div>
  );
}
const filters = [
  { id: "all", label: "Todos" },
  { id: "dark", label: "Escuros" },
  { id: "light", label: "Claros" },
  { id: "glass", label: "Translúcidos" },
  { id: "retro", label: "Retrô" },
];
export function CommunityThemeStore({
  selectedId,
  onSelect,
  onBack,
  themeControl,
  storageNotice = "",
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  onBack?: () => void;
  themeControl?: ReactNode;
  storageNotice?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [announcement, setAnnouncement] = useState("");
  const active = findCommunitySkin(selectedId);
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = communitySkins.filter(
    (s) =>
      (filter === "all" || s.mode === filter || s.category === filter) &&
      normalize(`${s.name} ${s.author} ${s.description}`).includes(normalize(query)),
  );
  const apply = (skin: CommunitySkin) => {
    onSelect(skin.id);
    setAnnouncement(`${skin.name} aplicado à comunidade.`);
  };
  return (
    <section className="theme-store" aria-label="Loja de temas">
      <header className="theme-store-header">
        {onBack && (
          <button
            type="button"
            className="theme-store-back"
            aria-label="Voltar para amigos"
            onClick={onBack}
          >
            <ArrowLeft size={17} />
          </button>
        )}
        <Palette size={19} />
        <h1>Loja de temas</h1>
        <span>Seu espaço, seu estilo.</span>
        <div>{themeControl}</div>
      </header>
      <div className="theme-store-scroll">
        <div className="theme-store-hero">
          <div>
            <span className="theme-store-eyebrow">
              <Sparkles size={13} /> PERSONALIZE SUA COMUNIDADE
            </span>
            <h2>
              Mude o clima.
              <br />
              Continue sendo você.
            </h2>
            <p>Explore os temas e encontre o seu. Todos gratuitos, aplicados na hora.</p>
            <span className="theme-store-current">
              <Check size={14} /> Usando {active.name}
            </span>
          </div>
          <div className="theme-store-featured">
            <ThemePreview skin={active} />
          </div>
        </div>
        <MotionSettings />
        <div className="theme-store-tools">
          <div className="theme-store-filters" aria-label="Filtrar temas">
            {filters.map((f) => (
              <button
                type="button"
                key={f.id}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="theme-store-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar tema ou criador"
              aria-label="Buscar temas"
            />
          </label>
        </div>
        <p className="theme-store-count">
          {visible.length} {visible.length === 1 ? "tema disponível" : "temas disponíveis"}
          <span>Escolha salva por conta neste navegador.</span>
        </p>
        <p className="theme-store-status" role="status" aria-live="polite">
          {storageNotice || announcement}
        </p>
        <div className="theme-store-grid">
          {visible.map((skin) => (
            <article
              key={skin.id}
              className={`theme-store-card ${selectedId === skin.id ? "is-selected" : ""}`}
            >
              <ThemePreview skin={skin} />
              <div className="theme-store-card-body">
                <div className="theme-store-card-title">
                  <h3>{skin.name}</h3>
                  <span>{skin.mode === "light" ? "Claro" : "Escuro"}</span>
                </div>
                <p className="theme-store-author">por {skin.author}</p>
                <p className="theme-store-description">{skin.description}</p>
                <div className="theme-store-card-actions">
                  {skin.source ? (
                    <a
                      href={skin.source}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ver tema original ${skin.name}`}
                    >
                      Original <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span>Conecta</span>
                  )}
                  <Button
                    type="button"
                    variant={selectedId === skin.id ? "secondary" : "default"}
                    aria-label={`${selectedId === skin.id ? "Tema ativo" : "Usar tema"} ${skin.name}`}
                    aria-pressed={selectedId === skin.id}
                    onClick={() => apply(skin)}
                  >
                    {selectedId === skin.id ? (
                      <>
                        <Check size={14} />
                        Em uso
                      </>
                    ) : (
                      "Usar tema"
                    )}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!visible.length && (
          <div className="theme-store-empty">
            <Palette size={30} />
            <h3>Nenhum tema encontrado</h3>
            <p>Tente outro nome ou veja todos os estilos.</p>
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Ver todos os temas
            </Button>
          </div>
        )}
        <footer className="theme-store-footer">
          Temas adaptados para o Conecta a partir dos originais dos criadores. A aparência muda
          apenas para você.
        </footer>
      </div>
    </section>
  );
}
