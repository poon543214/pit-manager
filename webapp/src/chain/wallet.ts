import { BrowserProvider, JsonRpcSigner } from "ethers";
import { CHAIN_ID_HEX, CHAIN_NAME } from "./config";

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
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch {
    throw new Error(`Switch MetaMask to the ${CHAIN_NAME} network.`);
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
