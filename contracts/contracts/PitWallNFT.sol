// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// Pit Wall Manager: drivers and car parts as NFTs (one ERC-721 contract).
///
/// The catalog holds 5 driver types and 12 part types, each with a `key` that matches the
/// "id" in the game's drivers.json / parts.json. Any number of tokens can be minted per type:
/// every driver and part is bought with game coins.
/// Stats live on-chain; look, name and perk stay in the game's JSON, linked by `key`.
///
/// Coins: the game's one currency, kept as a balance here. ETH buys coins (buyCoins); coins buy NFTs
/// and are spent on in-game items (tires, repairs, practice). Coins never turn back into ETH.
///
/// Play to earn: 30% of every ETH exchanged for coins goes into the season prize pool (anyone can also sponsor it).
/// Players post each race result (points plus a hash of the full race record, which anyone can
/// re-run from its seed). The owner acts as race steward: it can void a result whose record does
/// not check out, and ends the season, which makes the pool claimable by the top 3 (50/30/20%).
contract PitWallNFT is ERC721Enumerable {
    using Strings for uint256;

    // ---------- catalog ----------
    enum Slot { Engine, Aero, Gearbox, Suspension }

    struct DriverType {
        string key; // e.g. "charles"
        uint8 pace;
        uint8 consistency;
        uint8 wetSkill;
        uint256 price; // coins
    }

    struct PartType {
        string key; // e.g. "engine_speed"
        Slot slot;
        uint8 speed;
        uint8 corner;
        uint8 brake;
        uint256 price; // coins
    }

    /// What one token is: a driver or a part, and its stats. Returned by tokenInfo.
    struct TokenInfo {
        bool isDriver;
        string key;
        uint8 slot; // parts only
        uint8 a; // driver: pace       / part: speed
        uint8 b; // driver: consistency / part: corner
        uint8 c; // driver: wetSkill   / part: brake
    }

    /// Exchange rate: 1 game coin = 0.00001 ETH (1,000 coins = 0.01 ETH).
    uint256 public constant COIN = 0.00001 ether;
    uint8 public constant DRIVER_TYPES = 8;
    uint8 public constant PART_TYPES = 18;

    DriverType[] private _driverTypes;
    PartType[] private _partTypes;
    mapping(bytes32 => uint256) private _driverIndex; // keccak(key) => index + 1
    mapping(bytes32 => uint256) private _partIndex;

    // ---------- tokens ----------
    uint256 public nextId;
    mapping(uint256 => bool) private _isDriver;
    mapping(uint256 => uint256) private _typeOf; // token id => catalog index
    /// how many tokens of a type (keccak(key)) an address holds, so nobody buys a duplicate
    mapping(address => mapping(bytes32 => uint256)) public held;
    /// game coins per wallet
    mapping(address => uint256) public coins;

    address public owner;
    string private _base;

    // ---------- seasons ----------
    uint256 public constant POOL_BPS = 3000; // share of each coin purchase (ETH) that goes to the prize pool
    uint256 public constant MAX_POINTS = 25; // a race win
    uint256 public constant RACES_PER_SEASON = 6; // matches the game's season length
    uint256[3] public SHARES = [5000, 3000, 2000]; // top 3, in basis points of the pool

    uint256 public season = 1;
    uint256 public seasonPool; // wei, paid out when the season ends
    uint256 public ownerFunds; // wei, the rest of coin purchases: what withdraw() may take
    mapping(address => uint256) public claimable; // won prizes waiting for claim()
    mapping(address => uint256) public driversHeld;

    mapping(uint256 => address[]) private _players; // season => everyone who posted a race
    mapping(uint256 => mapping(address => uint256)) public seasonPoints;
    mapping(uint256 => mapping(address => uint256)) public lastRound;
    /// Highest game round a player has ever posted, across all seasons. Game rounds keep counting up between
    /// seasons, so a race posted once can never be posted again (not even after endSeason starts a new season).
    mapping(address => uint256) public lastPostedRound;
    mapping(uint256 => mapping(address => uint256)) public racesPosted; // season => player => races posted
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public pointsAt; // season => player => round => points
    mapping(uint256 => mapping(address => mapping(uint256 => bytes32))) public recordAt;

    event CoinsBought(address indexed player, uint256 coins, uint256 paid);
    event CoinsSpent(address indexed player, uint256 coins, string item);
    event RaceSubmitted(uint256 indexed season, address indexed player, uint256 round, uint256 points, bytes32 record);
    event RaceVoided(uint256 indexed season, address indexed player, uint256 round, uint256 points);
    event SeasonEnded(uint256 indexed season, address[3] top, uint256[3] prizes);
    event Claimed(address indexed player, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() ERC721("Pit Wall NFT", "PIT") {
        owner = msg.sender;

        // prices in coins; keys, stats and prices mirror webapp/src/data/*.json (a test checks it)
        _addDriver("charles", 9, 5, 6, 300);
        _addDriver("kimi", 8, 5, 7, 280);
        _addDriver("max", 7, 8, 5, 260);
        _addDriver("oscar", 6, 9, 5, 240);
        _addDriver("fernando", 5, 6, 9, 220);
        _addDriver("lewis", 7, 6, 7, 270);
        _addDriver("george", 7, 7, 6, 250);
        _addDriver("lando", 8, 6, 6, 260);

        // per slot: a speed, a corner and a brake part; some types also come in an endurance or rain version.
        // Tire care, reliability and wet grip live in the game's JSON with the perk, linked by key.
        _addPart("engine_speed", Slot.Engine, 3, 1, 1, 120);
        _addPart("engine_endurance", Slot.Engine, 2, 1, 1, 130);
        _addPart("engine_corner", Slot.Engine, 1, 3, 1, 120);
        _addPart("engine_rain", Slot.Engine, 1, 2, 1, 130);
        _addPart("engine_brake", Slot.Engine, 1, 1, 3, 120);
        _addPart("aero_speed", Slot.Aero, 3, 1, 1, 120);
        _addPart("aero_corner", Slot.Aero, 1, 3, 1, 120);
        _addPart("aero_endurance", Slot.Aero, 1, 2, 1, 130);
        _addPart("aero_rain", Slot.Aero, 1, 2, 1, 130);
        _addPart("aero_brake", Slot.Aero, 1, 1, 3, 120);
        _addPart("gearbox_speed", Slot.Gearbox, 3, 1, 1, 120);
        _addPart("gearbox_corner", Slot.Gearbox, 1, 3, 1, 120);
        _addPart("gearbox_brake", Slot.Gearbox, 1, 1, 3, 120);
        _addPart("gearbox_rain", Slot.Gearbox, 1, 1, 2, 130);
        _addPart("suspension_speed", Slot.Suspension, 3, 1, 1, 120);
        _addPart("suspension_corner", Slot.Suspension, 1, 3, 1, 120);
        _addPart("suspension_endurance", Slot.Suspension, 1, 2, 1, 130);
        _addPart("suspension_brake", Slot.Suspension, 1, 1, 3, 120);
    }

    function _addPart(string memory key, Slot slot, uint8 speed, uint8 corner, uint8 brake, uint256 price) private {
        _partTypes.push(PartType(key, slot, speed, corner, brake, price));
        _partIndex[keccak256(bytes(key))] = _partTypes.length;
    }

    function _addDriver(string memory key, uint8 pace, uint8 consistency, uint8 wetSkill, uint256 price) private {
        _driverTypes.push(DriverType(key, pace, consistency, wetSkill, price));
        _driverIndex[keccak256(bytes(key))] = _driverTypes.length;
    }

    // ---------- coins ----------
    /// Exchange ETH for coins at COIN wei each. 30% of the ETH funds the season pool, the rest the owner.
    function buyCoins() external payable {
        require(msg.value > 0 && msg.value % COIN == 0, "send a whole number of coins");
        uint256 amount = msg.value / COIN;
        coins[msg.sender] += amount;
        uint256 toPool = (msg.value * POOL_BPS) / 10000;
        seasonPool += toPool;
        ownerFunds += msg.value - toPool;
        emit CoinsBought(msg.sender, amount, msg.value);
    }

    /// Spend coins on an in-game item (tire sets, repairs, practice). The coins are burned.
    function spendCoins(uint256 amount, string calldata item) external {
        require(amount > 0, "nothing to spend");
        _pay(amount);
        emit CoinsSpent(msg.sender, amount, item);
    }

    function _pay(uint256 amount) private {
        require(coins[msg.sender] >= amount, "not enough coins");
        coins[msg.sender] -= amount;
    }

    function buyDriver(string calldata key) external {
        uint256 i = _driverAt(key);
        require(held[msg.sender][keccak256(bytes(key))] == 0, "already own this driver");
        _pay(_driverTypes[i].price);
        _mintDriver(msg.sender, i);
        emit CoinsSpent(msg.sender, _driverTypes[i].price, key);
    }

    function buyPart(string calldata key) external {
        uint256 i = _partIndex[keccak256(bytes(key))];
        require(i != 0, "unknown part");
        i -= 1;
        require(held[msg.sender][keccak256(bytes(key))] == 0, "already own this part");
        _pay(_partTypes[i].price);
        _mintPart(msg.sender, i);
        emit CoinsSpent(msg.sender, _partTypes[i].price, key);
    }

    // ---------- seasons: post, steward, pay out ----------
    /// Anyone can add to the prize pool (a sponsor stake).
    function sponsor() external payable {
        seasonPool += msg.value;
    }

    /// Post one finished race: its round (increasing within a season), the points it scored, and the
    /// keccak256 of its full record (setup hash, seed, pit calls, finish) so the steward can re-run it.
    function submitRace(uint256 round, uint256 points, bytes32 record) external {
        require(driversHeld[msg.sender] > 0, "hold a driver NFT to race");
        require(points <= MAX_POINTS, "too many points");
        require(round > lastPostedRound[msg.sender], "round already posted");
        require(racesPosted[season][msg.sender] < RACES_PER_SEASON, "season race limit reached");
        racesPosted[season][msg.sender] += 1;
        if (lastRound[season][msg.sender] == 0) _players[season].push(msg.sender);
        lastRound[season][msg.sender] = round;
        lastPostedRound[msg.sender] = round;
        pointsAt[season][msg.sender][round] = points;
        recordAt[season][msg.sender][round] = record;
        seasonPoints[season][msg.sender] += points;
        emit RaceSubmitted(season, msg.sender, round, points, record);
    }

    /// Steward: take back the points of a race whose record does not re-run to what was posted.
    function voidRace(address player, uint256 round) external onlyOwner {
        uint256 p = pointsAt[season][player][round];
        require(recordAt[season][player][round] != bytes32(0), "no such race");
        pointsAt[season][player][round] = 0;
        recordAt[season][player][round] = bytes32(0);
        seasonPoints[season][player] -= p;
        emit RaceVoided(season, player, round, p);
    }

    /// The season's top 3 by points (earliest poster wins a tie).
    function topThree(uint256 s) public view returns (address[3] memory top, uint256[3] memory pts) {
        address[] storage ps = _players[s];
        for (uint256 i = 0; i < ps.length; i++) {
            uint256 p = seasonPoints[s][ps[i]];
            if (p == 0) continue;
            for (uint256 k = 0; k < 3; k++) {
                if (p > pts[k]) {
                    for (uint256 m = 2; m > k; m--) {
                        top[m] = top[m - 1];
                        pts[m] = pts[m - 1];
                    }
                    top[k] = ps[i];
                    pts[k] = p;
                    break;
                }
            }
        }
    }

    /// Steward: close the season. The top 3 can claim their share; unawarded shares roll into the next pool.
    function endSeason() external onlyOwner {
        (address[3] memory top, ) = topThree(season);
        uint256[3] memory prizes;
        uint256 paid;
        for (uint256 k = 0; k < 3; k++) {
            if (top[k] == address(0)) continue;
            prizes[k] = (seasonPool * SHARES[k]) / 10000;
            claimable[top[k]] += prizes[k];
            paid += prizes[k];
        }
        seasonPool -= paid;
        emit SeasonEnded(season, top, prizes);
        season += 1;
    }

    /// Collect won prizes in ETH.
    function claim() external {
        uint256 amount = claimable[msg.sender];
        require(amount > 0, "nothing to claim");
        claimable[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "claim failed");
        emit Claimed(msg.sender, amount);
    }

    /// Everything the game's season panel shows, in one call.
    function seasonInfo(address who)
        external
        view
        returns (
            uint256 currentSeason,
            uint256 pool,
            uint256 myPoints,
            uint256 myLastRound,
            uint256 myClaimable,
            address[3] memory top,
            uint256[3] memory topPoints
        )
    {
        (top, topPoints) = topThree(season);
        // myLastRound is the all-time last posted round, so the game hides "Post" for any race already on chain
        return (season, seasonPool, seasonPoints[season][who], lastPostedRound[who], claimable[who], top, topPoints);
    }

    function _driverAt(string calldata key) private view returns (uint256) {
        uint256 i = _driverIndex[keccak256(bytes(key))];
        require(i != 0, "unknown driver");
        return i - 1;
    }

    function _mintDriver(address to, uint256 typeIndex) private {
        uint256 id = nextId++;
        _isDriver[id] = true;
        _typeOf[id] = typeIndex;
        _safeMint(to, id);
    }

    function _mintPart(address to, uint256 typeIndex) private {
        uint256 id = nextId++;
        _typeOf[id] = typeIndex;
        _safeMint(to, id);
    }

    // ---------- reading (used by the game) ----------
    function tokenInfo(uint256 id) public view returns (TokenInfo memory) {
        _requireOwned(id);
        if (_isDriver[id]) {
            DriverType storage d = _driverTypes[_typeOf[id]];
            return TokenInfo(true, d.key, 0, d.pace, d.consistency, d.wetSkill);
        }
        PartType storage p = _partTypes[_typeOf[id]];
        return TokenInfo(false, p.key, uint8(p.slot), p.speed, p.corner, p.brake);
    }

    /// Every token a wallet holds, with what each one is: one call for the whole garage.
    function inventoryOf(address who) external view returns (uint256[] memory ids, TokenInfo[] memory infos) {
        uint256 n = balanceOf(who);
        ids = new uint256[](n);
        infos = new TokenInfo[](n);
        for (uint256 i = 0; i < n; i++) {
            ids[i] = tokenOfOwnerByIndex(who, i);
            infos[i] = tokenInfo(ids[i]);
        }
    }

    function driverType(uint256 i) external view returns (DriverType memory) {
        return _driverTypes[i];
    }

    function partType(uint256 i) external view returns (PartType memory) {
        return _partTypes[i];
    }

    /// Price in coins.
    function priceOf(string calldata key) external view returns (uint256) {
        bytes32 h = keccak256(bytes(key));
        if (_driverIndex[h] != 0) return _driverTypes[_driverIndex[h] - 1].price;
        require(_partIndex[h] != 0, "unknown key");
        return _partTypes[_partIndex[h] - 1].price;
    }

    // ---------- metadata ----------
    /// Tokens of the same type share metadata: tokenURI = baseURI + key + ".json", e.g. ipfs://<CID>/charles.json
    function setBaseURI(string calldata newBase) external onlyOwner {
        _base = newBase;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        TokenInfo memory t = tokenInfo(id);
        return bytes(_base).length == 0 ? "" : string.concat(_base, t.key, ".json");
    }

    // ---------- owner ----------
    /// Only the owner's 70% of coin purchases: the prize pool and unclaimed prizes stay for the players.
    function withdraw() external onlyOwner {
        uint256 amount = ownerFunds;
        ownerFunds = 0;
        (bool ok, ) = payable(owner).call{value: amount}("");
        require(ok, "withdraw failed");
    }

    // ---------- bookkeeping: keep `held` right through mints and transfers ----------
    function _update(address to, uint256 id, address auth) internal override returns (address from) {
        from = super._update(to, id, auth);
        bytes32 h = keccak256(bytes(_isDriver[id] ? _driverTypes[_typeOf[id]].key : _partTypes[_typeOf[id]].key));
        if (from != address(0)) held[from][h] -= 1;
        if (to != address(0)) held[to][h] += 1;
        if (_isDriver[id]) {
            if (from != address(0)) driversHeld[from] -= 1;
            if (to != address(0)) driversHeld[to] += 1;
        }
    }
}
