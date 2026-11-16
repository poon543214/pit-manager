import type { ReactNode } from 'react';
import type { Driver } from '../shared/types';
import { PerkIcon } from './PerkIcon';
import { DriverImg } from './Sprites';
import { StatBar } from './StatBar';

interface Props {
  driver: Driver;
  selected?: boolean;
  footer?: ReactNode;
  onClick?: () => void;
}

export function DriverCard({ driver, selected, footer, onClick }: Props) {
  return (
    <div className={`card driver-card ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="card-art">
        <DriverImg d={driver} />
      </div>
      <h3 className="name-with-perk">
        {driver.name} <PerkIcon id={driver.perk} />
      </h3>
      <StatBar label="PACE" value={driver.pace} tone="red" />
      <StatBar label="CONS" value={driver.consistency} tone="white" />
      <StatBar label="WET" value={driver.wet} tone="black" />
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}
