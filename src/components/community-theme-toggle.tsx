import { Moon, Sun } from "lucide-react";
import type { CommunityTheme } from "@/hooks/use-community-theme";
export function CommunityThemeToggle({
  theme,
  onToggle,
}: {
  theme: CommunityTheme;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="community-theme-toggle"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
