const fs = require("fs");
const path = require("path");
const { isOpen, isSet } = require("./lib/values");

const isProduction = process.env.ELEVENTY_ENV === "production";
const imageRoot = "src/assets/img";

module.exports = async function (eleventyConfig) {
  const { eleventyImageTransformPlugin } = await import("@11ty/eleventy-img");

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["avif", "webp", "jpeg"],
    widths: [480, 800, 1200, 1600],
    urlPath: "/assets/img/",
    outputDir: "dist/assets/img/",
    sharpJpegOptions: { quality: 82, mozjpeg: true },
    sharpWebpOptions: { quality: 80 },
    sharpAvifOptions: { quality: 60 },
    htmlOptions: {
      imgAttributes: { loading: "lazy", decoding: "async" },
    },
  });

  eleventyConfig.addFilter("isSet", isSet);
  eleventyConfig.addFilter("isOpen", isOpen);

  eleventyConfig.addFilter("open", function (value) {
    if (value === null || value === undefined) return "";
    if (!isOpen(value)) return value;
    if (isProduction) {
      const where = this.page ? this.page.inputPath : "unknown template";
      throw new Error(`Open config value rendered in a production build: ${value} (${where})`);
    }
    return value;
  });

  eleventyConfig.addFilter("jsonLd", (value) => JSON.stringify(value).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("absoluteUrl", (url, base) => new URL(url, base).href);
  eleventyConfig.addFilter("stripTags", (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
  eleventyConfig.addFilter("hasImage", (src) => Boolean(src) && fs.existsSync(path.join(imageRoot, src)));
  eleventyConfig.addFilter("published", (work) => (work || []).filter((entry) => entry.publish !== false));
  eleventyConfig.addFilter("listed", (work) => (work || []).filter((entry) => entry.publish !== false && entry.listed !== false));
  eleventyConfig.addFilter("setOnly", (list, key) => (list || []).filter((item) => item && isSet(item[key])));
  eleventyConfig.addFilter("faqReady", (faqs) => (faqs || []).filter((item) => item && item.a));
  eleventyConfig.addFilter("findBySlug", (list, slug) => (list || []).find((entry) => entry.slug === slug));
  eleventyConfig.addFilter("without", (list, value) => (list || []).filter((item) => item !== value));
  eleventyConfig.addFilter("faqSchema", (faqs) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faqs || []).map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: String(item.a).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() },
    })),
  }));
  eleventyConfig.addFilter("serviceSchema", (service, site) => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      serviceType: service.type || service.name,
      description: service.description,
      provider: { "@id": `${site.business.url}/#business` },
      areaServed: site.business.serviceArea.map((town) => ({ "@type": "City", name: `${town}, ${site.business.state}` })),
    };
    const price = service.price && isSet(service.price) ? Number(String(service.price).replace(/[^0-9.]/g, "")) : NaN;
    if (Number.isFinite(price) && price > 0) {
      schema.offers = { "@type": "Offer", priceCurrency: "USD", price: String(price) };
    }
    return schema;
  });
  eleventyConfig.addFilter("packageRows", (packages, pricing) => {
    const from = (value) => (isSet(value) ? `From ${value}` : value);
    return [
      ...(packages || []).map((row) => ({ label: row.label, cells: [row.foundation, row.signature] })),
      { label: "Price", cells: [from(pricing.foundationFrom), from(pricing.signatureFrom)] },
    ];
  });
  eleventyConfig.addFilter("phpString", (value) => `'${String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`);
  eleventyConfig.addFilter("sitemapPages", (items) =>
    items
      .filter((item) => item.url && item.outputPath && item.outputPath.endsWith(".html"))
      .filter((item) => !item.data.noindex && item.data.sitemap !== false)
      .sort((a, b) => a.url.localeCompare(b.url))
  );
  eleventyConfig.addFilter("hostname", (url) => new URL(url).hostname.replace(/^www\./, ""));

  eleventyConfig.amendLibrary("md", (md) => {
    md.renderer.rules.table_open = (tokens, idx, options, env) => {
      env.tableCount = (env.tableCount || 0) + 1;
      return `<div class="table-wrap" role="region" tabindex="0" aria-label="Table ${env.tableCount}, scrolls sideways on small screens"><table>\n`;
    };
    md.renderer.rules.table_close = () => "</table></div>\n";
  });

  eleventyConfig.addCollection("caseCopy", (api) => {
    const copy = {};
    for (const item of api.getFilteredByGlob("src/work/_copy/*.md")) copy[item.fileSlug] = item.data;
    return copy;
  });

  eleventyConfig.addPassthroughCopy({ "src/assets/css/*.css": "assets/css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js/*.js": "assets/js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/fonts/*.woff2": "assets/fonts" });
  eleventyConfig.addPassthroughCopy({ "api/contact.php": "api/contact.php" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img/og/*.jpg": "assets/img/og" });

  eleventyConfig.on("eleventy.before", () => {
    if (!isProduction) return;
    const { analytics } = require("./site.config.json");
    if (isOpen(analytics.ga4)) throw new Error(`Production build needs analytics.ga4 set or null in site.config.json (got ${analytics.ga4})`);
  });

  eleventyConfig.addGlobalData("env", isProduction ? "production" : "development");

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
