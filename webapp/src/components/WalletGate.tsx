import { useGame } from '../useGame';
import { ConfirmDialog } from './ConfirmDialog';

/** Shown when a page needs the player's wallet: drivers and parts are NFTs, so the wallet comes first. */
export function WalletGate() {
  const { gate, closeGate, connectWallet } = useGame();
  return (
    <ConfirmDialog
      open={gate !== null}
      title="Connect your wallet"
      body="Your drivers and parts are NFTs on Sepolia, and your wallet is your player account. Connect MetaMask to continue."
      confirmLabel="Connect wallet"
      onCancel={closeGate}
      onConfirm={connectWallet}
    />
  );
}
