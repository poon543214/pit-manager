/** Deterministic PRNG (mulberry32) so a race replays identically from its seed. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T,>(list: T[]) => list[Math.floor(next() * list.length)],
    /** approx normal(0,1) */
    gauss: () => {
      let s = 0;
      for (let i = 0; i < 6; i++) s += next();
      return s - 3;
    },
  };
}
export type Rng = ReturnType<typeof createRng>;

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
