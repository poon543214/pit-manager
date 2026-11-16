import { AXES, AXIS_LABEL, AXIS_SHORT, type BuildAxis } from '../shared/buildProfile';

const SIZE = 260;
const C = SIZE / 2;
const R = 88;

/** Corner i of the hexagon at radius r; the first axis points straight up. */
const at = (i: number, r: number): [number, number] => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / AXES.length;
  return [C + Math.cos(a) * r, C + Math.sin(a) * r];
};
const ring = (r: number) => AXES.map((_, i) => at(i, r).join(',')).join(' ');

/** Six-axis chart of the whole build: driver, parts and skills together. */
export function BuildRadar({ profile }: { profile: Record<BuildAxis, number> }) {
  const shape = AXES.map((k, i) => at(i, (Math.max(0.4, profile[k]) / 10) * R).join(',')).join(' ');
  const summary = AXES.map((k) => `${AXIS_LABEL[k]} ${profile[k].toFixed(1)}`).join(', ');

  return (
    <figure className="build-radar">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Build: ${summary} out of 10`} shapeRendering="crispEdges">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(R * f)} className={`br-grid${f === 1 ? ' outer' : ''}`} />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = at(i, R);
          return <line key={i} x1={C} y1={C} x2={x} y2={y} className="br-spoke" />;
        })}
        <polygon points={shape} className="br-shape" shapeRendering="geometricPrecision" />
        {AXES.map((k, i) => {
          const [x, y] = at(i, (Math.max(0.4, profile[k]) / 10) * R);
          return <rect key={k} x={x - 3} y={y - 3} width={6} height={6} className="br-dot" />;
        })}
        {AXES.map((k, i) => {
          const [x, y] = at(i, R + 24);
          return (
            <g key={k} className="br-label">
              <text x={x} y={y - 4} textAnchor="middle">
                {AXIS_SHORT[k]}
              </text>
              <text x={x} y={y + 10} textAnchor="middle" className="br-value">
                {profile[k].toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
