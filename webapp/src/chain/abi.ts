// ABI แบบอ่านง่ายของ Ethers.js (ใช้เฉพาะฟังก์ชันที่เกมเรียก)
// สร้างจาก contracts/artifacts หลัง `npx hardhat compile` ถ้าแก้ contract ให้อัปเดตตรงนี้ด้วย
export const PIT_WALL_ABI = [
  "function inventoryOf(address who) view returns (uint256[] ids, (bool isDriver, string key, uint8 slot, uint8 a, uint8 b, uint8 c)[] infos)",
  "function starterClaimed(address) view returns (bool)",
  "function priceOf(string key) view returns (uint256)",
  "function claimStarter(string driverKey, uint8 kind)",
  "function buyDriver(string key) payable",
  "function buyPart(string key) payable",
  "function seasonInfo(address who) view returns (uint256 currentSeason, uint256 pool, uint256 myPoints, uint256 myLastRound, uint256 myClaimable, address[3] top, uint256[3] topPoints)",
  "function submitRace(uint256 round, uint256 points, bytes32 record)",
  "function claim()",
  "function sponsor() payable",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenURI(uint256 id) view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];
