import { useId, type CSSProperties } from 'react';
import { ShadowProfileEffect } from './shadow-profile-effect';

export const profileStyles = [
  { id: 'none', name: 'Sem efeito' },
  { id: 'sakura', name: 'Jardim Sakura' },
  { id: 'lunar', name: 'Eclipse Lunar' },
  { id: 'web', name: 'Teia de Cristal' },
  { id: 'neon', name: 'Pulso Vermelho' },
] as const;
export type ProfileStyle = typeof profileStyles[number]['id'];
export const profileEffects = [...profileStyles, { id: 'shadow', name: 'Lorde Sombrio' }] as const;

function Blossom({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}><g className="sakura-flower">{[0,72,144,216,288].map(a => <g key={a} transform={`rotate(${a})`}><path d="M0 1C-8-3-8-12-3-12L0-10L3-12C9-10 7-3 0 1Z" fill="#f6a4ca"/><path d="M0 0Q-3-6 0-10Q3-5 0 0" fill="#ffe7f3"/><path d="M0 0L-2-6M0 0L2-5" stroke="#d968a0" strokeWidth=".5"/></g>)}<circle r="2.5" fill="#fff0b5"/></g></g>;
}
function Raven({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}><g className="lunar-raven"><path d="M-15 1Q-10-10-1-3Q4-10 14-8L8-3L16-2L8 1Q6 10-1 12L-6 18L-5 10L-13 13L-9 5Z" fill="#10292f"/><path d="M-10 3Q-4-2 3 0M-7 6L0 3" stroke="#49717a"/><circle cx="8" cy="-5" r=".9" fill="#ff6c86"/></g></g>;
}
const webPoint = (angle: number, radius: number) => `${60+Math.sin(angle)*radius},${60-Math.cos(angle)*radius}`;

export function AvatarDecoration({ theme = 'none' }: { theme?: string }) {
  const id = useId().replace(/:/g, '');
  if (theme === 'none') return null;
  return <svg className={`avatar-decoration decoration-${theme} decoration-detailed`} viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <defs><linearGradient id={`${id}-metal`} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse"><stop stopColor="#ecfdff"/><stop offset=".35" stopColor={theme === 'neon' ? '#ff385c' : '#568994'}/><stop offset=".65" stopColor="#d5f6fc"/><stop offset="1" stopColor="#426776"/></linearGradient><radialGradient id={`${id}-moon`}><stop stopColor="#fffdf2"/><stop offset=".7" stopColor="#d7e7e9"/><stop offset="1" stopColor="#88b3c3"/></radialGradient></defs>
    {theme === 'sakura' && <><path d="M19 106C4 88 4 68 11 47C16 31 25 20 46 13M14 73L0 63L3 52M11 49L4 32L9 23M26 28L22 13L29 8M79 12C100 20 114 45 110 66M99 27L113 22L117 12M109 49L119 43" stroke="#63394f" strokeWidth="3" strokeLinecap="round"/><path d="M19 106C4 88 4 68 11 47C16 31 25 20 46 13M79 12C100 20 114 45 110 66" stroke="#d68baa" strokeWidth="1"/>{[[12,82,140],[15,39,20],[36,17,70],[103,37,-20],[93,22,-70]].map(([x,y,r],i) => <path key={i} d="M0 0Q-8-12 2-18Q9-7 0 0Z" transform={`translate(${x} ${y}) rotate(${r})`} fill="#b879a0" stroke="#edbad1" strokeWidth=".5"/>)}<Blossom x={8} y={58} size={.7}/><Blossom x={17} y={29}/><Blossom x={36} y={15} size={.7}/><Blossom x={83} y={16} size={.6}/><Blossom x={103} y={34} size={.85}/><Blossom x={13} y={91} size={.6}/><g className="sakura-loose-petal"><path d="M98 83Q109 82 105 93Q96 97 98 83Z" fill="#ffd3e8"/><path d="M31 108Q41 104 41 114Q34 121 31 108Z" fill="#ed8cbb"/></g></>}
    {theme === 'lunar' && <><circle cx="60" cy="60" r="49" stroke="#31535f" strokeWidth="3"/><circle cx="60" cy="60" r="51" stroke={`url(#${id}-metal)`} strokeWidth=".8"/><g className="lunar-moon"><circle cx="60" cy="12" r="13" fill={`url(#${id}-moon)`}/><path d="M64 0Q47 9 56 24A13 13 0 0 0 64 0Z" fill="#50747f" opacity=".4"/><circle cx="54" cy="8" r="2.7" fill="#7f9ca7" opacity=".3"/><circle cx="62" cy="16" r="3.8" fill="#668e9e" opacity=".24"/></g><g stroke="#234b51" strokeWidth="3" strokeLinecap="round"><path d="M25 111Q4 87 9 57Q4 35 15 11M9 57L0 45L1 30M12 31L5 19L8 3M14 16L25 6M96 109Q115 86 111 56L105 29L111 7M111 56L119 44L116 30M106 31L96 19L98 8"/></g><path d="M24 109Q5 85 11 56M97 108Q113 85 109 57" stroke="#679b9d" strokeWidth=".8"/><Raven x={26} y={17} size={.55}/><Raven x={89} y={19} size={.48}/><g className="lunar-sparkles" fill="#caedff">{[[16,78],[104,78],[35,108],[81,108]].map(([x,y],i) => <path key={i} d={`M${x} ${y-4}l1 3 3 1-3 1-1 4-1-4-3-1 3-1Z`}/>)}</g></>}
    {theme === 'web' && <><g stroke={`url(#${id}-metal)`} strokeWidth="1.05">{Array.from({length:14},(_,i) => { const a=i*Math.PI/7; const b=(i+1)*Math.PI/7; return <g key={i}><path d={`M${webPoint(a,43)}L${webPoint(a,59)}`}/>{[46,52,58].map(r => <path key={r} d={`M${webPoint(a,r)}Q${webPoint((a+b)/2,r-4)} ${webPoint(b,r)}`}/>)}</g>; })}</g><g className="web-glints" fill="#fff">{[1,4,7,10,12].map(i => <circle key={i} cx={60+Math.sin(i*Math.PI/7)*56} cy={60-Math.cos(i*Math.PI/7)*56} r="1.2"/>)}</g><g className="web-spider"><path d="M102 12V36" stroke="#b7e3ed" strokeWidth=".7"/><ellipse cx="102" cy="39" rx="3" ry="4.5" fill="#e5f9ff"/><circle cx="102" cy="34" r="2" fill="#7599aa"/><path d="M99 36L94 32L92 35M99 38L92 37L91 40M105 36L110 32L112 35M105 38L112 37L113 40M99 41L95 46M105 41L109 46" stroke="#a8d8e9" strokeWidth="1"/></g></>}
    {theme === 'neon' && <><circle cx="60" cy="60" r="49" stroke="#481425" strokeWidth="5"/><circle cx="60" cy="60" r="49" stroke="#ff3359" strokeWidth="1.4"/><g className="neon-orbit"><circle cx="60" cy="60" r="55" stroke="#ff5271" strokeWidth="1.3" strokeDasharray="37 20 6 16"/><circle cx="60" cy="60" r="52" stroke="#ffe6eb" strokeWidth="1" strokeDasharray="3 75"/></g><g stroke={`url(#${id}-metal)`} strokeWidth="2" fill="#240e18"><path d="M19 17L34 7L44 7L40 12L25 21L17 34L11 36L11 28ZM101 103L86 113L76 113L80 108L95 99L103 86L109 84L109 92ZM9 55L4 63L10 72L13 65ZM111 65L116 57L110 48L107 55Z"/></g><g className="neon-electric" stroke="#fff4f7" strokeWidth="1.4"><path d="M24 14L14 25L18 26L9 39M97 105L107 94L103 93L112 80"/></g><g fill="#ff6d88">{[0,1,2,3,4].map(i => <rect key={i} x={46+i*6} y="3" width="3" height="2" rx=".5"/>)}</g></>}
  </svg>;
}

export function ProfileEffect({ theme = 'none' }: { theme?: string }) {
  if (theme === 'none') return null;
  if (theme === 'shadow') return <ShadowProfileEffect/>;
  return <div className={`profile-effect effect-${theme} effect-detailed`} aria-hidden="true">
    <div className="profile-effect-halo"/>
    <svg className="profile-scenery" viewBox="0 0 400 500" preserveAspectRatio="xMidYMin slice" fill="none">
      {theme === 'sakura' && <><g stroke="#7c456b" strokeWidth="4" strokeLinecap="round"><path d="M410 12Q343 44 308 85L243 94M345 48L348 16L334 2M307 85L318 118L302 148M400 65L369 81L350 116M-10 212L24 232L43 278M24 232L53 221L66 198"/></g><g opacity=".75"><Blossom x={350} y={29} size={1.1}/><Blossom x={332} y={61} size={.9}/><Blossom x={305} y={86} size={1.3}/><Blossom x={253} y={93} size={.8}/><Blossom x={320} y={127} size={.7}/><Blossom x={375} y={80} size={1.1}/><Blossom x={42} y={270} size={.9}/><Blossom x={60} y={212} size={.7}/></g></>}
      {theme === 'lunar' && <><circle cx="317" cy="57" r="34" fill="#b6d8e9" opacity=".1"/><circle cx="317" cy="57" r="26" fill="#d3effa" opacity=".25"/><circle cx="307" cy="50" r="5" fill="#355268" opacity=".3"/><path d="M400 112L364 94L346 70M367 96L332 102L310 90M382 103L388 79" stroke="#395660" strokeWidth="3"/><Raven x={359} y={79} size={.8}/><g className="lunar-flying-bird" fill="#315563"><path d="M83 145Q63 123 46 135Q65 133 78 150Q96 136 117 138Q96 127 83 145Z"/><path d="M168 185Q156 170 142 180Q155 177 166 190Q178 180 193 181Q180 174 168 185Z"/></g></>}
      {theme === 'web' && <><g stroke="#8ac5d3" strokeWidth="1" opacity=".5">{[0,1,2,3,4,5].map(i => <path key={i} d={`M0 0L${50+i*52} ${245-i*38}`}/>)}{[40,80,125,175,225].map(r => <path key={r} d={`M0 ${r}Q${r*.25} ${r*.7} ${r*.42} ${r*.63}Q${r*.7} ${r*.5} ${r*.76} ${r*.31}Q${r*.96} ${r*.25} ${r} 0`}/>)}</g><g className="profile-hanging-spider"><path d="M340 0V125" stroke="#91c5d6" opacity=".5"/><ellipse cx="340" cy="134" rx="6" ry="10" fill="#6da1b8"/><circle cx="340" cy="123" r="4" fill="#d7f4ff"/><path d="M335 126L324 116L316 120M335 131L320 130L312 136M335 137L325 146L319 145M345 126L356 116L364 120M345 131L360 130L368 136M345 137L355 146L361 145" stroke="#acdbe9" strokeWidth="1.5"/></g></>}
      {theme === 'neon' && <><path d="M0 65H23L40 48H90M400 178H376L359 195H309M400 20H365L348 37H324" stroke="#ff3b63" opacity=".6"/><g className="profile-circuit-points" fill="#ff8ba3"><circle cx="90" cy="48" r="3"/><circle cx="309" cy="195" r="3"/><circle cx="324" cy="37" r="2"/></g><path className="profile-electric-flash" d="M392 70L369 95L382 95L351 132M14 290L36 263L25 263L52 232" stroke="#ffb3c4" strokeWidth="2" strokeLinejoin="round"/></>}
    </svg>
    {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i, '--x': `${(i*29+9)%100}%`, '--delay': `${-i*1.7}s`, '--duration': `${9+i%5}s`, '--sway': `${i%2 ? -45 : 35}px` } as CSSProperties}/>)}
    <div className="profile-effect-mist"/>
  </div>;
}
