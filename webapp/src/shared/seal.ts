import { AbiCoder, keccak256 } from 'ethers';
import type { Loadout } from './types';

const TYPES = ['uint256', 'string', 'string', 'string', 'string', 'string', 'string', 'uint256[]', 'string[]', 'bytes32'];

/**
 * keccak256 of the ABI-encoded setup, field for field what a contract recomputes on reveal:
 * keccak256(abi.encode(round, driverId, engine, aero, gearbox, suspension, tire, stopLaps, stopTires, salt))
 */
export function commitHash(round: number, l: Loadout, salt: string): string {
  const values = [
    round,
    l.driverId ?? '',
    l.parts.engine ?? '',
    l.parts.aero ?? '',
    l.parts.gearbox ?? '',
    l.parts.suspension ?? '',
    l.tire,
    l.stops.map((s) => s.lap),
    l.stops.map((s) => s.tire),
    salt,
  ];
  return keccak256(AbiCoder.defaultAbiCoder().encode(TYPES, values));
}
