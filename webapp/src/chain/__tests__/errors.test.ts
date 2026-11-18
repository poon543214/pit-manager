import { makeError } from 'ethers';
import { describe, expect, it } from 'vitest';
import { friendlyError } from '../errors';

describe('friendlyError', () => {
  it('explains a transaction the player cancelled in MetaMask', () => {
    expect(friendlyError(makeError('user rejected action', 'ACTION_REJECTED', { action: 'sendTransaction', reason: 'rejected' }))).toMatch(/cancelled/);
  });
  it('explains a wallet without enough ETH for value plus gas', () => {
    expect(friendlyError(makeError('insufficient funds', 'INSUFFICIENT_FUNDS', { transaction: {} }))).toMatch(/Not enough .* ETH/);
  });
  it("turns the contract's require message into words", () => {
    const e = makeError('execution reverted: "not enough coins"', 'CALL_EXCEPTION', { action: 'estimateGas', data: null, reason: 'not enough coins', transaction: { to: null, data: '0x' }, invocation: null, revert: null });
    expect(friendlyError(e)).toMatch(/Tap \+ to exchange/);
  });
  it('explains an unreachable network', () => {
    expect(friendlyError(makeError('failed to fetch', 'NETWORK_ERROR', { event: 'x' }))).toMatch(/Can't reach/);
  });
  it('falls back to the original message', () => {
    expect(friendlyError(new Error('something odd'))).toBe('something odd');
  });
});
