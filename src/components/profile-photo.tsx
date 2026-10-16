import { useEffect, useRef, useState } from 'react';

/** Render static photos from the original at the exact display pixel density. */
export function ProfilePhoto({ src, alt = '', staticImage }: { src: string; alt?: string; staticImage?: boolean }) {
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  // Keep GIF and WebP on the native image path so animated files keep playing.
  const staticPhoto = staticImage ?? /\.(?:jpe?g|png)(?:\?|$)/i.test(src);

  useEffect(() => {
    setReady(false);
    const img = image.current;
    const cv = canvas.current;
    if (!staticPhoto || !img || !cv || typeof ResizeObserver === 'undefined') return;
    const parent = img.parentElement;
    if (!parent) return;
    const draw = () => {
      if (!img.complete || !img.naturalWidth || !img.naturalHeight) return;
      const { width, height } = parent.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = window.devicePixelRatio || 1;
      cv.width = Math.round(width * ratio);
      cv.height = Math.round(height * ratio);
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const scale = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
      const sw = cv.width / scale;
      const sh = cv.height / scale;
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, cv.width, cv.height);
      setReady(true);
    };
    img.addEventListener('load', draw);
    window.addEventListener('resize', draw);
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    draw();
    return () => { observer.disconnect(); img.removeEventListener('load', draw); window.removeEventListener('resize', draw); };
  }, [src, staticPhoto]);

  return <><img ref={image} src={src} alt={alt} className={ready ? 'profile-photo-original is-rendered' : 'profile-photo-original'}/>{staticPhoto && <canvas ref={canvas} className={`profile-photo-render ${ready ? 'is-ready' : ''}`} aria-hidden="true"/>}</>;
}
