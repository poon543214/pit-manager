# PitWallNFT

ERC-721 for Pit Manager's drivers and parts. Catalog keys, stats and prices match
`webapp/src/data/*.json` (checked by `npm test`).

- `claimStarter(driverKey, kind)`: one free pack per wallet (driver + one part per slot; kind 0 speed, 1 corner, 2 brake)
- `buyDriver(key)` / `buyPart(key)`: pay `priceOf(key)` in ETH (1 game coin = 0.00001 ETH); one of each type per wallet
- `inventoryOf(address)`: every token a wallet holds with its stats (what the game reads)
- `setBaseURI` / `withdraw` / `voidRace` / `endSeason`: owner only. `tokenURI(id)` = baseURI + key + `.json`

## Play to earn (seasons)

- 30% of every sale goes into `seasonPool`; `sponsor()` adds to it. `withdraw()` only takes the owner's 70%.
- After a race the player posts it from Results: `submitRace(round, points, recordHash)`. Points are F1 points (max 25);
  rounds only go up within a season; each wallet posts at most 6 races a season (`RACES_PER_SEASON`, a voided race
  still uses its slot); the wallet must hold a driver NFT.
- `buyDriver` / `buyPart` need the exact price (`priceOf(key)`) as value; more or less is refused, so nobody overpays.
- The deployer is the race steward. With the player's record (Results → Verify race re-runs it from the seed),
  it can `voidRace(player, round)` if the record doesn't match, then `endSeason()` when the season is over.
- `endSeason()` makes 50/30/20% of the pool claimable by the top 3 (`topThree(season)`); unawarded shares roll over.
  Players press "Claim … ETH" on Results (`claim()`).

Trust note: races are computed in the player's browser, so posted points are trusted until the steward
checks them (optimistic). A real deployment would need records published where anyone can challenge them.

## Test

```
npm install
npm test
```

## Deploy to Sepolia (Remix)

1. Open `contracts/PitWallNFT.sol` in Remix, compile with 0.8.24 (Remix resolves the `@openzeppelin/contracts` import itself).
2. Deploy & Run → Environment "Injected Provider - MetaMask" on Sepolia → Deploy `PitWallNFT`.
3. Copy the contract address into `webapp/src/chain/config.ts` (`CONTRACT_ADDRESS`).
   There is no `mintAll` any more: each wallet claims its starter pack from the game.

(Or from here: `export SEPOLIA_RPC_URL=… PRIVATE_KEY=…` then `npm run deploy:sepolia`. Keep the key out of files.)

## Metadata and images

1. Upload `nft-metadata/images/` as a folder to IPFS (for example Pinata) and copy its CID.
2. `IMAGE_CID=<that CID> node scripts/build-metadata.js` writes `nft-metadata/json/`.
3. Upload `nft-metadata/json/`, copy its CID, then call `setBaseURI("ipfs://<json CID>/")` from the deployer wallet.
