import { hexlify, randomBytes } from 'ethers';

export { commitHash } from '../shared/seal';

/** Random 32-byte salt so two identical setups never share a hash. */
export const newSalt = () => hexlify(randomBytes(32));

/** Race seed drawn at reveal time. Stands in for Chainlink VRF or a later block hash. */
export const drawSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff;
