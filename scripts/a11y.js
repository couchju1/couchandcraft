#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const distDir = path.resolve(__dirname, "..", "dist");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const widths = [390, 1280];

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function pages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return pages(full);
    return d.name.endsWith(".html") ? [full] : [];
  });
}

function serve() {
  const server = http.createServer((req, res) => {
    let file = path.join(distDir, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!file.startsWith(distDir) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

(async () => {
  if (!fs.existsSync(distDir)) {
    process.stderr.write("dist/ not found. Run npm run build first.\n");
    process.exit(1);
  }
  const server = await serve();
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  let failures = 0;

  for (const file of pages(distDir)) {
    const url = "/" + path.relative(distDir, file).replace(/index\.html$/, "").split(path.sep).join("/");
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(base + url, { waitUntil: "load" });
      await page.addScriptTag({ content: axeSource });
      const results = await page.evaluate(() =>
        window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } })
      );
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      const minor = results.violations.length - serious.length;
      const status = serious.length ? "FAIL" : "ok  ";
      process.stdout.write(`${status} ${url} @${width}px  serious/critical: ${serious.length}  moderate/minor: ${minor}\n`);
      for (const v of results.violations) {
        process.stdout.write(`       [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})\n`);
        for (const node of v.nodes.slice(0, 3)) process.stdout.write(`         ${node.target.join(" ")}\n`);
      }
      failures += serious.length;
      await page.close();
    }
  }

  await browser.close();
  server.close();
  process.exit(failures ? 1 : 0);
})();
