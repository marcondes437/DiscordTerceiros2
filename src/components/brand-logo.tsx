/** Marca do SENAI Conecta: dois elos (branco e vermelho) entrelaçados + nome. */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`brand-mark ${className}`} viewBox="0 0 40 28" aria-hidden>
      <circle cx="15" cy="14" r="9" fill="none" stroke="#f5f5f5" strokeWidth="3.4" />
      <circle cx="25" cy="14" r="9" fill="none" stroke="#e30613" strokeWidth="3.4" />
      <path d="M 18.66 5.78 A 9 9 0 0 1 21.25 7.53" fill="none" stroke="#090909" strokeWidth="6" />
      <path d="M 18.66 5.78 A 9 9 0 0 1 21.25 7.53" fill="none" stroke="#f5f5f5" strokeWidth="3.4" />
    </svg>
  );
}

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-logo ${className}`}>
      <BrandMark />
      <span className="brand-logo-text">
        <span>SENAI</span>CONECTA
      </span>
    </span>
  );
}
