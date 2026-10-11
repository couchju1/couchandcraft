const isProduction = process.env.ELEVENTY_ENV === "production";

const { isOpen, isSet } = require("./lib/values");

module.exports = function (eleventyConfig) {
  eleventyConfig.addFilter("isSet", isSet);

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
