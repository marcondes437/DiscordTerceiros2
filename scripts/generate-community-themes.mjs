import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const catalog = JSON.parse(
  fs.readFileSync(new URL("src/data/community-themes.json", root), "utf8"),
);
const portal =
  ':is([role="dialog"], [role="menu"], .community-profile-card, .notification-popover)';
export function generateCommunityThemeCss(themes = catalog) {
  return (
    "/* Generated from src/data/community-themes.json. Run node scripts/generate-community-themes.mjs. */\n" +
    themes
      .map(({ id, mode, palette: p }) => {
        const values = {
          background: p.bg,
          foreground: p.text,
          white: p.text,
          "ink-0": p.ink,
          "ink-1": p.bg,
          card: p.card,
          "card-foreground": p.text,
          secondary: p.secondary,
          "secondary-foreground": p.text,
          muted: p.bg,
          "muted-foreground": p.muted,
          grey: p.muted,
          accent: p.secondary,
          "accent-foreground": p.text,
          primary: p.primary,
          "primary-foreground": p.primaryText,
          ring: p.primary,
          border: p.border,
          input: p.border,
          popover: p.card,
          "popover-foreground": p.text,
          "brand-soft": `color-mix(in srgb, ${p.primary} 15%, transparent)`,
          "community-cyan": p.primary,
          "community-purple": p.primary,
          glass: p.bg,
          "glass-strong": p.ink,
          "glass-soft": p.card,
          "glass-line": p.border,
          "glass-line-hi": p.border,
          stage: p.ink,
          "stage-raised": p.card,
          "stage-hover": p.secondary,
          "stage-line": p.border,
          "stage-fg": p.text,
          "stage-muted": p.muted,
          "skin-canvas": p.canvas,
          "skin-panel": p.panel,
          "skin-header": p.header,
          "skin-radius": p.radius,
          "skin-blur": p.blur,
          "skin-font": p.font,
        };
        return (
          `.dark .community-app.community-app[data-community-skin="${id}"],\nbody:has(.community-app.community-app[data-community-skin="${id}"]) ${portal} {\n` +
          Object.entries(values)
            .map(([k, v]) => `  --${k}: ${v};`)
            .join("\n") +
          `\n  color-scheme: ${mode};\n}\n`
        );
      })
      .join("\n")
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  fs.writeFileSync(
    new URL("src/routes/community-skin-tokens.css", root),
    generateCommunityThemeCss(),
  );
