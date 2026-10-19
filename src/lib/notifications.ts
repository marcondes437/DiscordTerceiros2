export type SiteNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  actor_name: string;
  kind: "message" | "post" | "game_invite";
  message_id: string | null;
  post_id: string | null;
  invitation_id: string | null;
  room_id: string | null;
  game: "rabisco" | "slithersenai" | null;
  created_at: string;
  read_at: string | null;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function notificationHref(n: SiteNotification) {
  if (n.kind === "message")
    return n.actor_id && uuid.test(n.actor_id) ? `/comunidade?dm=${n.actor_id}` : "/comunidade";
  if (n.kind === "post")
    return n.post_id && uuid.test(n.post_id) ? `/social?post=${n.post_id}` : "/social";
  return n.room_id && uuid.test(n.room_id) && (n.game === "rabisco" || n.game === "slithersenai")
    ? `/jogar?game=${n.game}&room=${n.room_id}`
    : "/jogos";
}
export function notificationText(n: SiteNotification) {
  return n.kind === "message"
    ? `${n.actor_name} enviou uma mensagem privada`
    : n.kind === "post"
      ? `${n.actor_name} publicou no Social`
      : `${n.actor_name} chamou você para jogar ${n.game === "rabisco" ? "Rabisco" : "SlitherSenai"}`;
}
