export type SocialMode = "todos" | "seguindo" | "meus" | "salvos";
export type SocialPost = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  quote_of: string | null;
  is_quote: boolean;
  edited_at: string | null;
  poll_options: string[] | null;
  poll_closes_at: string | null;
  media_id?: string | null;
  quoted?: SocialPost | null;
  like_count: number;
  reply_count: number;
  repost_count: number;
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
  pinned: boolean;
  entry_id?: string;
  repost_actor?: string | null;
  repost_name?: string | null;
  occurred_at?: string;
};
export type SocialPerson = { id: string; display_name: string };
export type SocialDraft = {
  bodies: string[];
  parentId: string | null;
  quoteId: string | null;
  options: string[] | null;
  duration: number;
};
export const emptySocialDraft = (): SocialDraft => ({
  bodies: [""],
  parentId: null,
  quoteId: null,
  options: null,
  duration: 1440,
});
export const validPostId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function parseSocialDraft(value: string | null): SocialDraft {
  try {
    const data = JSON.parse(value || "null");
    if (!data || !Array.isArray(data.bodies)) return emptySocialDraft();
    return {
      bodies: data.bodies
        .filter((b: unknown) => typeof b === "string")
        .slice(0, 8)
        .map((b: string) => b.slice(0, 500)).length
        ? data.bodies
            .filter((b: unknown) => typeof b === "string")
            .slice(0, 8)
            .map((b: string) => b.slice(0, 500))
        : [""],
      parentId: validPostId(data.parentId) ? data.parentId : null,
      quoteId: validPostId(data.quoteId) ? data.quoteId : null,
      options: Array.isArray(data.options)
        ? data.options.slice(0, 4).map((o: unknown) => String(o).slice(0, 25))
        : null,
      duration: [5, 60, 1440, 4320, 10080].includes(data.duration) ? data.duration : 1440,
    };
  } catch {
    return emptySocialDraft();
  }
}
export function validPollOptions(options: string[] | null) {
  return (
    options === null ||
    (options.length >= 2 &&
      options.length <= 4 &&
      options.every((o) => o.trim().length > 0 && o.trim().length <= 25) &&
      new Set(options.map((o) => o.trim().toLocaleLowerCase())).size === options.length)
  );
}
export function postShareUrl(id: string, origin = window.location.origin) {
  return `${origin}/social?post=${encodeURIComponent(id)}`;
}
