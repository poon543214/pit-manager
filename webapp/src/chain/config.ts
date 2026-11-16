import local from "./local-deployment.json";

// เลือก chain ด้วย VITE_CHAIN (ค่าเริ่มต้น local): local = Hardhat node ในเครื่อง ETH ทดสอบไม่จำกัด
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
  // contract บน Sepolia ตัวเก่า (ซื้อด้วย ETH ตรง ไม่มีระบบเหรียญ) ต้อง deploy ใหม่ก่อนใช้
  sepolia: {
    key: "sepolia",
    address: "0x6eef330BBBa104DfC73307F131f763ff93F2c20C",
    chainIdHex: "0xaa36a7",
    name: "Sepolia",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
  },
};

export const CHAIN = CHAINS[(import.meta.env.VITE_CHAIN as ChainConfig["key"]) ?? "local"] ?? CHAINS.local;
export const CONTRACT_ADDRESS = CHAIN.address;
export const CHAIN_ID_HEX = CHAIN.chainIdHex;
export const CHAIN_NAME = CHAIN.name;
export const IS_LOCAL = CHAIN.key === "local";

// 1 coin ในเกม = 0.00001 ETH (ต้องตรงกับ COIN ใน contract)
export const COIN_ETH = 0.00001;
