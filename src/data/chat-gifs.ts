import type { ChatGif } from "@/lib/chat-media";
// Hand-picked public GIPHY embeds; media is loaded directly from GIPHY, never copied/proxied.
const entries = [
  ["l0MYt5jPR6QX5pnqM", "Aplausos", "Reações", "parabens palmas boa bravo clap applause"],
  ["111ebonMs90YLu", "Boa!", "Reações", "joinha sim gostei legal aprovado yes thumbs up"],
  ["3oEjI6SIIHBdRxXI40", "Mandou bem", "Reações", "parabens palmas sucesso boa clap"],
  ["26ufdipQqU2lhNA4g", "Impressionante", "Surpresa", "surpreso uau chocado wow mind blown"],
  ["l3q2K5jinAlChoCLS", "Pensando…", "Surpresa", "duvida pensar confuso thinking confused"],
  [
    "JIX9t2j0ZTN9S",
    "Digitando sem parar",
    "Gatos",
    "gato teclado programando trabalho cat typing coding",
  ],
  ["13CoXDiaCcCoyk", "Gato no teclado", "Gatos", "gato computador programador cat typing"],
  ["MDJ9IbxxvDUQM", "Carinho", "Gatos", "gato carinho amor abraco cat love hug"],
  [
    "26tPplGWjN0xLybiU",
    "Hora de comemorar",
    "Festa",
    "festa comemorar danca feliz party celebration",
  ],
  ["l0MYEqEzwMWFCg8rm", "Partiu festa", "Festa", "festa feliz comemoracao alegria party happy"],
  ["11sBLVxNs7v6WA", "Comemoração", "Festa", "torcida vitoria feliz festa celebration win happy"],
] as const;
export const starterGifs: ChatGif[] = entries.map(([id, title, category, tags]) => ({
  id,
  title,
  category,
  tags,
  url: `https://media.giphy.com/media/${id}/giphy.gif`,
  preview: `https://media.giphy.com/media/${id}/200w.gif`,
}));
