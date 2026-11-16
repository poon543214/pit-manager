/** Spoken names for the short on-screen labels. */
const FULL: Record<string, string> = {
  PACE: 'Pace',
  CONS: 'Consistency',
  WET: 'Wet skill',
  SPD: 'Speed',
  CRN: 'Cornering',
  BRK: 'Braking',
};

interface Props {
  label: string;
  value: number;
  max?: number;
  tone?: 'red' | 'white' | 'black';
}

/** Segmented pixel meter. */
export function StatBar({ label, value, max = 10, tone = 'red' }: Props) {
  return (
    <div className="stat">
      <span className="stat-label" aria-hidden>
        {label}
      </span>
      <span
        className={`stat-bar tone-${tone}`}
        role="meter"
        aria-label={FULL[label.toUpperCase()] ?? label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {Array.from({ length: max }, (_, i) => (
          <i key={i} className={i < value ? 'on' : ''} />
        ))}
      </span>
      <span className="stat-num">{value}</span>
    </div>
  );
}
