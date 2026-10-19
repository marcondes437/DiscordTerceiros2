import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  emptySocialDraft,
  parseSocialDraft,
  type SocialDraft,
  type SocialMode,
  type SocialPost,
  type SocialPerson,
} from "@/lib/social";
const db = supabase as any;
export function useSocialDraft(userId: string | undefined) {
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const [snapshot, setSnapshot] = useState<{ owner: string | undefined; draft: SocialDraft }>({
    owner: undefined,
    draft: emptySocialDraft(),
  });
  useEffect(() => {
    let draft = emptySocialDraft();
    try {
      if (userId) draft = parseSocialDraft(localStorage.getItem(`conecta:social-draft:${userId}`));
    } catch {
      /* Session-only draft. */
    }
    setSnapshot({ owner: userId, draft });
  }, [userId]);
  useEffect(() => {
    if (!userId || snapshot.owner !== userId) return;
    try {
      localStorage.setItem(`conecta:social-draft:${userId}`, JSON.stringify(snapshot.draft));
    } catch {
      /* Session-only draft. */
    }
  }, [snapshot, userId]);
  const draft = snapshot.owner === userId ? snapshot.draft : emptySocialDraft();
  const update = (next: Partial<SocialDraft> | ((previous: SocialDraft) => SocialDraft)) => {
    if (currentUser.current !== userId) return;
    setSnapshot((previous) => {
      const owned = previous.owner === userId ? previous.draft : emptySocialDraft();
      return {
        owner: userId,
        draft: typeof next === "function" ? next(owned) : { ...owned, ...next },
      };
    });
  };
  return { draft, update, reset: () => update(emptySocialDraft()) };
}
export function useSocialFeed(
  userId: string | undefined,
  mode: SocialMode,
  query: string,
  authorId: string | null,
) {
  const scope = `${userId}:${mode}:${query}:${authorId}`;
  const current = useRef(scope);
  current.current = scope;
  const sequence = useRef(0);
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    posts: SocialPost[];
    page: number;
    more: boolean;
  }>({ scope: "", posts: [], page: 0, more: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const page = snapshot.scope === scope ? snapshot.page : 0;
  const load = useCallback(
    async (append = false) => {
      if (!userId) return;
      const run = ++sequence.current;
      setLoading(true);
      setError("");
      try {
        const offset = append ? (page + 1) * 30 : 0;
        const result = await db.rpc("social_feed", {
          p_mode: mode,
          p_query: query,
          p_author: authorId,
          p_limit: 30,
          p_offset: offset,
        });
        if (current.current !== scope || run !== sequence.current) return;
        if (result.error) throw result.error;
        setSnapshot((previous) => ({
          scope,
          posts:
            append && previous.scope === scope
              ? [
                  ...previous.posts,
                  ...result.data.filter(
                    (p: SocialPost) => !previous.posts.some((old) => old.entry_id === p.entry_id),
                  ),
                ]
              : (result.data ?? []),
          page: append ? page + 1 : 0,
          more: result.data?.length === 30,
        }));
      } catch {
        if (current.current === scope && run === sequence.current)
          setError("Não foi possível carregar o Social. Tente novamente.");
      } finally {
        if (current.current === scope && run === sequence.current) setLoading(false);
      }
    },
    [scope, page],
  );
  const latest = useRef(load);
  latest.current = load;
  useEffect(() => {
    void latest.current();
    return () => {
      sequence.current++;
    };
  }, [scope]);
  return {
    posts: snapshot.scope === scope ? snapshot.posts : [],
    loading: loading || (!!userId && snapshot.scope !== scope && !error),
    error,
    more: snapshot.scope === scope && snapshot.more,
    refresh: () => load(),
    loadMore: () => load(true),
  };
}
export function useSocialConnections(userId: string | undefined) {
  const [snapshot, setSnapshot] = useState<{
    owner: string | undefined;
    people: SocialPerson[];
    following: string[];
    muted: string[];
    followers: number;
  }>({ owner: undefined, people: [], following: [], muted: [], followers: 0 });
  const current = useRef(userId);
  current.current = userId;
  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [people, follows, muted, followers] = await Promise.all([
        db.from("social_profiles").select("id,display_name").order("display_name").limit(1000),
        db.from("social_follows").select("following_id").eq("follower_id", userId),
        db.from("social_mutes").select("muted_id").eq("user_id", userId),
        db
          .from("social_follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", userId),
      ]);
      if (
        current.current !== userId ||
        people.error ||
        follows.error ||
        muted.error ||
        followers.error
      )
        return;
      setSnapshot({
        owner: userId,
        people: people.data ?? [],
        following: (follows.data ?? []).map((f: { following_id: string }) => f.following_id),
        muted: (muted.data ?? []).map((m: { muted_id: string }) => m.muted_id),
        followers: followers.count ?? 0,
      });
    } catch {
      /* The timeline has its own retryable error state. */
    }
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return {
    ...(snapshot.owner === userId
      ? snapshot
      : {
          people: [] as SocialPerson[],
          following: [] as string[],
          muted: [] as string[],
          followers: 0,
        }),
    refresh,
  };
}
