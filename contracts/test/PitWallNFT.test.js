const { expect } = require('chai');
const { ethers } = require('hardhat');
const drivers = require('../../webapp/src/data/drivers.json');
const parts = require('../../webapp/src/data/parts.json');

const COIN = ethers.parseEther('0.00001');
const SLOTS = ['engine', 'aero', 'gearbox', 'suspension'];

describe('PitWallNFT', () => {
  let nft, owner, alice, bob;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    nft = await ethers.deployContract('PitWallNFT');
  });

  /** buy enough coins for one driver and buy it */
  const hire = async (who, key) => {
    await nft.connect(who).buyCoins({ value: COIN * (await nft.priceOf(key)) });
    await nft.connect(who).buyDriver(key);
  };

  it("the catalog matches the game's drivers.json and parts.json (keys, stats, prices)", async () => {
    for (let i = 0; i < drivers.length; i++) {
      const d = drivers[i];
      const t = await nft.driverType(i);
      expect([t.key, Number(t.pace), Number(t.consistency), Number(t.wetSkill)]).to.deep.equal([d.id, d.pace, d.consistency, d.wet]);
      expect(t.price).to.equal(BigInt(d.price));
    }
    expect(await nft.DRIVER_TYPES()).to.equal(BigInt(drivers.length));
    expect(await nft.PART_TYPES()).to.equal(BigInt(parts.length));
    for (let i = 0; i < parts.length; i++) {
      const t = await nft.partType(i);
      const p = parts.find((x) => x.id === t.key);
      expect(p, `part ${t.key} in parts.json`).to.exist;
      expect([SLOTS[Number(t.slot)], Number(t.speed), Number(t.corner), Number(t.brake)]).to.deep.equal([p.slot, p.speed, p.corner, p.brake]);
      expect(t.price).to.equal(BigInt(p.price));
    }
  });

  it('there is no free starter pack: everything is bought with coins', async () => {
    expect(nft.claimStarter).to.equal(undefined);
    expect(await nft.coins(alice.address)).to.equal(0n);
    expect(await nft.balanceOf(alice.address)).to.equal(0n);
  });

  it('ETH buys coins at the fixed rate, 30% of it into the season pool', async () => {
    await expect(nft.connect(bob).buyCoins({ value: 0n })).to.be.revertedWith('send a whole number of coins');
    await expect(nft.connect(bob).buyCoins({ value: COIN + 1n })).to.be.revertedWith('send a whole number of coins');
    await expect(nft.connect(bob).buyCoins({ value: COIN * 1000n }))
      .to.emit(nft, 'CoinsBought')
      .withArgs(bob.address, 1000n, COIN * 1000n);
    expect(await nft.coins(bob.address)).to.equal(1000n);
    expect(await nft.seasonPool()).to.equal((COIN * 1000n * 3000n) / 10000n);
    expect(await nft.ownerFunds()).to.equal((COIN * 1000n * 7000n) / 10000n);
  });

  it('coins buy NFTs and in-game items; a duplicate or a short balance is refused', async () => {
    await expect(nft.connect(bob).buyDriver('charles')).to.be.revertedWith('not enough coins');
    await nft.connect(bob).buyCoins({ value: COIN * 500n });
    await nft.connect(bob).buyDriver('charles'); // 300
    await expect(nft.connect(bob).buyDriver('charles')).to.be.revertedWith('already own this driver');
    await nft.connect(bob).buyPart('aero_brake'); // 120
    expect(await nft.coins(bob.address)).to.equal(80n);
    await expect(nft.connect(bob).buyPart('engine_speed')).to.be.revertedWith('not enough coins');
    await expect(nft.connect(bob).spendCoins(30, 'tires:soft')).to.emit(nft, 'CoinsSpent').withArgs(bob.address, 30n, 'tires:soft');
    await expect(nft.connect(bob).spendCoins(51, 'repair')).to.be.revertedWith('not enough coins');
    await expect(nft.connect(bob).spendCoins(0, 'x')).to.be.revertedWith('nothing to spend');
    expect(await nft.coins(bob.address)).to.equal(50n);
    const [, infos] = await nft.inventoryOf(bob.address);
    expect(infos.map((t) => t.key)).to.deep.equal(['charles', 'aero_brake']);
  });

  it('a transfer moves the NFT out of one garage and into another', async () => {
    await hire(alice, 'oscar');
    const [ids] = await nft.inventoryOf(alice.address);
    await nft.connect(alice).transferFrom(alice.address, bob.address, ids[0]);
    expect((await nft.inventoryOf(alice.address))[1].map((t) => t.key)).to.not.include('oscar');
    expect((await nft.inventoryOf(bob.address))[1].map((t) => t.key)).to.deep.equal(['oscar']);
    // alice can buy oscar again now; bob already holds one
    await nft.connect(alice).buyCoins({ value: COIN * 300n });
    await nft.connect(alice).buyDriver('oscar');
    await nft.connect(bob).buyCoins({ value: COIN * 300n });
    await expect(nft.connect(bob).buyDriver('oscar')).to.be.revertedWith('already own this driver');
  });

  it('tokenURI is baseURI + key, and only the owner sets it or withdraws', async () => {
    await hire(alice, 'fernando');
    await nft.connect(alice).buyCoins({ value: COIN * 120n });
    await nft.connect(alice).buyPart('engine_brake');
    expect(await nft.tokenURI(0)).to.equal('');
    await expect(nft.connect(alice).setBaseURI('ipfs://x/')).to.be.revertedWith('not owner');
    await nft.setBaseURI('ipfs://CID/');
    expect(await nft.tokenURI(0)).to.equal('ipfs://CID/fernando.json');
    expect(await nft.tokenURI(1)).to.equal('ipfs://CID/engine_brake.json');

    const price = COIN * 280n;
    await nft.connect(bob).buyCoins({ value: price });
    await expect(nft.connect(bob).withdraw()).to.be.revertedWith('not owner');
    // the owner takes only its 70% of all coin purchases: the other 30% stays in the season pool
    const paid = COIN * (220n + 120n) + price; // fernando, engine_brake, then 280 coins
    await expect(nft.withdraw()).to.changeEtherBalance(owner, paid - (paid * 3000n) / 10000n);
    expect(await nft.seasonPool()).to.equal((paid * 3000n) / 10000n);
  });

  describe('season: play to earn', () => {
    const REC = ethers.id('race record');

    async function race(signer, round, points) {
      return nft.connect(signer).submitRace(round, points, REC);
    }

    it('only a driver holder can post, with sane points and rounds that only go up', async () => {
      await expect(race(alice, 1, 25)).to.be.revertedWith('hold a driver NFT to race');
      await hire(alice, 'max');
      await expect(race(alice, 1, 26)).to.be.revertedWith('too many points');
      await race(alice, 1, 25);
      await expect(race(alice, 1, 18)).to.be.revertedWith('round already posted');
      await race(alice, 3, 18);
      expect(await nft.seasonPoints(1, alice.address)).to.equal(43n);
    });

    it('caps each player at 6 races a season, so points cannot be farmed', async () => {
      await hire(alice, 'max');
      for (let r = 1; r <= 6; r++) await race(alice, r, 25);
      await expect(race(alice, 7, 25)).to.be.revertedWith('season race limit reached');
      expect(await nft.seasonPoints(1, alice.address)).to.equal(150n);
      await nft.voidRace(alice.address, 6); // a voided race still used its slot: no retry
      await expect(race(alice, 8, 25)).to.be.revertedWith('season race limit reached');
      await nft.endSeason();
      await race(alice, 9, 25); // a new season starts the count again (rounds keep counting up)
      expect(await nft.racesPosted(2, alice.address)).to.equal(1n);
    });

    it('a race posted in one season cannot be posted again after endSeason; points start from zero', async () => {
      await hire(alice, 'max');
      await race(alice, 5, 25);
      await nft.endSeason();
      expect(await nft.seasonPoints(2, alice.address)).to.equal(0n);
      await expect(race(alice, 5, 25)).to.be.revertedWith('round already posted');
      await expect(race(alice, 3, 25)).to.be.revertedWith('round already posted');
      await race(alice, 6, 18);
      expect(await nft.seasonPoints(2, alice.address)).to.equal(18n);
      expect((await nft.seasonInfo(alice.address)).myLastRound).to.equal(6n);
    });

    it('ends with the top 3 claiming 50/30/20% of the pool, and the rest rolling over', async () => {
      const carol = (await ethers.getSigners())[3];
      for (const [p, d] of [[alice, 'max'], [bob, 'kimi'], [carol, 'oscar']]) await hire(p, d);
      await nft.connect(owner).sponsor({ value: ethers.parseEther('1') });
      const pool = await nft.seasonPool(); // 1 ETH plus 30% of what the three paid for coins
      await race(alice, 1, 18);
      await race(bob, 1, 25);
      await race(carol, 1, 15);
      await race(alice, 2, 25); // alice 43, bob 25, carol 15

      const [top, pts] = await nft.topThree(1);
      expect(top).to.deep.equal([alice.address, bob.address, carol.address]);
      expect(pts).to.deep.equal([43n, 25n, 15n]);

      await expect(nft.connect(alice).endSeason()).to.be.revertedWith('not owner');
      await nft.endSeason();
      expect(await nft.season()).to.equal(2n);
      expect(await nft.claimable(alice.address)).to.equal(pool / 2n);
      await expect(nft.connect(bob).claim()).to.changeEtherBalance(bob, (pool * 3000n) / 10000n);
      await expect(nft.connect(bob).claim()).to.be.revertedWith('nothing to claim');
      expect(await nft.seasonPool()).to.equal(pool - pool / 2n - (pool * 3000n) / 10000n - (pool * 2000n) / 10000n);
    });

    it('with fewer than 3 players the unawarded shares stay in the pool', async () => {
      await hire(alice, 'max');
      await nft.sponsor({ value: ethers.parseEther('1') });
      const pool = await nft.seasonPool();
      await race(alice, 1, 10);
      await nft.endSeason();
      expect(await nft.claimable(alice.address)).to.equal(pool / 2n);
      expect(await nft.seasonPool()).to.equal(pool - pool / 2n);
    });

    it('the steward can void a race whose record does not check out', async () => {
      await hire(alice, 'max');
      await hire(bob, 'kimi');
      await race(alice, 1, 25);
      await race(bob, 1, 18);
      await expect(nft.connect(bob).voidRace(alice.address, 1)).to.be.revertedWith('not owner');
      await nft.voidRace(alice.address, 1);
      expect(await nft.seasonPoints(1, alice.address)).to.equal(0n);
      expect((await nft.topThree(1))[0][0]).to.equal(bob.address);
      await expect(nft.voidRace(alice.address, 1)).to.be.revertedWith('no such race');
    });

    it('seasonInfo gives the game everything for its panel', async () => {
      await hire(alice, 'max');
      await nft.sponsor({ value: 1000n });
      await race(alice, 4, 12);
      const info = await nft.seasonInfo(alice.address);
      expect([info.currentSeason, info.pool, info.myPoints, info.myLastRound, info.myClaimable]).to.deep.equal([1n, await nft.seasonPool(), 12n, 4n, 0n]);
      expect(info.top[0]).to.equal(alice.address);
    });
  });
});
