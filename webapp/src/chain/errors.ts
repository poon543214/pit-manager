import { CHAIN_NAME } from "./config";

/** Contract revert reasons, in words a player understands. */
const REVERTS: Record<string, string> = {
  "not enough coins": "Not enough coins for that. Tap + to exchange ETH for coins.",
  "send a whole number of coins": "The ETH sent must buy a whole number of coins.",
  "nothing to spend": "There is nothing to pay for.",
  "already own this driver": "This wallet already owns that driver.",
  "already own this part": "This wallet already owns that part.",
  "unknown driver": "That driver isn't in the contract's catalog.",
  "unknown part": "That part isn't in the contract's catalog.",
  "hold a driver NFT to race": "You need a driver NFT to post a race.",
  "too many points": "A race can score at most 25 points.",
  "round already posted": "This round is already posted for this season.",
  "season race limit reached": "You have posted all 6 races of this on-chain season. Wait for the steward to end it.",
  "nothing to claim": "There is no prize to claim.",
  "not owner": "Only the contract owner (the race steward) can do that.",
};

/**
 * Turns what MetaMask, the node or the contract threw into one readable sentence.
 * Ethers v6 marks the common cases with a `code`; a revert carries the contract's `require` message as `reason`.
 */
export function friendlyError(e: unknown): string {
  const err = e as { code?: string | number; reason?: string; shortMessage?: string; message?: string; info?: { error?: { code?: number; message?: string } }; error?: { code?: number; message?: string } };
  const inner = err?.info?.error ?? err?.error;
  const text = `${err?.reason ?? ""} ${err?.shortMessage ?? ""} ${inner?.message ?? ""} ${err?.message ?? ""}`.toLowerCase();

  if (err?.code === "ACTION_REJECTED" || err?.code === 4001 || inner?.code === 4001 || text.includes("user rejected") || text.includes("user denied"))
    return "You cancelled the transaction in MetaMask. Nothing was sent.";
  if (err?.code === -32002 || inner?.code === -32002 || text.includes("already pending"))
    return "MetaMask already has a request open. Finish it in the MetaMask window first.";
  if (err?.code === "INSUFFICIENT_FUNDS" || text.includes("insufficient funds"))
    return `Not enough ${CHAIN_NAME} ETH to pay for this and its gas fee.`;
  for (const [reason, message] of Object.entries(REVERTS)) if (text.includes(reason)) return message;
  if (err?.code === "CALL_EXCEPTION") return `The contract refused the transaction${err.reason ? `: ${err.reason}` : ""}.`;
  if (err?.code === "NETWORK_ERROR" || text.includes("failed to fetch") || text.includes("could not detect network"))
    return `Can't reach ${CHAIN_NAME}. Check your connection and that MetaMask is on ${CHAIN_NAME}.`;
  if (text.includes("nonce")) return "MetaMask's transaction count is out of step. In MetaMask: Settings → Advanced → Clear activity tab data.";
  if (err?.code === "TIMEOUT") return "The network took too long to answer. Try again in a moment.";
  return err?.shortMessage ?? err?.message ?? String(e);
}
