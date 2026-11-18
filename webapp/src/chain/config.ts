import local from "./local-deployment.json";
import sepolia from "./sepolia-deployment.json";

// เลือก chain ด้วย VITE_CHAIN (ค่าเริ่มต้น sepolia): sepolia = testnet ที่ตรวจได้บน Etherscan, local = Hardhat node ในเครื่อง
export interface ChainConfig {
  key: "local" | "sepolia";
  address: string;
  chainIdHex: string;
  name: string;
  /** สำหรับเพิ่ม network ให้ MetaMask อัตโนมัติ */
  rpcUrl: string;
  explorer?: string;
}

const CHAINS: Record<ChainConfig["key"], ChainConfig> = {
  // address เขียนทับโดย `npm run deploy:local` ในโฟลเดอร์ contracts
  local: { key: "local", address: local.address, chainIdHex: "0x7a69", name: "Hardhat Local", rpcUrl: "http://127.0.0.1:8545" },
  // ใส่ address หลัง deploy contracts/remix/PitWallNFT.sol บน Remix ที่ src/chain/sepolia-deployment.json
  sepolia: {
    key: "sepolia",
    address: sepolia.address,
    chainIdHex: "0xaa36a7",
    name: "Sepolia",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
  },
};

export const CHAIN = CHAINS[(import.meta.env.VITE_CHAIN as ChainConfig["key"]) ?? "sepolia"] ?? CHAINS.sepolia;
export const CONTRACT_ADDRESS = CHAIN.address;
export const CHAIN_ID_HEX = CHAIN.chainIdHex;
export const CHAIN_NAME = CHAIN.name;
export const IS_LOCAL = CHAIN.key === "local";

// 1 coin ในเกม = 0.00001 ETH (ต้องตรงกับ COIN ใน contract)
export const COIN_ETH = 0.00001;

/** ลิงก์ Etherscan ของ address หรือธุรกรรม (ไม่มีบน local) */
export const explorerLink = (kind: "address" | "tx", value: string) =>
  CHAIN.explorer && /^0x[0-9a-fA-F]+$/.test(value) ? `${CHAIN.explorer}/${kind}/${value}` : null;
