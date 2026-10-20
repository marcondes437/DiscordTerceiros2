import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Gamepad2, ArrowUpRight } from "lucide-react";
import { filterGames, gameCategories, offlineCategoryNote } from "@/data/games";
import { GameCard } from "@/components/game-card";
import "@/routes/jogos.css";
export function HomeCatalog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const visible = filterGames(query, category);
  return (
    <section className="home-catalog" id="home-catalog" aria-label="Catálogo de jogos">
      <div className="home-catalog-intro">
        <Gamepad2 size={24} />
        <div>
          <strong>Seu próximo jogo começa aqui.</strong>
          <p>Jogos da comunidade e uma seleção de experiências no navegador.</p>
        </div>
        <Link to="/jogos">
          Sua coleção <ArrowUpRight size={14} />
        </Link>
      </div>
      <header>
        <div>
          <span>ENCONTRE SEU PRÓXIMO JOGO</span>
          <h2>Explore o catálogo</h2>
        </div>
        <label>
          <Search size={15} />
          <input
            aria-label="Buscar jogos na home"
            placeholder="Buscar um jogo…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </header>
      <div className="home-catalog-filters">
        <nav aria-label="Categorias de jogos">
          {gameCategories.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </nav>
        <span>
          {visible.length} {visible.length === 1 ? "jogo" : "jogos"}
        </span>
      </div>
      {category === "Offline" && <p className="games-catalog-note">{offlineCategoryNote}</p>}
      <div className="home-catalog-grid">
        {visible.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
      {!visible.length && (
        <p className="live-empty">Nenhum jogo encontrado. Tente outro nome ou categoria.</p>
      )}
    </section>
  );
}
