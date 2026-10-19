import catalog from "@/data/community-themes.json";
export type CommunityThemeMode = "dark" | "light";
export type CommunitySkin = (typeof catalog)[number];
export const communitySkins: CommunitySkin[] = catalog;
export const defaultSkin = communitySkins[0]!;
export function findCommunitySkin(id: unknown): CommunitySkin {
  return communitySkins.find((skin) => skin.id === id) ?? defaultSkin;
}
export const communitySkinKey = (userId?: string) =>
  `conecta:community-skin${userId ? `:${userId}` : ""}`;
export function readCommunitySkin(
  storage: Pick<Storage, "getItem">,
  userId?: string,
): CommunitySkin {
  try {
    const saved = storage.getItem(communitySkinKey(userId));
    if (saved) return findCommunitySkin(saved);
    if (!userId && storage.getItem("conecta:community-theme") === "light")
      return findCommunitySkin("classic-light");
  } catch {
    /* Use the bundled default when storage is unavailable. */
  }
  return defaultSkin;
}
