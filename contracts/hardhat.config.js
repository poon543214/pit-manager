require('@nomicfoundation/hardhat-toolbox');

// Deploying from here is optional (Remix works too). For Sepolia set these in your shell, never in a file:
//   export SEPOLIA_RPC_URL=https://...   export PRIVATE_KEY=0x...
const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: { version: '0.8.24', settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: SEPOLIA_RPC_URL && PRIVATE_KEY ? { sepolia: { url: SEPOLIA_RPC_URL, accounts: [PRIVATE_KEY] } } : {},
};
