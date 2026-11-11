export default function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 64 56" width="44" height="38" aria-hidden="true">
        <path d="M32 2 2 26h8v28h44V26h8L32 2Z" fill="var(--brand-dark)" />
        <text x="32" y="47" textAnchor="middle" fontFamily="Ubuntu, sans-serif" fontWeight="700" fontSize="17" fill="#fff">MHB</text>
      </svg>
      <span className="logo-text">
        MobileHomes<span>&amp;</span>Beyond
      </span>
    </span>
  );
}
