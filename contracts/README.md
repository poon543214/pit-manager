# PitWallNFT

ERC-721 for Pit Manager's drivers and parts, plus the game's coin balance and on-chain seasons.
Catalog keys, stats and prices (in coins) match `webapp/src/data/*.json` (checked by `npm test`).

## Run it on a local chain (default, no testnet ETH needed)

Three terminals:

```bash
cd contracts && npm install && npm run chain        # 1. Hardhat node on http://127.0.0.1:8545 (chain id 31337)
```

```bash
cd contracts && npm run deploy:local                 # 2. deploy, sponsor the pool with 1 ETH, write the address for the game
```

```bash
cd webapp && npm install && npm run dev              # 3. the game
```

Then in the game press **Connect wallet**. MetaMask is asked to add and switch to **Hardhat Local** by itself.
Your own MetaMask account works: in the coin popup (**+** next to your coins) press **+10 test ETH** to fund it
straight from the node. No private key is imported anywhere.

- Restarting the node wipes the chain. Run `npm run deploy:local` again, and in MetaMask use
  Settings → Advanced → **Clear activity tab data** so it forgets the old nonces.
- Steward actions on the local chain (signed by Hardhat account #0, the deployer):
  - `npm run steward`: season status
  - `STEWARD=end npm run steward`: end the season, the top 3 can claim
  - `STEWARD=void PLAYER=0x… ROUND=3 npm run steward`: void one posted race
  - `STEWARD=sponsor ETH=0.5 npm run steward`: add to the prize pool

## Coins

- `buyCoins()` (payable): ETH → coins at `COIN` = 0.00001 ETH per coin (send a whole number of coins).
  30% of the ETH goes into `seasonPool`, 70% to `ownerFunds`.
- `coins(address)`: a wallet's balance. There is no free starter pack: a new wallet starts with nothing.
- `buyDriver(key)` / `buyPart(key)`: pay `priceOf(key)` coins; one of each type per wallet.
- `spendCoins(amount, item)`: tire sets, repairs and practice. Spent coins are burned. Coins never turn back into ETH.

## NFTs

- Catalog: 8 drivers and 18 parts (4 slots × speed, corner, brake, plus endurance and rain versions of some). Tire care, wet grip, reliability and perks live in the game's JSON, linked by key.
- `inventoryOf(address)`: every token a wallet holds with its stats (what the game reads)
- `setBaseURI` / `withdraw` / `voidRace` / `endSeason`: owner only. `tokenURI(id)` = baseURI + key + `.json`

## Play to earn (seasons)

- `seasonPool` is filled by 30% of every coin purchase and by `sponsor()`. `withdraw()` only takes `ownerFunds`.
- After a race the player posts it from Results: `submitRace(round, points, recordHash)`. Points are F1 points (max 25);
  rounds only go up within a season; each wallet posts at most 6 races a season (`RACES_PER_SEASON`, a voided race
  still uses its slot); the wallet must hold a driver NFT.
- The deployer is the race steward. With the player's record (Results → Verify race re-runs it from the seed),
  it can `voidRace(player, round)` if the record doesn't match, then `endSeason()` when the season is over.
- `endSeason()` makes 50/30/20% of the pool claimable by the top 3 (`topThree(season)`); unawarded shares roll over.
  Players press "Claim … ETH" on Results (`claim()`).

Trust note: races are computed in the player's browser, so posted points are trusted until the steward
checks them (optimistic). A real deployment would need records published where anyone can challenge them.

## Test

```bash
npm test
```

## Sepolia (Remix)

1. Use **`remix/PitWallNFT.sol`**: one file with OpenZeppelin 5.0.2 inlined (`npx hardhat flatten` of `contracts/PitWallNFT.sol`).
   Regenerate it after any contract change.
2. Remix: compiler **0.8.24**, **optimization on, 200 runs** (without it the bytecode is 26.9 KB, over the 24 KB limit;
   with it, 14.7 KB). Deploy `PitWallNFT` with "Injected Provider - MetaMask" on Sepolia.
3. Put the address in `../webapp/src/chain/sepolia-deployment.json` (the game uses Sepolia by default).
4. Verify on Etherscan as a single file: v0.8.24, MIT, optimization yes / 200 runs.
5. `npx hardhat run scripts/gas-report.js` prints the gas each action uses (used in `../SECURITY.md`).

## Metadata and images

1. Upload `nft-metadata/images/` as a folder to IPFS (for example Pinata) and copy its CID.
2. `IMAGE_CID=<that CID> node scripts/build-metadata.js` writes `nft-metadata/json/`.
3. Upload `nft-metadata/json/`, copy its CID, then call `setBaseURI("ipfs://<json CID>/")` from the deployer wallet.
