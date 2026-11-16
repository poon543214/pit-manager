import { asset } from '../shared/constants';
import type { Driver, Part, TireId } from '../shared/types';
import { driverSprite, partSprite, tireSprite } from '../game/pixelArt';
import { PixelImg } from './PixelImg';

export const DriverImg = ({ d, size = 128 }: { d: Driver; size?: number }) => (
  <PixelImg src={asset('drivers', d.id)} fallback={() => driverSprite(d.id, d, d.suit)} size={size} alt={d.name} />
);

export const PartImg = ({ p, size = 64 }: { p: Part; size?: number }) => (
  <PixelImg src={asset('parts', p.id)} fallback={() => partSprite(p.slot, p.kind)} size={size} alt={p.name} />
);

export const TireImg = ({ id, size = 48 }: { id: TireId; size?: number }) => (
  <PixelImg src={asset('tires', id)} fallback={() => tireSprite(id)} size={size} alt={id} />
);
