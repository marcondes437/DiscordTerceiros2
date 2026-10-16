import { useEffect, useRef } from 'react';

/**
 * Partículas de luz (brancas e vermelhas) subindo devagar no fundo do site.
 * Leve: poucas partículas, pausa com a aba escondida e desliga com "reduzir movimento".
 */
export function AmbientParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sprite = (color: string) => {
      const c = document.createElement('canvas');
      c.width = c.height = 48;
      const g = c.getContext('2d')!;
      const grd = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.2, color);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 48, 48);
      return c;
    };
    const sprites = [sprite('rgba(245,245,245,0.8)'), sprite('rgba(227,6,19,0.95)')];

    type P = { x: number; y: number; r: number; v: number; ph: number; red: boolean; a: number };
    let W = 0;
    let H = 0;
    let list: P[] = [];
    const make = () => {
      const count = window.innerWidth < 760 ? 22 : 56;
      list = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.8 + Math.random() * 2,
        v: 6 + Math.random() * 16,
        ph: Math.random() * Math.PI * 2,
        red: Math.random() < 0.45,
        a: 0.25 + Math.random() * 0.5,
      }));
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      make();
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of list) {
        p.y -= p.v * dt;
        p.x += Math.sin(now / 2400 + p.ph) * 6 * dt;
        if (p.y < -20) {
          p.y = H + 20;
          p.x = Math.random() * W;
        }
        const s = p.r * 6;
        ctx.globalAlpha = p.a * (0.75 + 0.25 * Math.sin(now / 900 + p.ph));
        ctx.drawImage(sprites[p.red ? 1 : 0]!, p.x - s, p.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start());

    resize();
    start();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas className="scene-particles" ref={ref} aria-hidden />;
}
