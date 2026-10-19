import { useEffect, useState } from "react";
import {
  communitySkinKey,
  defaultSkin,
  findCommunitySkin,
  readCommunitySkin,
  type CommunityThemeMode,
} from "@/lib/community-themes";
export type CommunityTheme = CommunityThemeMode;
export function useCommunityTheme(userId?: string) {
  const [selection, setSelection] = useState({ owner: userId, skin: defaultSkin });
  const [storageNotice, setStorageNotice] = useState("");
  const skin = selection.owner === userId ? selection.skin : defaultSkin;
  useEffect(() => {
    const restore = () => {
      let next = defaultSkin;
      try {
        next = readCommunitySkin(localStorage, userId);
      } catch {
        /* Session-only mode. */
      }
      setSelection({ owner: userId, skin: next });
      setStorageNotice("");
    };
    restore();
    const sync = (event: StorageEvent) => {
      if (event.key === communitySkinKey(userId) || event.key === null) restore();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [userId]);
  const selectSkin = (id: string) => {
    const next = findCommunitySkin(id);
    setSelection({ owner: userId, skin: next });
    try {
      localStorage.setItem(communitySkinKey(userId), next.id);
      if (!userId) localStorage.setItem("conecta:community-theme", next.mode);
      setStorageNotice("");
    } catch {
      setStorageNotice(
        "Tema aplicado nesta sessão. O navegador não permitiu salvar a preferência.",
      );
    }
  };
  const toggle = () => selectSkin(skin.mode === "dark" ? "classic-light" : "dark-matter");
  return { theme: skin.mode as CommunityTheme, skin, selectSkin, toggle, storageNotice };
}
