# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pit Manager is a course project. Right now the main audience is the instructor or grader, plus classmates watching a live demo or screen-share. They judge three things: whether the game plays as a real management game, whether it looks finished, and whether the architecture is ready for the NFT phase the course covers (React + Ethers.js, Week 10). Real players are not the target yet. Still, the game should be fun enough that playing several races in a row feels worthwhile.

## Product Purpose

Pit Manager is a pixel-art F1 team-management game. The loop:

1. **Market**: buy one driver and parts. You start with 1,000 coins.
2. **Garage**: fill the four part slots to suit the track's demand (Speed, Corner or Brake), check the FIT score, and choose tires and a pit lap.
3. **Practice**: run 3 laps to compare setups. Costs 20 coins per run, with 3 runs per driver per track.
4. **Race**: 20 laps, 10 cars (your driver plus 9 AI rivals with their own strategy styles). Entry is free. Each race scores F1 points (25-18-15-12-10-8-6-4-2-1); a season is 6 races, and its pool (a 1,000 sponsor stake plus 30% of every coin spent in the game, the rest burned) goes to the top 3 at 50/30/20%, with a trophy for each top-3 season. Up to 2 pit stops, each fitting the compound you choose (about 18s in the pit lane). During the race the pit wall can call the car in at the end of the current lap with a chosen compound; that call replaces the next planned stop. The seed is drawn once at the reveal and calls are recorded, so a reload replays the same race. Skip to finish exists only in demo mode. In the morning you seal your setup as a hash, in the afternoon it is revealed and raced, and in the evening you claim the prize. Watch the race top-down, with the camera following your car, radio calls for pit stops, worn tires, mistakes and overtakes, and a chequered-flag finish.
5. **Results**: lap times, a "Why you finished P_" breakdown of the gap to the winner (car setup, driver, tires, pit stops, mistakes, skills, lap-to-lap luck), and race history.

Success for this version means all four of these hold:
- **Strategy feels real**: part fit, tire choice and pit lap visibly and believably change the result.
- **Demo is polished**: it looks finished and charming when presented.
- **Ready for NFTs**: owning drivers and parts maps cleanly onto ERC721 later, with no page or simulator rewrites.
- **Fun to replay**: the track rotation and weather make you want to play the next race.

## Positioning

The core idea is matching a car to a track. Three track types (Speed, Corner, Brake) reward different part builds. Weather comes from each round's seed, and rain makes a driver's wet skill matter more. Races are deterministic from their seed, so a choice can be traced to its result. Drivers are balanced so that none wins on every track: each has 20 total points across pace, consistency and wet skill. Drivers tire over a race (less if consistent), and each race costs them condition (0–100) that only sitting a race out restores, so a deeper roster of drivers matters. Every driver and part also carries one perk (skill) that fires only in a certain situation (start, finish, rain, tires, pit, steady, dry), so builds have themes beyond raw stats.

## Operating Context

- It is mostly shown in a live demo or screen-share for grading, so it has to read clearly on a projected or shared desktop screen.
- Tracks rotate one round at a time: Straight GP → Twisty GP → Stop-and-Go GP, 20 laps each. Each round publishes a rain forecast; the actual weather is drawn with the race seed after every setup is sealed.
- A weekly calendar runs two rounds a week: Market Sun/Thu, Practice Mon/Fri, Race Tue/Sat, rest on Wednesday. Demo mode (on by default, for presenting) opens every page on any day and charges nothing.
- Player state is stored in `localStorage` through `mockStore`. There is no backend.

## Capabilities and Constraints

- Stack (already in place): Vite + React + TypeScript, plain CSS with no UI library, and the race scene drawn on HTML Canvas 2D with `imageSmoothingEnabled` off. Vitest is planned for checking that the simulator is deterministic.
- Wallet: `PitWallNFT` (ERC-721 Enumerable, source and Hardhat tests in `../contracts/`) holds a catalog of 5 driver and 12 part types whose keys, stats and prices match the game's JSON (a test enforces it). It runs on a local Hardhat chain by default (MetaMask adds the network itself, and a +10 test ETH button funds the wallet); Sepolia is optional. Coins are the only currency and live on chain: the + next to the balance exchanges ETH for coins (1 coin = 0.00001 ETH), and coins buy NFTs, tire sets, repairs and practice. Each wallet claims one free starter pack (a driver plus four parts of one kind, and 200 coins). While connected, ownership, stats and coins come from the chain; condition, wear, tire stock and the race itself stay in the browser. Play to earn: 30% of every ETH exchanged for coins funds an on-chain season pool; players post each race (points plus a hash of its record, at most 6 races a season) from Results, the deployer acts as race steward (can void a result, ends the season), and the top 3 claim 50/30/20% of the pool in ETH. Token metadata and images are built for IPFS by `contracts/scripts/build-metadata.js`.
- Pages call `services/gameService.ts` and nothing else. A future `chainGameService.ts` (Solidity + OpenZeppelin ERC721, Hardhat, Ethers.js, MetaMask) replaces `mock/` without touching pages or `sim/`. UI work must keep that boundary.
- Domain terms: the part slots are engine, aero, gearbox and suspension, each with a Speed, Corner and Brake variant. Tires are Soft, Medium and Hard. Driver stats are pace, consistency and wet skill (1–10). Every part and driver also has a FIT score.
- **Language: English only.** The UI copy and `lang="en"` are English. `README.md` is still in Thai.
- Undecided: device support beyond desktop. Mobile was not confirmed either way.
- Mock data: 5 drivers for sale, 6 AI-only rivals (`rivals.json`), 12 parts and 3 tracks in `src/data/`.
- Consumables and wear: tire sets are bought in the Market and used up by racing (one to start, one per stop); fitted parts lose durability each race and give less until repaired. These are the game's coin sinks.
- Verifiable races: the setup is sealed with keccak256(abi.encode(...)) (the same hash a contract recomputes), and Results can re-check any race from its record: hash, plan plus pit calls, weather from the seed, and a full replay. `npm test` (Vitest) checks determinism, per-car random streams, that the breakdown adds up, balance (no tire plan near-best everywhere) and verification.
- Competitive design: before the race the UI only explains what each choice does (? help, tire life, Car fit). No warnings, best-plan hints or plan scores. Advice and verdicts live only on Results, after the race.

## Brand Commitments

The art brief (`../.claude/Pit Manager — Art & Mock Data Brief.md`) sets these binding constraints:
- Pixel art in a limited palette: red `#E10600`, white `#FFFFFF`, near-black `#111111`, with small amounts of grey `#8A8A8A` and skin tone `#F2C6A0`. Exception: driver race suits use colours inspired by real F1 team liveries (set in `src/data/drivers.json`).
- A 1px black outline on every shape, flat shading, no gradients, no anti-aliasing. This applies to the art. The UI panels deliberately use translucent glass over the live track scene, and that is a confirmed choice, not drift.
- Drivers are chibi human racers (big head, simple dot-eye face, short body) in team-livery race suits, after `../.claude/character.png`.
- Sprite sizes: drivers 64×64, icons 32×32, top-down car 32×64, track tiles 32×32.
- Never: real team or brand logos or names, text inside art, or existing cartoon characters. Liveries borrow colours only.

## Evidence on Hand

- Art: every image is currently a code-drawn placeholder (`src/game/pixelArt.ts`). Real PNGs go in `public/assets/<group>/<id>.png` and replace the placeholders automatically. Asset names are listed in the art brief.
- Data: the mock drivers, parts and tracks in `src/data/*.json` are the only content.
- There are no real players, testimonials or metrics yet. None should be invented.

## Product Principles

1. **Choices must show up in the race.** Every setup decision should affect the result in a way the player can read and explain.
2. **The demo is the deliverable.** Clarity and finish on a shared screen come before depth nobody will see.
3. **Respect the service boundary.** UI and simulator never reach into the mock layer, so the NFT phase is a swap and not a rewrite.
4. **No dominant build.** Balance between drivers, parts and tracks is part of the design and should be protected.
