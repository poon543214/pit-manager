// Builds the NFT metadata (one JSON per catalog key) for IPFS.
//   1. Upload nft-metadata/images to IPFS (e.g. Pinata), copy the folder CID.
//   2. IMAGE_CID=<that CID> node scripts/build-metadata.js
//   3. Upload nft-metadata/json, copy its CID, then call setBaseURI("ipfs://<json CID>/") from the owner wallet.
// tokenURI(id) is then ipfs://<json CID>/<key>.json, the same file for every token of that type.
const fs = require('fs');
const path = require('path');

const imageCid = process.env.IMAGE_CID;
if (!imageCid) {
  console.error('Set IMAGE_CID to the IPFS folder CID of nft-metadata/images first.');
  process.exit(1);
}

const web = path.join(__dirname, '../../webapp/src');
const drivers = require(path.join(web, 'data/drivers.json'));
const parts = require(path.join(web, 'data/parts.json'));
// perk names and text live in the game's TypeScript; pull them out of the source so there is one list
const perkSrc = fs.readFileSync(path.join(web, 'sim/perks.ts'), 'utf8');
const perk = (id) => {
  const m = perkSrc.match(new RegExp(`id: '${id}',\\s*name: '([^']+)',[^]*?text: '([^']+)'`));
  return m ? { name: m[1], text: m[2] } : { name: id, text: '' };
};
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const out = path.join(__dirname, '../nft-metadata/json');
fs.mkdirSync(out, { recursive: true });

for (const d of drivers) {
  const p = perk(d.perk);
  write(d.id, {
    name: d.name,
    description: `Pit Manager driver. Skill: ${p.name}. ${p.text}`,
    attributes: [
      { trait_type: 'Type', value: 'Driver' },
      { trait_type: 'Pace', value: d.pace, max_value: 10 },
      { trait_type: 'Consistency', value: d.consistency, max_value: 10 },
      { trait_type: 'Wet skill', value: d.wet, max_value: 10 },
      { trait_type: 'Skill', value: p.name },
    ],
  });
}
for (const pt of parts) {
  const p = perk(pt.perk);
  write(pt.id, {
    name: pt.name,
    description: `Pit Manager ${pt.slot} (${pt.kind}${pt.variant ? `, ${pt.variant} version` : ''}). Skill: ${p.name}. ${p.text}`,
    attributes: [
      { trait_type: 'Type', value: 'Part' },
      { trait_type: 'Slot', value: cap(pt.slot) },
      { trait_type: 'Build', value: cap(pt.kind) },
      { trait_type: 'Speed', value: pt.speed },
      { trait_type: 'Corner', value: pt.corner },
      { trait_type: 'Brake', value: pt.brake },
      ...(pt.variant ? [{ trait_type: 'Version', value: cap(pt.variant) }] : []),
      ...(pt.tire ? [{ trait_type: 'Tire care', value: pt.tire }] : []),
      ...(pt.wet ? [{ trait_type: 'Wet grip', value: pt.wet }] : []),
      ...(pt.rel ? [{ trait_type: 'Reliability', value: pt.rel }] : []),
      { trait_type: 'Skill', value: p.name },
    ],
  });
}

function write(key, meta) {
  fs.writeFileSync(path.join(out, `${key}.json`), JSON.stringify({ ...meta, image: `ipfs://${imageCid}/${key}.png` }, null, 2));
}
console.log(`Wrote ${drivers.length + parts.length} files to nft-metadata/json. Upload that folder, then setBaseURI("ipfs://<CID>/").`);
