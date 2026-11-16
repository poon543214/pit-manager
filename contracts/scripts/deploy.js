const hre = require('hardhat');

async function main() {
  const nft = await hre.ethers.deployContract('PitWallNFT');
  await nft.waitForDeployment();
  console.log('PitWallNFT deployed to', await nft.getAddress());
  console.log('Put this address in webapp/src/chain/config.ts (CONTRACT_ADDRESS).');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
