/** Lightweight, decorative scene: no WebGL, video download or animation loop. */
export function OrbitScene() {
  return (
    <div className="orbit-scene" aria-hidden="true">
      <div className="orbit-stars" />
      <div className="orbit-horizon" />
      <div className="orbit-system">
        <div className="orbit-halo" />
        <div className="orbit-ring orbit-ring-back" />
        <div className="orbit-planet">
          <span />
        </div>
        <div className="orbit-ring orbit-ring-front" />
        <div className="orbit-moon" />
      </div>
      <span className="orbit-coordinate">23°30′ S / 47°27′ W</span>
      <span className="orbit-scene-caption">UM UNIVERSO FEITO PELA TURMA</span>
    </div>
  );
}
