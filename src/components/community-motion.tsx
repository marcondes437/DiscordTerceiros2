import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Waves } from "lucide-react";
import "@/routes/community-motion.css";

export type MotionMode = "full" | "subtle" | "off";
const preferenceKey = "conecta:animations";
const validMode = (value: unknown): MotionMode =>
  value === "off" || value === "subtle" ? value : "full";
const MotionContext = createContext({
  mode: "full" as MotionMode,
  effectiveMode: "full" as MotionMode,
  reducedMotion: false,
  setMode: (_mode: MotionMode) => {},
});
export function CommunityMotionProvider({ children }: { children: ReactNode }) {
  const [mode, setPreference] = useState<MotionMode>("off");
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    try {
      setPreference(validMode(localStorage.getItem(preferenceKey)));
    } catch {
      /* Optional browser preference. */
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    const syncStorage = (event: StorageEvent) => {
      if (event.key === preferenceKey || event.key === null)
        setPreference(validMode(event.newValue));
    };
    window.addEventListener("storage", syncStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);
  const effectiveMode: MotionMode = reducedMotion ? "off" : mode;
  useEffect(() => {
    const previous = document.body.dataset["conectaMotion"];
    document.body.dataset["conectaMotion"] = effectiveMode;
    return () => {
      if (previous === undefined) delete document.body.dataset["conectaMotion"];
      else document.body.dataset["conectaMotion"] = previous;
    };
  }, [effectiveMode]);
  const setMode = (value: MotionMode) => {
    setPreference(value);
    try {
      localStorage.setItem(preferenceKey, value);
    } catch {
      /* Session-only preference. */
    }
  };
  return (
    <MotionContext.Provider value={{ mode, effectiveMode, reducedMotion, setMode }}>
      {children}
    </MotionContext.Provider>
  );
}
export function MotionSettings() {
  const { mode, setMode, reducedMotion } = useContext(MotionContext);
  return (
    <div className="community-motion-settings">
      <div>
        <Waves size={20} />
        <span>
          <strong>Animações da comunidade</strong>
          <small>
            {reducedMotion
              ? "Movimento reduzido ativo no dispositivo."
              : "Transições entre canais, mensagens e menus."}
          </small>
        </span>
      </div>
      <label>
        <span className="sr-only">Intensidade das animações</span>
        <select value={mode} onChange={(event) => setMode(validMode(event.target.value))}>
          <option value="full">Fluidas</option>
          <option value="subtle">Discretas</option>
          <option value="off">Desativadas</option>
        </select>
      </label>
    </div>
  );
}
function animateSurface(element: HTMLElement, mode: MotionMode, message = false): Animation | null {
  if (
    mode === "off" ||
    typeof element.animate !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return null;
  try {
    return element.animate(
      [
        {
          opacity: 0,
          transform:
            mode === "subtle"
              ? "none"
              : `translate${message ? "Y" : "X"}(${message ? "8" : "12"}px)`,
        },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: mode === "subtle" ? 120 : message ? 200 : 260,
        easing: "cubic-bezier(.2,.8,.2,1)",
      },
    );
  } catch {
    return null;
  }
}
/** Animates the existing element; never remounts media or changes focus/scroll. */
export function useMotionSurface<T extends HTMLElement>(viewKey: string) {
  const ref = useRef<T>(null);
  const { effectiveMode } = useContext(MotionContext);
  useEffect(() => {
    const animation = ref.current ? animateSurface(ref.current, effectiveMode) : null;
    return () => animation?.cancel();
  }, [viewKey, effectiveMode]);
  return ref;
}
/** Initial history, polling, edits and deletions don't replay message entrances. */
export function useMessageMotion<T extends HTMLElement>(
  scope: string,
  ids: string[],
  ready: boolean,
) {
  const ref = useRef<T>(null);
  const { effectiveMode } = useContext(MotionContext);
  const snapshot = useRef({ scope, initialized: false, ids: new Set<string>() });
  const running = useRef(new Set<Animation>());
  const signature = ids.join("\0");
  const stableIds = useMemo(() => (signature ? signature.split("\0") : []), [signature]);
  useEffect(() => {
    const previous = snapshot.current;
    if (previous.scope !== scope || !ready || !previous.initialized) {
      snapshot.current = { scope, initialized: ready, ids: new Set(stableIds) };
      return;
    }
    const added = new Set(stableIds.filter((id) => !previous.ids.has(id)));
    snapshot.current = { scope, initialized: true, ids: new Set(stableIds) };
    if (added.size > 4 || !ref.current) return;
    for (const element of ref.current.querySelectorAll<HTMLElement>("[data-message-id]")) {
      if (!added.has(element.dataset["messageId"] || "")) continue;
      const animation = animateSurface(element, effectiveMode, true);
      if (animation) {
        running.current.add(animation);
        animation.onfinish = () => running.current.delete(animation);
        animation.oncancel = () => running.current.delete(animation);
      }
    }
  }, [scope, stableIds, ready, effectiveMode]);
  useEffect(
    () => () => {
      for (const animation of running.current) animation.cancel();
      running.current.clear();
    },
    [scope, effectiveMode],
  );
  return ref;
}
