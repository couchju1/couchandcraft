#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "src/assets/img/brand/logo-full.jpg");
const outDir = path.join(root, "src/assets/img/brand/icons");
const sizes = [16, 32, 96, 180, 512];

const ico = (pngs) => {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((png) => png.data)]);
};

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const square = await sharp(source)
    .extract({ left: 150, top: 130, width: 950, height: 750 })
    .extend({ top: 100, bottom: 100, extendWith: "copy" })
    .png()
    .toBuffer();

  const pngs = [];
  for (const size of sizes) {
    const data = await sharp(square).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(path.join(outDir, `mark-${size}.png`), data);
    if (size <= 32) pngs.push({ size, data });
  }
  fs.writeFileSync(path.join(root, "src/favicon.ico"), ico(pngs));
  console.log(`icons: wrote ${sizes.length} marks and favicon.ico`);
})();
