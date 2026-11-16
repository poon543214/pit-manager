import { BrowserProvider, JsonRpcProvider, JsonRpcSigner, parseEther, toQuantity } from "ethers";
import { CHAIN, CHAIN_ID_HEX, CHAIN_NAME, IS_LOCAL } from "./config";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletSession {
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
}

// "Authen" = เชื่อมกระเป๋า: ที่อยู่กระเป๋าคือตัวตนของผู้เล่น ไม่มี email/password (สไลด์ Week 10)
export async function connectWallet(): Promise<WalletSession> {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Install it to connect a wallet.");
  }

  // เด้ง MetaMask ให้ผู้ใช้อนุญาต
  await new BrowserProvider(window.ethereum).send("eth_requestAccounts", []);
  await ensureNetwork();

  // สร้าง provider ใหม่หลังสลับ network เพื่อไม่ให้ค่าเก่าค้าง
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

// เชื่อมกลับแบบเงียบหลังรีโหลด: ใช้บัญชีที่เคยอนุญาตไว้แล้ว ไม่เด้ง popup (eth_accounts ไม่ใช่ eth_requestAccounts)
export async function reconnectWallet(): Promise<WalletSession | null> {
  if (!window.ethereum) return null;
  const accounts: string[] = await window.ethereum.request({ method: "eth_accounts" });
  const current: string = await window.ethereum.request({ method: "eth_chainId" });
  if (!accounts.length || current.toLowerCase() !== CHAIN_ID_HEX) return null;
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner(accounts[0]);
  return { provider, signer, address: await signer.getAddress() };
}

async function ensureNetwork(): Promise<void> {
  const current: string = await window.ethereum.request({ method: "eth_chainId" });
  if (current.toLowerCase() === CHAIN_ID_HEX) return;

  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
  } catch (e: any) {
    // 4902 = MetaMask ยังไม่รู้จัก network นี้: เพิ่มให้เลย (เช่น Hardhat Local ครั้งแรก)
    if (e?.code !== 4902 && e?.data?.originalError?.code !== 4902) throw new Error(`Switch MetaMask to the ${CHAIN_NAME} network.`);
    await window.ethereum
      .request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: CHAIN_NAME,
            rpcUrls: [CHAIN.rpcUrl],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            ...(CHAIN.explorer && { blockExplorerUrls: [CHAIN.explorer] }),
          },
        ],
      })
      .catch(() => {
        throw new Error(`Add the ${CHAIN_NAME} network (${CHAIN.rpcUrl}) to MetaMask.`);
      });
  }
}

/**
 * ก๊อกน้ำ ETH ทดสอบ (เฉพาะ Hardhat node ในเครื่อง): โอน ETH จริงจากบัญชีทดสอบของ node มาที่กระเป๋า
 * เป็นธุรกรรมจริงที่ขุดเป็น block ใหม่ MetaMask จึงเห็นยอดเปลี่ยนทันที (ไม่ต้อง import บัญชีทดสอบ)
 */
export async function topUpTestEth(address: string, eth = 10): Promise<void> {
  if (!IS_LOCAL) throw new Error("Test ETH is only for the local chain.");
  const node = new JsonRpcProvider(CHAIN.rpcUrl, undefined, { staticNetwork: true });
  try {
    let accounts: string[];
    try {
      accounts = await node.send("eth_accounts", []);
    } catch {
      throw new Error(`The local chain isn't running at ${CHAIN.rpcUrl}. Start it with npm run chain in contracts/.`);
    }
    // บัญชีท้ายสุดของ node (ไม่ใช่ deployer #0) เป็นคนจ่าย node เซ็นให้เพราะบัญชีทดสอบปลดล็อกอยู่แล้ว
    const from = accounts[accounts.length - 1];
    const hash: string = await node.send("eth_sendTransaction", [{ from, to: address, value: toQuantity(parseEther(String(eth))) }]);
    await node.waitForTransaction(hash);
  } finally {
    node.destroy();
  }
}

/** ยอด ETH ของกระเป๋า: บน chain local อ่านจาก node ตรง ๆ (MetaMask อาจแคชยอดเก่า) */
export async function localEthBalance(address: string): Promise<bigint | null> {
  if (!IS_LOCAL) return null;
  const node = new JsonRpcProvider(CHAIN.rpcUrl, undefined, { staticNetwork: true });
  try {
    return await node.getBalance(address);
  } finally {
    node.destroy();
  }
}

// เรียกเมื่อผู้ใช้เปลี่ยนบัญชีหรือเครือข่ายใน MetaMask คืนฟังก์ชันสำหรับเลิกฟัง
export function onWalletChange(callback: () => void): () => void {
  const eth = window.ethereum;
  if (!eth) return () => {};
  eth.on("accountsChanged", callback);
  eth.on("chainChanged", callback);
  return () => {
    eth.removeListener("accountsChanged", callback);
    eth.removeListener("chainChanged", callback);
  };
}
