/** Staged profile entrance: fog, silhouette, blade ignition, then a clear profile. */
export function ShadowProfileEffect() {
  return <div className="profile-effect shadow-profile-effect" aria-hidden="true">
    <div className="shadow-stage-dim"/>
    <div className="shadow-doorway"><div/><div/></div>
    <div className="shadow-backlight"/>
    <div className="shadow-character">
      <img src="/effects/shadow-lord-v1.png" alt=""/>
      <svg className="shadow-saber" viewBox="0 0 1024 1536" fill="none"><g className="shadow-blade"><path className="shadow-blade-glow" d="M535 751L900 970"/><path className="shadow-blade-red" d="M535 751L900 970"/><path className="shadow-blade-core" d="M535 751L900 970"/></g></svg>
    </div>
    <div className="shadow-smoke shadow-smoke-back"/>
    <div className="shadow-smoke shadow-smoke-front"/>
    <div className="shadow-red-haze"/>
    <div className="shadow-embers">{Array.from({ length: 7 }, (_,i) => <i key={i} style={{ left: `${18+i*11}%`, animationDelay: `${i*.7}s` }}/>)}</div>
  </div>;
}
