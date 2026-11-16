const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

// On the local chain the address is written where the game reads it, and the season pool gets a 1 ETH
// sponsor stake so there is something to win in a demo.
const LOCAL_OUT = path.join(__dirname, '../../webapp/src/chain/local-deployment.json');

async function main() {
  const nft = await hre.ethers.deployContract('PitWallNFT');
  await nft.waitForDeployment();
  const address = await nft.getAddress();
  console.log('PitWallNFT deployed to', address, 'on', hre.network.name);

  if (hre.network.name === 'localhost') {
    await (await nft.sponsor({ value: hre.ethers.parseEther('1') })).wait();
    fs.writeFileSync(LOCAL_OUT, JSON.stringify({ address }, null, 2) + '\n');
    console.log('Season pool sponsored with 1 ETH. Address written to webapp/src/chain/local-deployment.json');
  } else {
    console.log('Put this address in webapp/src/chain/config.ts (the sepolia entry).');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
