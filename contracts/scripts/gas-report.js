const hre = require('hardhat');

// Gas each main action uses, measured on Hardhat's in-process chain. Hardhat prices gas with older EVM rules than
// Sepolia today, so storage-heavy actions cost several times more on Sepolia: quote Sepolia receipts (SECURITY.md)
// as the real cost and use these numbers only to compare functions with each other.
// Run: npx hardhat run scripts/gas-report.js
async function main() {
  const { ethers } = hre;
  const [owner, a, b, c] = await ethers.getSigners();
  const COIN = ethers.parseEther('0.00001');
  const rows = [];
  const gas = async (label, txPromise) => {
    const r = await (await txPromise).wait();
    rows.push([label, Number(r.gasUsed)]);
  };

  const factory = await ethers.getContractFactory('PitWallNFT');
  const nft = await factory.deploy();
  const dr = await nft.deploymentTransaction().wait();
  rows.push(['deploy PitWallNFT', Number(dr.gasUsed)]);

  await gas('buyCoins (1,000 coins)', nft.connect(a).buyCoins({ value: COIN * 1000n }));
  await gas('buyDriver', nft.connect(a).buyDriver('charles'));
  await gas('buyPart', nft.connect(a).buyPart('engine_speed'));
  await gas('spendCoins (tire set)', nft.connect(a).spendCoins(30, 'tires:soft x1'));
  await gas('sponsor', nft.sponsor({ value: ethers.parseEther('0.01') }));
  await gas('submitRace (first of season)', nft.connect(a).submitRace(1, 25, ethers.id('r1')));
  await gas('submitRace (later round)', nft.connect(a).submitRace(2, 18, ethers.id('r2')));
  for (const [p, d] of [[b, 'kimi'], [c, 'max']]) {
    await nft.connect(p).buyCoins({ value: COIN * 300n });
    await nft.connect(p).buyDriver(d);
    await nft.connect(p).submitRace(1, 10, ethers.id('x'));
  }
  await gas('voidRace', nft.voidRace(c.address, 1));
  await gas('endSeason (3 players)', nft.endSeason());
  await gas('claim', nft.connect(a).claim());
  await gas('withdraw', nft.withdraw());

  console.log('| Action | Gas used |');
  console.log('|---|---|');
  for (const [l, g] of rows) console.log(`| ${l} | ${g.toLocaleString('en-US')} |`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
