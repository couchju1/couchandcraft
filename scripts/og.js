#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const site = require(path.join(root, "site.config.json"));
const outDir = path.join(root, "src/assets/img/og");
const font = (file) => `url("data:font/woff2;base64,${fs.readFileSync(path.join(root, "src/assets/fonts", file)).toString("base64")}")`;

const published = site.work.filter((entry) => entry.publish !== false);
const images = [
  { name: "default", eyebrow: site.business.descriptor, title: `Web design in ${site.business.city}, ${site.business.state}.` },
  { name: "home", eyebrow: `${site.business.founder} · ${site.business.city}, ${site.business.state}`, title: "Your work is good. Your website should prove it." },
  { name: "web-design", eyebrow: "Web design", title: `Websites for ${site.business.city} service businesses.` },
  { name: "lead-response", eyebrow: "Lead Response", title: "Every missed call is a job you already paid for." },
  ...published.map((entry) => ({
    name: `work-${entry.slug}`,
    eyebrow: entry.inHouse ? "Built and run by me" : "Case study",
    title: entry.client,
    detail: `${entry.industry.replace(/ \(.*\)$/, "")} · ${entry.location}`,
  })),
];

const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const page = (image) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Fraunces"; font-weight: 100 900; src: ${font("fraunces-latin-wght-normal.woff2")}; }
@font-face { font-family: "Fraunces"; font-style: italic; font-weight: 100 900; src: ${font("fraunces-latin-wght-italic.woff2")}; }
@font-face { font-family: "Montserrat"; font-weight: 700; src: ${font("montserrat-latin-700-normal.woff2")}; }
@font-face { font-family: "Public Sans"; font-weight: 100 900; src: ${font("public-sans-latin-wght-normal.woff2")}; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; background: #071B3A; color: #F8F7F2; font-family: "Public Sans", sans-serif; }
.frame { position: absolute; inset: 40px; border: 2px solid rgb(201 154 46 / 0.35); border-radius: 10px; padding: 64px 72px; display: flex; flex-direction: column; justify-content: space-between; }
.logo { display: flex; align-items: baseline; gap: 14px; font-size: 40px; line-height: 1; }
.couch { font-family: "Montserrat"; font-weight: 700; letter-spacing: 0.04em; }
.amp { font-family: "Fraunces"; font-weight: 600; color: #C99A2E; }
.craft { font-family: "Fraunces"; font-style: italic; font-weight: 500; text-transform: uppercase; }
.eyebrow { font-family: "Montserrat"; font-weight: 700; font-size: 22px; letter-spacing: 0.14em; text-transform: uppercase; color: #C99A2E; margin-bottom: 20px; }
h1 { font-family: "Fraunces"; font-weight: 600; font-size: 68px; line-height: 1.08; max-width: 900px; }
.detail { margin-top: 18px; font-size: 28px; color: #C4CCDA; }
.pin { position: absolute; right: 72px; top: 64px; width: 56px; height: 56px; border-radius: 50%; background: #C99A2E; border: 3px solid #071B3A; box-shadow: 0 0 0 6px rgb(201 154 46 / 0.35); color: #071B3A; font-family: "Montserrat"; font-weight: 700; font-size: 26px; display: grid; place-items: center; }
.url { font-size: 24px; color: #C4CCDA; }
</style></head><body><div class="frame">
<div class="logo"><span class="couch">COUCH</span><span class="amp">&amp;</span><span class="craft">Craft</span></div>
<span class="pin">1</span>
<div><p class="eyebrow">${escape(image.eyebrow)}</p><h1>${escape(image.title)}</h1>${image.detail ? `<p class="detail">${escape(image.detail)}</p>` : ""}</div>
<p class="url">${escape(new URL(site.business.url).hostname)}</p>
</div></body></html>`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const image of images) {
    await tab.setContent(page(image), { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: path.join(outDir, `${image.name}.jpg`), type: "jpeg", quality: 85 });
    process.stdout.write(`og: ${image.name}.jpg\n`);
  }
  await browser.close();
})();
