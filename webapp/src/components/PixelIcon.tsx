/**
 * Tiny authored pixel icons. `o` pixels use currentColor so the outline reads on dark glass and light paper alike.
 */
const ICONS = {
  sun: [
    '.....o.....',
    '.o...o...o.',
    '..o.....o..',
    '....ooo....',
    '...orrro...',
    'oo.orrro.oo',
    '...orrro...',
    '....ooo....',
    '..o.....o..',
    '.o...o...o.',
    '.....o.....',
  ],
  rain: [
    '...........',
    '...ooo.....',
    '..oggoooo..',
    '.ogggggggo.',
    'ogggggggggo',
    'ogggggggggo',
    '.ooooooooo.',
    '...........',
    '.o...o...o.',
    'o...o...o..',
    '...........',
  ],
  flag: [
    'oooooooooo.',
    'okwkwkwkwo.',
    'owkwkwkwko.',
    'okwkwkwkwo.',
    'owkwkwkwko.',
    'oooooooooo.',
    'o..........',
    'o..........',
    'o..........',
    'o..........',
    'o..........',
  ],
  start: [
    '...........',
    'ooooooooooo',
    'o.........o',
    'o.rr.rr.rro',
    'o.rr.rr.rro',
    'o.........o',
    'ooooooooooo',
    '.....o.....',
    '.....o.....',
    '....ooo....',
    '...........',
  ],
  tyres: [
    '...ooooo...',
    '.ookkkkkoo.',
    '.okkgggkko.',
    'okkg...gkko',
    'okg.....gko',
    'okg.....gko',
    'okg.....gko',
    'okkg...gkko',
    '.okkgggkko.',
    '.ookkkkkoo.',
    '...ooooo...',
  ],
  pit: [
    '....ooo....',
    '.....o.....',
    '...ooooo...',
    '..o.....o..',
    '.o...r...o.',
    '.o...r...o.',
    '.o...rr..o.',
    '.o.......o.',
    '..o.....o..',
    '...ooooo...',
    '...........',
  ],
  steady: [
    '...ooooo...',
    '..o.....o..',
    '.o..ooo..o.',
    'o..o...o..o',
    'o..o.r.o..o',
    'o..o...o..o',
    '.o..ooo..o.',
    '..o.....o..',
    '...ooooo...',
    '...........',
    '...........',
  ],
} as const;

const FILL: Record<string, string> = { o: 'currentColor', r: '#E10600', g: '#8A8A8A', w: '#FFFFFF', k: '#111111' };

export type IconName = keyof typeof ICONS;

export function PixelIcon({ name, size = 16, label }: { name: IconName; size?: number; label?: string }) {
  const rows = ICONS[name];
  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} fill={FILL[c]} />)),
      )}
    </svg>
  );
}

export const WeatherIcon = ({ wet, size }: { wet: boolean; size?: number }) => (
  <PixelIcon name={wet ? 'rain' : 'sun'} size={size} label={wet ? 'Wet' : 'Dry'} />
);
