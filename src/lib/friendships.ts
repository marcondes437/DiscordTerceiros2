export type Friendship = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted";
  created_at?: string;
};
export type FriendshipState = "none" | "friend" | "incoming" | "outgoing";
export type FriendAction = "request" | "accept" | "remove";
export function friendshipWith(
  rows: Friendship[],
  self: string | undefined,
  other: string | null | undefined,
) {
  return self && other
    ? rows.find(
        (f) =>
          (f.requester_id === self && f.recipient_id === other) ||
          (f.recipient_id === self && f.requester_id === other),
      )
    : undefined;
}
export function friendshipState(
  rows: Friendship[],
  self: string | undefined,
  other: string | null | undefined,
): FriendshipState {
  const row = friendshipWith(rows, self, other);
  return !row
    ? "none"
    : row.status === "accepted"
      ? "friend"
      : row.recipient_id === self
        ? "incoming"
        : "outgoing";
}
export function conversationIds(
  messages: { sender_id: string; recipient_id: string }[],
  self: string | undefined,
) {
  return new Set(
    messages
      .filter((m) => m.sender_id === self || m.recipient_id === self)
      .map((m) => (m.sender_id === self ? m.recipient_id : m.sender_id)),
  );
}
