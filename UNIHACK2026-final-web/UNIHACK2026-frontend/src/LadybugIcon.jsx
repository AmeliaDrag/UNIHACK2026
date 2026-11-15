export const DEFAULT_WINGS = '#c62828';
export const DEFAULT_DOTS  = '#111111';
const HEX = /^#[0-9a-f]{6}$/i;

// Small ladybug in the user's own colors (falls back to the default red/black).
export default function LadybugIcon({ wings, dots, size = 28 }) {
  const w = HEX.test(wings) ? wings : DEFAULT_WINGS;
  const d = HEX.test(dots)  ? dots  : DEFAULT_DOTS;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" style={{ flexShrink: 0 }}>
      <ellipse cx="60" cy="68" rx="38" ry="34" fill={w} />
      <line x1="60" y1="34" x2="60" y2="102" stroke="#111" strokeWidth="3.5" />
      <circle cx="42" cy="58" r="8" fill={d} />
      <circle cx="78" cy="58" r="8" fill={d} />
      <circle cx="40" cy="80" r="7" fill={d} />
      <circle cx="80" cy="80" r="7" fill={d} />
      <circle cx="60" cy="90" r="6" fill={d} />
      <circle cx="60" cy="34" r="18" fill="#111" />
      <circle cx="52" cy="29" r="4" fill="#fff" />
      <circle cx="68" cy="29" r="4" fill="#fff" />
      <circle cx="53" cy="30" r="2" fill="#111" />
      <circle cx="69" cy="30" r="2" fill="#111" />
      <line x1="52" y1="17" x2="44" y2="6" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="68" y1="17" x2="76" y2="6" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="43" cy="5" r="3" fill="#111" />
      <circle cx="77" cy="5" r="3" fill="#111" />
    </svg>
  );
}