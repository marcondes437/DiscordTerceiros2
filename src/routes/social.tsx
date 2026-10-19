import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SocialExperience } from "@/components/social-experience";
import { validPostId } from "@/lib/social";
export const Route = createFileRoute("/social")({
  validateSearch: (search: Record<string, unknown>): { post?: string } =>
    validPostId(search["post"]) ? { post: search["post"] } : {},
  head: () => ({
    meta: [
      { title: "Social | SENAI Conecta" },
      {
        name: "description",
        content: "Publicações, conversas, enquetes e novidades da comunidade.",
      },
    ],
  }),
  component: Social,
});
function Social() {
  const { post } = Route.useSearch();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let live = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (live) setUser(data.user);
    });
    const { data } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user ?? null),
    );
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return <SocialExperience user={user} focusedPost={post} />;
}
