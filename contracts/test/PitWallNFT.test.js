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

  it("the catalog matches the game's drivers.json and parts.json (keys, stats, prices)", async () => {
    for (let i = 0; i < drivers.length; i++) {
      const d = drivers[i];
      const t = await nft.driverType(i);
      expect([t.key, Number(t.pace), Number(t.consistency), Number(t.wetSkill)]).to.deep.equal([d.id, d.pace, d.consistency, d.wet]);
      expect(t.price).to.equal(BigInt(d.price) * COIN);
    }
    for (let i = 0; i < 12; i++) {
      const t = await nft.partType(i);
      const p = parts.find((x) => x.id === t.key);
      expect(p, `part ${t.key} in parts.json`).to.exist;
      expect([SLOTS[Number(t.slot)], Number(t.speed), Number(t.corner), Number(t.brake)]).to.deep.equal([p.slot, p.speed, p.corner, p.brake]);
      expect(t.price).to.equal(BigInt(p.price) * COIN);
    }
  });

  it('a new wallet claims one starter pack: the driver and four parts of the kind it picked', async () => {
    await nft.connect(alice).claimStarter('max', 1);
    const [ids, infos] = await nft.inventoryOf(alice.address);
    expect(ids.length).to.equal(5);
    expect(infos.map((t) => t.key)).to.deep.equal(['max', 'engine_corner', 'aero_corner', 'gearbox_corner', 'suspension_corner']);
    expect(infos[0].isDriver).to.equal(true);
    await expect(nft.connect(alice).claimStarter('kimi', 0)).to.be.revertedWith('starter already claimed');
  });

  it('buying needs the exact price and refuses a duplicate', async () => {
    const price = await nft.priceOf('charles');
    await expect(nft.connect(bob).buyDriver('charles', { value: price - 1n })).to.be.revertedWith('send the exact price');
    await expect(nft.connect(bob).buyDriver('charles', { value: price + 1n })).to.be.revertedWith('send the exact price');
    await expect(nft.connect(bob).buyPart('aero_brake', { value: 1n })).to.be.revertedWith('send the exact price');
    await nft.connect(bob).buyDriver('charles', { value: price });
    await expect(nft.connect(bob).buyDriver('charles', { value: price })).to.be.revertedWith('already own this driver');
    await nft.connect(bob).buyPart('aero_brake', { value: await nft.priceOf('aero_brake') });
    const [, infos] = await nft.inventoryOf(bob.address);
    expect(infos.map((t) => t.key)).to.deep.equal(['charles', 'aero_brake']);
  });

  it('a transfer moves the NFT out of one garage and into another', async () => {
    await nft.connect(alice).claimStarter('oscar', 0);
    const [ids] = await nft.inventoryOf(alice.address);
    await nft.connect(alice).transferFrom(alice.address, bob.address, ids[0]);
    expect((await nft.inventoryOf(alice.address))[1].map((t) => t.key)).to.not.include('oscar');
    expect((await nft.inventoryOf(bob.address))[1].map((t) => t.key)).to.deep.equal(['oscar']);
    // alice can buy oscar again now; bob already holds one
    await nft.connect(alice).buyDriver('oscar', { value: await nft.priceOf('oscar') });
    await expect(nft.connect(bob).buyDriver('oscar', { value: await nft.priceOf('oscar') })).to.be.revertedWith('already own this driver');
  });

  it('tokenURI is baseURI + key, and only the owner sets it or withdraws', async () => {
    await nft.connect(alice).claimStarter('fernando', 2);
    expect(await nft.tokenURI(0)).to.equal('');
    await expect(nft.connect(alice).setBaseURI('ipfs://x/')).to.be.revertedWith('not owner');
    await nft.setBaseURI('ipfs://CID/');
    expect(await nft.tokenURI(0)).to.equal('ipfs://CID/fernando.json');
    expect(await nft.tokenURI(1)).to.equal('ipfs://CID/engine_brake.json');

    const price = await nft.priceOf('kimi');
    await nft.connect(bob).buyDriver('kimi', { value: price });
    await expect(nft.connect(bob).withdraw()).to.be.revertedWith('not owner');
    // the owner takes only 70%: the other 30% went to the season pool
    await expect(nft.withdraw()).to.changeEtherBalance(owner, price - (price * 3000n) / 10000n);
    expect(await nft.seasonPool()).to.equal((price * 3000n) / 10000n);
  });

  describe('season: play to earn', () => {
    const REC = ethers.id('race record');

    async function race(signer, round, points) {
      return nft.connect(signer).submitRace(round, points, REC);
    }

    it('only a driver holder can post, with sane points and rounds that only go up', async () => {
      await expect(race(alice, 1, 25)).to.be.revertedWith('hold a driver NFT to race');
      await nft.connect(alice).claimStarter('max', 0);
      await expect(race(alice, 1, 26)).to.be.revertedWith('too many points');
      await race(alice, 1, 25);
      await expect(race(alice, 1, 18)).to.be.revertedWith('round already posted');
      await race(alice, 3, 18);
      expect(await nft.seasonPoints(1, alice.address)).to.equal(43n);
    });

    it('caps each player at 6 races a season, so points cannot be farmed', async () => {
      await nft.connect(alice).claimStarter('max', 0);
      for (let r = 1; r <= 6; r++) await race(alice, r, 25);
      await expect(race(alice, 7, 25)).to.be.revertedWith('season race limit reached');
      expect(await nft.seasonPoints(1, alice.address)).to.equal(150n);
      await nft.voidRace(alice.address, 6); // a voided race still used its slot: no retry
      await expect(race(alice, 8, 25)).to.be.revertedWith('season race limit reached');
      await nft.endSeason();
      await race(alice, 1, 25); // a new season starts the count again
      expect(await nft.racesPosted(2, alice.address)).to.equal(1n);
    });

    it('ends with the top 3 claiming 50/30/20% of the pool, and the rest rolling over', async () => {
      const carol = (await ethers.getSigners())[3];
      for (const [p, d] of [[alice, 'max'], [bob, 'kimi'], [carol, 'oscar']]) await nft.connect(p).claimStarter(d, 0);
      await nft.connect(owner).sponsor({ value: ethers.parseEther('1') });
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
      expect(await nft.claimable(alice.address)).to.equal(ethers.parseEther('0.5'));
      await expect(nft.connect(bob).claim()).to.changeEtherBalance(bob, ethers.parseEther('0.3'));
      await expect(nft.connect(bob).claim()).to.be.revertedWith('nothing to claim');
      expect(await nft.seasonPool()).to.equal(0n);
    });

    it('with fewer than 3 players the unawarded shares stay in the pool', async () => {
      await nft.connect(alice).claimStarter('max', 0);
      await nft.sponsor({ value: ethers.parseEther('1') });
      await race(alice, 1, 10);
      await nft.endSeason();
      expect(await nft.claimable(alice.address)).to.equal(ethers.parseEther('0.5'));
      expect(await nft.seasonPool()).to.equal(ethers.parseEther('0.5'));
    });

    it('the steward can void a race whose record does not check out', async () => {
      await nft.connect(alice).claimStarter('max', 0);
      await nft.connect(bob).claimStarter('kimi', 0);
      await race(alice, 1, 25);
      await race(bob, 1, 18);
      await expect(nft.connect(bob).voidRace(alice.address, 1)).to.be.revertedWith('not owner');
      await nft.voidRace(alice.address, 1);
      expect(await nft.seasonPoints(1, alice.address)).to.equal(0n);
      expect((await nft.topThree(1))[0][0]).to.equal(bob.address);
      await expect(nft.voidRace(alice.address, 1)).to.be.revertedWith('no such race');
    });

    it('seasonInfo gives the game everything for its panel', async () => {
      await nft.connect(alice).claimStarter('max', 0);
      await nft.sponsor({ value: 1000n });
      await race(alice, 4, 12);
      const info = await nft.seasonInfo(alice.address);
      expect([info.currentSeason, info.pool, info.myPoints, info.myLastRound, info.myClaimable]).to.deep.equal([1n, 1000n, 12n, 4n, 0n]);
      expect(info.top[0]).to.equal(alice.address);
    });
  });
});
