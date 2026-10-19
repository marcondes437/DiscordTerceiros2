import { supabase } from "@/integrations/supabase/client";

export type GameMember = { user_id: string; name: string; score: number };
export type Stroke = { points: [number, number][]; color: string; width: number };
export type RoomSnapshot = {
  id: string;
  game: "rabisco" | "slithersenai";
  host: string;
  version: number;
  word: string | null;
  members: GameMember[];
  state: {
    phase: "lobby" | "playing" | "finished";
    drawer?: string;
    round?: number;
    endsAt?: number;
    letters?: number;
    strokes?: Stroke[];
    message?: string;
    food?: number[];
    snakes?: Record<string, { body: number[]; direction: string }>;
  };
};
export const gamingDb = supabase as any;
export async function gameAction(
  room: string | null,
  action: string,
  data: Record<string, unknown> = {},
): Promise<RoomSnapshot> {
  const result = await gamingDb.rpc("gaming_action", {
    p_room: room,
    p_action: action,
    p_data: data,
  });
  if (result.error) throw new Error(result.error.message || "Não foi possível atualizar a sala.");
  return result.data;
}
export const badges = [
  {
    id: "first-room",
    name: "Primeira conexão",
    description: "Entre na sua primeira sala.",
    title: "Da turma",
    color: "#c4a46c",
  },
  {
    id: "artist",
    name: "Artista da turma",
    description: "Desenhe uma palavra que alguém acerte.",
    title: "Artista",
    color: "#c18bfd",
  },
  {
    id: "detective",
    name: "Olho de águia",
    description: "Acerte uma palavra no Rabisco.",
    title: "Detetive",
    color: "#68bff1",
  },
  {
    id: "serpent",
    name: "Rei da arena",
    description: "Colete 5 alimentos na mesma rodada de SlitherSenai.",
    title: "Rei da arena",
    color: "#6bdd9b",
  },
  {
    id: "collector",
    name: "Memória de jogador",
    description: "Salve sua primeira captura ou clipe.",
    title: "Colecionador",
    color: "#f795b5",
  },
] as const;
export function captureError(file: Pick<File, "type" | "size">): string | null {
  if (!["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"].includes(file.type))
    return "Use PNG, JPG, WebP, MP4 ou WebM.";
  if (file.size > 50 * 1024 * 1024) return "O limite é de 50 MB por captura ou clipe.";
  if (file.size === 0) return "O arquivo está vazio.";
  return null;
}
export function inviteUrl(room: Pick<RoomSnapshot, "id" | "game">, origin: string) {
  return `${origin}/jogar?game=${room.game}&room=${encodeURIComponent(room.id)}`;
}
