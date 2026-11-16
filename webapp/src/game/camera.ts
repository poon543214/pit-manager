/** Smoothly follows a target; the view scrolls with the car (no rotation). Pass dt scaled up at fast playback so it keeps up. */
export function createCamera(viewW: number, viewH: number) {
  let x = 0, y = 0, ready = false;
  return {
    follow(tx: number, ty: number, dt: number) {
      // first frame, or a jump (skip to finish): cut straight to the target instead of panning across the map
      if (!ready || Math.hypot(tx - x, ty - y) > Math.max(viewW, viewH)) {
        x = tx; y = ty; ready = true;
        return;
      }
      const k = 1 - Math.exp(-dt * 6);
      x += (tx - x) * k;
      y += (ty - y) * k;
    },
    /** top-left world coordinate of the view */
    origin: () => ({ x: Math.round(x - viewW / 2), y: Math.round(y - viewH / 2) }),
  };
}
