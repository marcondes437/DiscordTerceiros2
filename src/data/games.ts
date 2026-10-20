import { externalGames } from "./external-games";
export type GameCategory = "Ação" | "Com a turma" | "Criatividade" | "Raciocínio" | "Corrida" | "Offline" | "Online" | "Esportes" | "RPG" | "Coleções";
export type BrowserGame = {
  id: string;
  name: string;
  url: string | null;
  image: string;
  heroImage?: string;
  categories: GameCategory[];
  description: string;
  color: string;
  external?: boolean;
  unavailableReason?: string;
  note?: string;
};
export function configuredGameUrl(value?: string): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
export const games: BrowserGame[] = [
  {
    id: "rabisco",
    name: "Rabisco",
    url: "https://rabisco-rho.vercel.app/",
    image: "/games/rabisco.svg",
    heroImage: "/games/rabisco-hero.svg",
    categories: ["Criatividade", "Com a turma"],
    description:
      "Uma palavra, muitos desenhos e a criatividade da turma inteira. Desenhe, adivinhe e transforme cada rodada em uma boa risada.",
    color: "#7251a8",
  },
  {
    id: "slithersenai",
    name: "SlitherSenai",
    url: "/jogar?game=slithersenai",
    image: "/games/slithersenai.svg",
    heroImage: "/games/slithersenai-hero.svg",
    categories: ["Ação", "Com a turma"],
    description:
      "Sua arena. Sua turma. Cresça, desvie dos adversários e dispute cada espaço nesta versão feita por nós.",
    color: "#326a55",
  },
  ...externalGames,
];
export const communityGames = games.filter((game) => !game.external);
export const gameCategories = ["Todos", "Com a turma", "Offline", "Online", "Ação", "Esportes", "Corrida", "RPG", "Raciocínio", "Criatividade", "Coleções"] as const;
export const offlineCategoryNote = "Offline / solo: jogos com foco em jogar sozinho. Os sites externos precisam de internet para abrir; funcionamento sem conexão não é garantido.";
export function filterGames(query: string, category: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return games.filter(
    (game) =>
      (category === "Todos" || game.categories.includes(category as GameCategory)) &&
      normalize(`${game.name} ${game.description} ${game.categories.join(" ")}`).includes(
        normalize(query.trim()),
      ),
  );
}
