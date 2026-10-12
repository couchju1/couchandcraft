const site = require("../../site.config.json");
const { isSet } = require("../../lib/values");

module.exports = {
  pricing: isSet(site.pricing.foundationFrom) && isSet(site.pricing.signatureFrom),
  leadPricing: isSet(site.pricing.leadResponseSetup) && isSet(site.pricing.leadResponseMonthly),
  carePlan: isSet(site.pricing.careMonthly) && site.carePlan.includes.some(isSet),
  timing: site.process.every((step) => isSet(step.weeks)),
  packages: site.webDesign.packages.some((row) => isSet(row.foundation) || isSet(row.signature)),
  analytics: isSet(site.analytics.ga4),
};
