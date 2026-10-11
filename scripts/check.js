#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "site.config.json");
const distDir = path.join(root, "dist");

const TITLE_MAX = 60;
const META_MAX = 155;

const args = process.argv.slice(2);
const configOnly = args.includes("--config");
const prelaunch = args.includes("--prelaunch");

const errors = [];
const fail = (msg) => errors.push(msg);

const { isOpen, isSet } = require("../lib/values");
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function requireKeys(obj, keys, where) {
  if (!isObject(obj)) return fail(`${where} must be an object`);
  for (const key of keys) {
    if (!(key in obj)) fail(`${where}.${key} is missing`);
  }
}

function checkUrl(value, where, { allowNull = true } = {}) {
  if (value === null && allowNull) return;
  if (isOpen(value)) return;
  if (typeof value !== "string" || !/^https:\/\/[^\s]+$/.test(value)) {
    fail(`${where} must be an https URL, an open value or null (got ${JSON.stringify(value)})`);
  }
}

function checkConfig() {
  let raw;
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch {
    fail("site.config.json not found");
    return;
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    fail(`site.config.json is not valid JSON: ${err.message}`);
    return;
  }

  requireKeys(config, ["business", "contact", "pricing", "process", "social", "analytics", "about", "work"], "config");

  const { business, contact, pricing, process: steps, social, analytics, about, work } = config;

  if (isObject(business)) {
    requireKeys(business, ["name", "founder", "descriptor", "url", "city", "state", "serviceAreaBusiness", "serviceArea"], "business");
    for (const key of ["name", "founder", "descriptor", "city", "state"]) {
      if (typeof business[key] !== "string" || !business[key]) fail(`business.${key} must be a non-empty string`);
    }
    checkUrl(business.url, "business.url", { allowNull: false });
    if (typeof business.serviceAreaBusiness !== "boolean") fail("business.serviceAreaBusiness must be true or false");
    if (!Array.isArray(business.serviceArea) || business.serviceArea.length === 0) {
      fail("business.serviceArea must be a non-empty list of towns");
    }
    if (business.serviceAreaBusiness && isSet(business.streetAddress)) {
      fail("business.streetAddress must stay null for a service-area business");
    }
  }

  if (isObject(contact)) {
    requireKeys(contact, ["phoneDisplay", "phoneE164", "email", "formTo", "responseTime", "hours"], "contact");
    if (isSet(contact.phoneE164) && !/^\+1\d{10}$/.test(contact.phoneE164)) {
      fail(`contact.phoneE164 must look like +16055551234 (got ${contact.phoneE164})`);
    }
    for (const key of ["email", "formTo"]) {
      if (isSet(contact[key]) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact[key])) {
        fail(`contact.${key} is not an email address (got ${contact[key]})`);
      }
    }
  }

  if (isObject(pricing)) {
    requireKeys(
      pricing,
      ["foundationFrom", "signatureFrom", "signatureTypical", "careMonthly", "leadResponseSetup", "leadResponseMonthly", "paymentTerms", "ownershipPolicy"],
      "pricing"
    );
  }

  if (!Array.isArray(steps) || steps.length === 0) {
    fail("process must be a non-empty list");
  } else {
    steps.forEach((s, i) => requireKeys(s, ["step", "weeks"], `process[${i}]`));
  }

  if (isObject(social)) {
    for (const [key, value] of Object.entries(social)) checkUrl(value, `social.${key}`);
  }

  if (isObject(analytics) && isSet(analytics.ga4) && !/^G-[A-Z0-9]+$/.test(analytics.ga4)) {
    fail(`analytics.ga4 must look like G-XXXXXXXXXX (got ${analytics.ga4})`);
  }

  if (isObject(about) && typeof about.showDayJob !== "boolean") {
    fail("about.showDayJob must be true or false");
  }

  if (!Array.isArray(work)) {
    fail("work must be a list");
  } else {
    const slugs = new Set();
    work.forEach((entry, i) => {
      const where = `work[${i}]`;
      requireKeys(entry, ["slug", "client", "industry", "location", "liveUrl", "quote", "results"], where);
      if (!isObject(entry)) return;
      if (typeof entry.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.slug)) {
        fail(`${where}.slug must be kebab-case (got ${JSON.stringify(entry.slug)})`);
      } else if (slugs.has(entry.slug)) {
        fail(`${where}.slug "${entry.slug}" is used twice`);
      } else {
        slugs.add(entry.slug);
      }
      checkUrl(entry.liveUrl, `${where}.liveUrl`);
      if ("beforeUrl" in entry) checkUrl(entry.beforeUrl, `${where}.beforeUrl`);
      if ("publish" in entry && typeof entry.publish !== "boolean") fail(`${where}.publish must be true or false`);
    });
  }
}

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", trade: "™",
  hellip: "…", middot: "·", times: "×", rarr: "→", larr: "←", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  ndash: "\u2013", mdash: "\u2014",
};

function decode(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .trim();
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return htmlFiles(full);
    return d.name.endsWith(".html") ? [full] : [];
  });
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[2] ?? m[3]) : null;
}

function checkPages() {
  if (!fs.existsSync(distDir)) {
    fail("dist/ not found. Run npm run build first.");
    return;
  }

  const titles = new Map();
  const metas = new Map();

  for (const file of htmlFiles(distDir)) {
    const page = path.relative(distDir, file);
    const html = fs.readFileSync(file, "utf8");

    const titleTags = html.match(/<title[^>]*>[\s\S]*?<\/title>/gi) || [];
    if (titleTags.length !== 1) {
      fail(`${page}: expected one <title>, found ${titleTags.length}`);
    } else {
      const title = decode(titleTags[0].replace(/<\/?title[^>]*>/gi, ""));
      if (!title) fail(`${page}: <title> is empty`);
      if (title.length > TITLE_MAX) fail(`${page}: title is ${title.length} characters (max ${TITLE_MAX}): ${title}`);
      if (titles.has(title)) fail(`${page}: title duplicates ${titles.get(title)}: ${title}`);
      titles.set(title, page);
    }

    const metaTags = (html.match(/<meta\b[^>]*>/gi) || []).filter((t) => /name\s*=\s*["']description["']/i.test(t));
    const noindex = (html.match(/<meta\b[^>]*>/gi) || []).some(
      (t) => /name\s*=\s*["']robots["']/i.test(t) && /noindex/i.test(attr(t, "content") || "")
    );
    if (metaTags.length > 1) fail(`${page}: more than one meta description`);
    if (metaTags.length === 0 && !noindex) fail(`${page}: missing meta description`);
    if (metaTags.length === 1) {
      const meta = decode(attr(metaTags[0], "content") || "");
      if (!meta) fail(`${page}: meta description is empty`);
      if (meta.length > META_MAX) fail(`${page}: meta description is ${meta.length} characters (max ${META_MAX})`);
      if (metas.has(meta)) fail(`${page}: meta description duplicates ${metas.get(meta)}`);
      metas.set(meta, page);
    }

    const h1s = (html.match(/<h1\b/gi) || []).length;
    if (h1s !== 1) fail(`${page}: expected one <h1>, found ${h1s}`);
  }
}

const BANNED = [
  "delve", "elevate", "empower", "seamless", "unlock", "robust", "leverage", "streamline", "comprehensive",
  "cutting-edge", "top-notch", "one-stop shop", "tailored solutions", "passionate about", "trusted partner",
  "we pride ourselves", "journey", "look no further", "in today's fast-paced world", "whether you're",
];
const MARKERS = ["[COPY:", "[NEEDS", "[JUSTIN TO", "[CLIENT TO", "lorem"];

function visibleText(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const meta = ((html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i) || [""])[0].match(/content="([^"]*)"/) || [])[1] || "";
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [])[1] || "";
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decode([title, meta, text].join(" \n ")).replace(/[ \t\r]+/g, " ");
}

function snippet(text, index) {
  return text.slice(Math.max(0, index - 40), index + 40).replace(/\s+/g, " ").trim();
}

function prelaunchChecks() {
  const hits = new Map();
  const add = (group, page, detail) => {
    if (!hits.has(group)) hits.set(group, new Map());
    const byDetail = hits.get(group);
    if (!byDetail.has(detail)) byDetail.set(detail, new Set());
    byDetail.get(detail).add(page);
  };

  for (const file of htmlFiles(distDir)) {
    const page = "/" + path.relative(distDir, file).split(path.sep).join("/").replace(/index\.html$/, "");
    const html = fs.readFileSync(file, "utf8");
    const text = visibleText(html);
    const lower = text.toLowerCase();

    for (const marker of MARKERS) {
      let at = lower.indexOf(marker.toLowerCase());
      while (at !== -1) {
        const end = text.indexOf("]", at);
        add("Open placeholders", page, end !== -1 && end - at < 160 ? text.slice(at, end + 1) : snippet(text, at));
        at = lower.indexOf(marker.toLowerCase(), at + 1);
      }
    }
    for (const word of BANNED) {
      const re = new RegExp(`\\b${word.replace(/[-']/g, (c) => `\\${c}`)}\\b`, "gi");
      for (const m of text.matchAll(re)) add("Banned words", page, `"${m[0]}": ${snippet(text, m.index)}`);
    }
    for (const m of text.matchAll(/[\u2013\u2014]/g)) add("Em or en dashes", page, snippet(text, m.index));
    for (const m of text.matchAll(/;/g)) add("Semicolons", page, snippet(text, m.index));
    if (/href=["']#["']/.test(html)) add("href=\"#\"", page, "empty link");
    if (/<meta[^>]+name=["']generator["']/i.test(html)) add("Generator meta tag", page, "generator tag");
    if (/console\.log/.test(html)) add("console.log", page, "inline console.log");
  }

  const assets = path.join(distDir, "assets", "js");
  if (fs.existsSync(assets)) {
    for (const file of fs.readdirSync(assets)) {
      if (/console\.log/.test(fs.readFileSync(path.join(assets, file), "utf8"))) add("console.log", `/assets/js/${file}`, "console.log");
    }
  }
  if (fs.existsSync(path.join(distDir, "styleguide"))) add("Styleguide still built", "/styleguide/", "delete src/styleguide.njk");

  let total = 0;
  for (const [group, byDetail] of hits) {
    const count = [...byDetail.values()].reduce((n, pages) => n + pages.size, 0);
    total += count;
    console.error(`\n${group} (${count}):`);
    for (const [detail, pages] of [...byDetail].sort((a, b) => b[1].size - a[1].size)) {
      const list = [...pages];
      console.error(`  - ${detail}  [${list.length} page${list.length === 1 ? "" : "s"}: ${list.slice(0, 4).join(", ")}${list.length > 4 ? ", ..." : ""}]`);
    }
  }
  if (total) fail(`pre-launch check found ${total} hit(s), listed above`);
}

checkConfig();
if (!configOnly && errors.length === 0) checkPages();
if (prelaunch && errors.length === 0) prelaunchChecks();

if (errors.length) {
  console.error(`check failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(configOnly ? "check: site.config.json OK" : prelaunch ? "check: pre-launch OK" : "check: config and pages OK");
