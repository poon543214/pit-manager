import { asset } from '../shared/constants';
import { carCanvas } from './pixelArt';

export type CarImage = HTMLCanvasElement | HTMLImageElement;

const cache = new Map<string, CarImage>();

export function carImage(color: string): CarImage {
  let img = cache.get(color);
  if (!img) {
    img = carCanvas(color);
    cache.set(color, img);
  }
  return img;
}

/** Player car: prefer the generated PNG if present, fall back to the procedural one. */
export function loadPlayerCar(color: string): Promise<CarImage> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(carImage(color));
    img.src = asset('car', 'car_topdown');
  });
}

export function drawCar(ctx: CanvasRenderingContext2D, img: CarImage, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle + Math.PI / 2); // sprite nose points up (-y)
  ctx.fillStyle = 'rgba(17,17,17,0.4)';
  ctx.fillRect(-13, -29, 32, 64);
  ctx.drawImage(img, -16, -32, 32, 64);
  ctx.restore();
}
