import { useEffect, useState } from "react";
type Hidden = { channel: string[]; direct: string[] };
const empty = (): Hidden => ({ channel: [], direct: [] });
const keyFor = (userId: string) => `conecta:hidden-messages:${userId}`;
function readHidden(userId?: string): Hidden {
  if (!userId) return empty();
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(userId)) || "{}");
    const ids = (list: unknown) =>
      Array.isArray(list)
        ? list
            .filter((id): id is string => typeof id === "string" && id.length <= 100)
            .slice(0, 10000)
        : [];
    return { channel: ids(value?.channel), direct: ids(value?.direct) };
  } catch {
    return empty();
  }
}
export function useHiddenMessages(userId?: string) {
  const [state, setState] = useState({ owner: userId, hidden: empty() });
  const hidden = state.owner === userId ? state.hidden : empty();
  useEffect(() => {
    const restore = () => setState({ owner: userId, hidden: readHidden(userId) });
    restore();
    const sync = (event: StorageEvent) => {
      if (userId && (event.key === keyFor(userId) || event.key === null)) restore();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [userId]);
  const hide = (kind: keyof Hidden, id: string) => {
    if (!userId) return false;
    // Merge the latest stored IDs so another tab's changes are not overwritten.
    const latest = readHidden(userId);
    const next = {
      channel: [...new Set([...latest.channel, ...hidden.channel])],
      direct: [...new Set([...latest.direct, ...hidden.direct])],
    };
    next[kind] = [...new Set([...next[kind], id])];
    setState({ owner: userId, hidden: next });
    try {
      if (next[kind].length > 10000) return false;
      localStorage.setItem(keyFor(userId), JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  };
  return { hidden, hide };
}
