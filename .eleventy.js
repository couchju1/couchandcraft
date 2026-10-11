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
  eleventyConfig.addFilter("hostname", (url) => new URL(url).hostname.replace(/^www\./, ""));

  eleventyConfig.addPassthroughCopy({ "src/assets/css/*.css": "assets/css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js/*.js": "assets/js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/fonts/*.woff2": "assets/fonts" });

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
