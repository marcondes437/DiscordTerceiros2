import { useEffect, useState } from "react";
export type CommunityTheme = "dark" | "light";
const key = "conecta:community-theme";
export function useCommunityTheme() {
  const [theme, setTheme] = useState<CommunityTheme>("dark");
  useEffect(() => {
    try {
      if (localStorage.getItem(key) === "light") setTheme("light");
    } catch {
      /* Preference storage is optional. */
    }
  }, []);
  const toggle = () =>
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(key, next);
      } catch {
        /* Keep the current-session preference. */
      }
      return next;
    });
  return { theme, toggle };
}
