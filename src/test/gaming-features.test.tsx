import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { badges, captureError, inviteUrl } from "@/lib/gaming";
import { PostText } from "@/components/post-text";
import { games } from "@/data/games";
afterEach(cleanup);
it("routes Rabisco to the published game and keeps SlitherSenai integrated", () => {
  expect(games.map((g) => g.url)).toEqual(["https://rabisco-rho.vercel.app/", "/jogar?game=slithersenai"]);
});
it("validates capture type and upload limits", () => {
  expect(captureError({ type: "video/webm", size: 1024 })).toBeNull();
  expect(captureError({ type: "image/png", size: 51 * 1024 * 1024 })).toContain("50 MB");
  expect(captureError({ type: "image/svg+xml", size: 32 })).toContain("Use PNG");
  expect(captureError({ type: "image/png", size: 0 })).toContain("vazio");
});
it("builds game invitations that can be followed from the Social", () => {
  const link = inviteUrl({ id: "a-room", game: "rabisco" }, "https://example.com");
  render(<PostText text={`Bora jogar? ${link}`} />);
  expect(screen.getByRole("link", { name: /entrar na sala/i })).toHaveAttribute("href", link);
  expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
});
it("does not turn javascript or HTML into executable links", () => {
  render(<PostText text={"javascript:alert(1) <script>alert(1)</script>"} />);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(document.querySelector("script")).toBeNull();
});
it("defines distinct cosmetic challenges rather than cosmetic role privileges", () => {
  expect(new Set(badges.map((b) => b.id)).size).toBe(5);
  expect(badges.every((b) => b.title && b.description && /^#[a-f0-9]{6}$/i.test(b.color))).toBe(
    true,
  );
});
