import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';

/**
 * Terceiro A vs Terceiro B — seção sincronizada ao scroll.
 *
 * A seção é alta (várias telas) e o palco fica preso com `position: sticky`.
 * O progresso do scroll (0 → 1) é suavizado e aplicado direto no DOM, sem
 * re-render do React, em cinco etapas:
 *   1. Entrada     — a tela escurece e o título é revelado
 *   2. Separação   — 3º A (roxo) e 3º B (vermelho) entram pelas laterais
 *   3. Confronto   — os dois se aproximam, com luz, partículas e 3D
 *   4. Conexão     — encontro no centro e o símbolo do SENAI Conecta surge
 *   5. Finalização — "Duas turmas. Uma só conexão." + botão
 * Rolar para cima desfaz tudo na ordem inversa.
 */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const bell = (p: number, center: number, width: number) => Math.exp(-Math.pow((p - center) / width, 2));

const STAGES = ['Entrada', 'Separação', 'Confronto', 'Conexão', 'Final'];
const STAGE_AT = [0, 0.14, 0.32, 0.62, 0.86];

const RING_LEN = 2 * Math.PI * 62;

type Particle = { side: 0 | 1; hx: number; hy: number; r: number; ph: number; sp: number; orbit: number };

function makeParticles(count: number, vertical: boolean): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const side = (i % 2) as 0 | 1;
    const sign = side === 0 ? -1 : 1;
    const along = sign * (0.15 + Math.random() * 0.85);
    const across = (Math.random() * 2 - 1) * 0.9;
    list.push({
      side,
      hx: vertical ? across : along,
      hy: vertical ? along : across,
      r: 1 + Math.random() * 2.2,
      ph: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 0.8,
      orbit: 0.2 + Math.random() * 0.22,
    });
  }
  return list;
}

function makeSprite(color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Letra gigante com profundidade (camadas empilhadas em Z). */
function Glyph({ letter, layers }: { letter: string; layers: number }) {
  return (
    <div className="glyph" aria-hidden>
      {Array.from({ length: layers }, (_, i) => (
        <span key={i} className="glyph-layer" style={{ transform: `translateZ(${-(i + 1) * (40 / layers)}px)`, ['--depth' as string]: 1 - i / (layers + 2) }}>
          {letter}
        </span>
      ))}
      <span className="glyph-face">{letter}</span>
    </div>
  );
}

function Emblem() {
  return (
    <svg className="emblem-mark" viewBox="0 0 300 200" aria-hidden>
      <defs>
        <linearGradient id="ringA" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#a3a3a3" />
        </linearGradient>
        <linearGradient id="ringB" x1="1" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff5a62" />
          <stop offset="1" stopColor="#e30613" />
        </linearGradient>
      </defs>
      {/* elo A inteiro, elo B por cima, e um trecho do A por cima do B: os dois ficam entrelaçados */}
      <circle className="ring ring-a" cx="112" cy="100" r="62" stroke="url(#ringA)" />
      <circle className="ring ring-b" cx="188" cy="100" r="62" stroke="url(#ringB)" />
      <path className="ring-gap" d="M 141.1 45.3 A 62 62 0 0 1 158.1 58.5" />
      <path className="ring ring-a-over" d="M 141.1 45.3 A 62 62 0 0 1 158.1 58.5" stroke="url(#ringA)" />
      <circle className="emblem-core" cx="150" cy="100" r="9" />
    </svg>
  );
}

export function Rivalry() {
  const [reduced, setReduced] = useState(false);
  const [vertical, setVertical] = useState(false);

  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const titleWrap = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLSpanElement | null)[]>([]);
  const subtitle = useRef<HTMLParagraphElement>(null);
  const sideA = useRef<HTMLDivElement>(null);
  const sideB = useRef<HTMLDivElement>(null);
  const vs = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const emblem = useRef<HTMLDivElement>(null);
  const emblemName = useRef<HTMLDivElement>(null);
  const finale = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const railFill = useRef<HTMLDivElement>(null);
  const railDots = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduced(mq.matches);
      setVertical(window.innerWidth < 760 || window.innerHeight > window.innerWidth * 1.15);
    };
    sync();
    mq.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const sec = section.current;
    const cv = canvas.current;
    if (!sec || !cv) return;
    const ctx = cv.getContext('2d');
    const sprites = [makeSprite('rgba(245,245,245,0.85)'), makeSprite('rgba(227,6,19,0.95)')];
    let particles = makeParticles(vertical ? 28 : 90, vertical);
    let W = 0;
    let H = 0;

    const target = { p: 0, enter: 0 };
    const cur = { p: 0, enter: 0 };
    let raf = 0;
    let visible = false;
    let last = performance.now();

    // O palco fica preso logo abaixo do cabeçalho da janela (top do sticky).
    // Rola dentro do painel da janela ([data-scroller]); sem ele, usa a página.
    const scroller = sec.closest<HTMLElement>('[data-scroller]');
    const measure = () => {
      const r0 = sec.getBoundingClientRect();
      const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
      const r = { top: r0.top - viewTop, height: r0.height };
      const st = stage.current;
      const top = st ? parseFloat(getComputedStyle(st).top) || 0 : 0;
      const sh = st?.offsetHeight || window.innerHeight;
      target.enter = clamp(1 - (r.top - top) / sh);
      target.p = clamp((top - r.top) / Math.max(1, r.height - sh));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, vertical ? 1.5 : 2);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = makeParticles(vertical ? 28 : 90, vertical);
      measure();
    };

    const apply = (t: number) => {
      const { p, enter } = cur;
      const st = stage.current;
      if (!st) return;

      // 1 — Entrada
      st.style.setProperty('--dark', easeInOut(enter).toFixed(3));
      lines.current.forEach((el, i) => {
        if (!el) return;
        const k = easeOut(range(enter, 0.45 + i * 0.12, 0.9 + i * 0.1));
        el.style.transform = `translate3d(0, ${(1 - k) * 105}%, 0)`;
      });
      const tOut = easeInOut(range(p, 0.15, 0.27));
      if (titleWrap.current) {
        titleWrap.current.style.opacity = String(1 - tOut);
        titleWrap.current.style.transform = `translate3d(0, ${-tOut * 10}vh, 0) scale(${1 - 0.12 * tOut})`;
      }
      if (subtitle.current) {
        const k = easeOut(range(p, 0.0, 0.07));
        subtitle.current.style.opacity = String(k);
        subtitle.current.style.transform = `translate3d(0, ${(1 - k) * 16}px, 0)`;
      }
      if (hint.current) hint.current.style.opacity = String(range(enter, 0.85, 1) * (1 - range(p, 0.02, 0.08)));

      // 2 e 3 — Separação e Confronto
      const sep = easeOut(range(p, 0.14, 0.32));
      const app = easeInOut(range(p, 0.32, 0.62));
      const meet = easeInOut(range(p, 0.62, 0.74));
      const far = vertical ? 62 : 60;
      const mid = vertical ? 22 : 27;
      const near = vertical ? 8 : 9;
      let off = lerp(far, mid, sep);
      off = lerp(off, near, app);
      off = lerp(off, 0, meet);
      const rot = lerp(lerp(70, 30, sep), 12, app) * (1 - meet);
      const scale = lerp(0.82, 1, sep) * lerp(1, 0.5, meet);
      const alpha = sep * (1 - range(p, 0.69, 0.75));
      const bob = Math.sin(t / 900) * 6 * (1 - meet) * sep;
      const unit = vertical ? 'cqh' : 'cqw'; // unidades do palco (container), não da tela
      const place = (el: HTMLDivElement | null, sign: number) => {
        if (!el) return;
        // opacidade via variável nas folhas: opacity no pai achataria o 3D
        el.style.setProperty('--alpha', alpha.toFixed(3));
        el.style.transform = vertical
          ? `translate3d(0, calc(${sign * off}${unit} + ${bob * sign}px), 0) rotateX(${sign * rot}deg) scale(${scale})`
          : `translate3d(calc(${sign * off}${unit}), ${bob * sign}px, 0) rotateY(${-sign * rot}deg) scale(${scale})`;
      };
      place(sideA.current, -1);
      place(sideB.current, 1);
      const heat = clamp(0.25 + 0.75 * app + bell(p, 0.7, 0.05));
      st.style.setProperty('--heat', heat.toFixed(3));
      st.style.setProperty('--split', (1 - meet).toFixed(3));

      if (vs.current) {
        const vin = easeOut(range(p, 0.27, 0.35));
        const vout = range(p, 0.58, 0.65);
        vs.current.style.opacity = String(vin * (1 - vout));
        vs.current.style.transform = `translate(-50%, -50%) rotate(-8deg) scale(${(0.4 + 0.6 * vin) * (1 + 0.35 * app) * (1 - 0.6 * vout)})`;
      }

      // 4 — Conexão
      if (flash.current) {
        const f = bell(p, 0.72, 0.035);
        flash.current.style.opacity = String(f);
        flash.current.style.transform = `translate(-50%, -50%) scale(${0.3 + f * 1.4})`;
      }
      const em = easeOut(range(p, 0.69, 0.86));
      const fin = easeOut(range(p, 0.86, 0.96));
      if (emblem.current) {
        emblem.current.style.opacity = String(em);
        emblem.current.style.transform = `translate3d(-50%, calc(-50% - ${fin * (vertical ? 14 : 12)}cqh), 0) rotateX(${(1 - em) * 55}deg) rotateZ(${(1 - em) * -70}deg) scale(${lerp(0.55, 1, em) * lerp(1, vertical ? 0.78 : 0.82, fin)})`;
        const ringA = range(p, 0.7, 0.83);
        const ringB = range(p, 0.72, 0.85);
        emblem.current.style.setProperty('--ring-a', (RING_LEN * (1 - ringA)).toFixed(1));
        emblem.current.style.setProperty('--ring-b', (RING_LEN * (1 - ringB)).toFixed(1));
        emblem.current.style.setProperty('--over', range(p, 0.8, 0.85).toFixed(3));
      }
      if (emblemName.current) emblemName.current.style.opacity = String(range(p, 0.8, 0.88));

      // 5 — Finalização
      if (finale.current) {
        finale.current.style.opacity = String(fin);
        finale.current.style.transform = `translate3d(-50%, calc(${(1 - fin) * 30}px), 0)`;
      }
      if (cta.current) {
        const c = easeOut(range(p, 0.9, 0.98));
        cta.current.style.opacity = String(c);
        cta.current.style.transform = `translate3d(0, ${(1 - c) * 18}px, 0) scale(${0.94 + 0.06 * c})`;
        cta.current.style.pointerEvents = c > 0.5 ? 'auto' : 'none';
      }

      // Indicador de etapas
      if (rail.current) rail.current.style.opacity = String(range(p, 0.14, 0.2) * (1 - range(p, 0.97, 1))); // aparece depois que o título sai
      if (railFill.current) railFill.current.style.transform = `scaleY(${p})`;
      railDots.current.forEach((el, i) => el?.classList.toggle('is-on', p >= STAGE_AT[i]! - 0.001 && enter >= 1));

      // Partículas
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const show = sep * (1 - 0.4 * range(p, 0.92, 1));
      if (show <= 0.01) return;
      const attract = easeInOut(range(p, 0.3, 0.68));
      const burst = bell(p, 0.735, 0.05);
      const settle = easeInOut(range(p, 0.74, 0.95));
      const cx = W / 2;
      const cy = H / 2;
      const span = Math.min(W, H) * 0.5;
      const secs = t / 1000;
      ctx.globalCompositeOperation = 'lighter';
      for (const pt of particles) {
        let x = pt.hx * (1 - 0.85 * attract);
        let y = pt.hy * (1 - 0.85 * attract);
        x += Math.sin(secs * pt.sp + pt.ph) * 0.025;
        y += Math.cos(secs * pt.sp * 1.3 + pt.ph) * 0.025;
        if (settle > 0) {
          const ang = Math.atan2(y, x) + secs * 0.25 * pt.sp;
          const ox = Math.cos(ang) * pt.orbit;
          const oy = Math.sin(ang) * pt.orbit;
          x = lerp(x, ox, settle);
          y = lerp(y, oy, settle);
        }
        const push = 1 + burst * 1.6;
        const px = cx + x * push * (vertical ? span : W * 0.5);
        const py = cy + y * push * (vertical ? H * 0.5 : span);
        const size = pt.r * (5 + 4 * heat);
        ctx.globalAlpha = show * (0.45 + 0.4 * heat);
        ctx.drawImage(sprites[pt.side]!, px - size, py - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const k = 1 - Math.pow(0.86, dt / 16.7);
      cur.p += (target.p - cur.p) * k;
      cur.enter += (target.enter - cur.enter) * k;
      if (Math.abs(target.p - cur.p) < 0.0004) cur.p = target.p;
      if (Math.abs(target.enter - cur.enter) < 0.0004) cur.enter = target.enter;
      apply(now);
      if (visible) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = !!entry?.isIntersecting;
        if (visible) {
          measure();
          start();
        }
      },
      { root: scroller, rootMargin: '20% 0px' },
    );
    io.observe(sec);

    const onScroll = () => measure();
    const scrollTarget: HTMLElement | Window = scroller ?? window;
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    resize();
    cur.p = target.p;
    cur.enter = target.enter;
    apply(performance.now());

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      scrollTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
    };
  }, [reduced, vertical]);

  // Movimento reduzido: a mesma história, parada e completa.
  if (reduced) {
    return (
      <section className="rivalry is-static" id="rivalidade" aria-labelledby="rivalry-title">
        <h2 className="rivalry-title" id="rivalry-title">
          <span className="reveal-line">A rivalidade é real.</span>
          <span className="reveal-line">A conexão também.</span>
        </h2>
        <p className="rivalry-subtitle">Duas turmas. Uma comunidade. Infinitas histórias.</p>
        <div className="static-duel">
          <div className="side side-a">
            <span className="side-tag">3º</span>
            <Glyph letter="A" layers={0} />
          </div>
          <div className="static-emblem">
            <Emblem />
          </div>
          <div className="side side-b">
            <span className="side-tag">3º</span>
            <Glyph letter="B" layers={0} />
          </div>
        </div>
        <p className="finale-line">
          Duas turmas.
          <br />
          <span>Uma só conexão.</span>
        </p>
        <Link to="/comunidade" className="cta-glow">
          <span>Entrar para a comunidade</span>
        </Link>
      </section>
    );
  }

  const layers = vertical ? 4 : 6;
  return (
    <section className={`rivalry ${vertical ? 'is-vertical' : ''}`} id="rivalidade" ref={section} aria-labelledby="rivalry-title">
      <div className="rivalry-stage" ref={stage}>
        <div className="rivalry-bg" aria-hidden>
          <div className="glow glow-a" />
          <div className="glow glow-b" />
          <div className="rivalry-grid" />
        </div>
        <canvas className="rivalry-particles" ref={canvas} aria-hidden />

        <div className="rivalry-heading" ref={titleWrap}>
          <h2 className="rivalry-title" id="rivalry-title">
            {['A rivalidade é real.', 'A conexão também.'].map((line, i) => (
              <span className="reveal-line" key={line}>
                <span
                  ref={(el: HTMLSpanElement | null) => {
                    lines.current[i] = el;
                  }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h2>
          <p className="rivalry-subtitle" ref={subtitle}>
            Duas turmas. Uma comunidade. Infinitas histórias.
          </p>
        </div>

        <div className="duel" aria-hidden>
          <div className="side side-a" ref={sideA}>
            <span className="side-tag">Terceiro</span>
            <Glyph letter="A" layers={layers} />
          </div>
          <div className="side side-b" ref={sideB}>
            <span className="side-tag">Terceiro</span>
            <Glyph letter="B" layers={layers} />
          </div>
          <div className="vs" ref={vs}>
            VS
          </div>
        </div>
        <div className="clash" ref={flash} aria-hidden />

        <div className="emblem" ref={emblem} aria-hidden>
          <Emblem />
          <div className="emblem-name" ref={emblemName}>
            <span>SENAI</span> Conecta
          </div>
        </div>

        <div className="finale" ref={finale}>
          <p className="finale-line">
            Duas turmas.
            <br />
            <span>Uma só conexão.</span>
          </p>
          <div className="finale-cta" ref={cta}>
            <Link to="/comunidade" className="cta-glow">
              <span>Entrar para a comunidade</span>
            </Link>
          </div>
        </div>

        <div className="scroll-hint" ref={hint} aria-hidden>
          Role para baixo
          <span className="scroll-hint-bar" />
        </div>

        <div className="stage-rail" ref={rail} aria-hidden>
          <div className="stage-rail-track">
            <div className="stage-rail-fill" ref={railFill} />
          </div>
          <ol>
            {STAGES.map((s, i) => (
              <li
                key={s}
                ref={(el: HTMLLIElement | null) => {
                  railDots.current[i] = el;
                }}
              >
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
