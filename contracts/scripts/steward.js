const hre = require('hardhat');
const { address } = require('../../webapp/src/chain/local-deployment.json');

// Race steward actions on the local chain, signed by the deployer (Hardhat account #0):
//   npm run steward                                  season status
//   STEWARD=end npm run steward                      end the season: top 3 can claim
//   STEWARD=void PLAYER=0x… ROUND=3 npm run steward  void one posted race
//   STEWARD=sponsor ETH=0.5 npm run steward          add to the prize pool
async function main() {
  const nft = await hre.ethers.getContractAt('PitWallNFT', address);
  const { STEWARD = 'status', PLAYER, ROUND, ETH = '1' } = process.env;
  if (STEWARD === 'end') await (await nft.endSeason()).wait();
  else if (STEWARD === 'void') await (await nft.voidRace(PLAYER, ROUND)).wait();
  else if (STEWARD === 'sponsor') await (await nft.sponsor({ value: hre.ethers.parseEther(ETH) })).wait();
  else if (STEWARD !== 'status') throw new Error(`Unknown STEWARD action "${STEWARD}"`);

  const season = await nft.season();
  const [top, pts] = await nft.topThree(season);
  console.log(`Season ${season} · pool ${hre.ethers.formatEther(await nft.seasonPool())} ETH`);
  top.forEach((a, i) => a !== hre.ethers.ZeroAddress && console.log(`  P${i + 1} ${a} ${pts[i]} pts`));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
