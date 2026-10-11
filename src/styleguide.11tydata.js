const luminance = (hex) => {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
};

const grade = (r) => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA large / UI only" : "Fails");

const colors = {
  "--navy-900": "#071B3A",
  "--navy-800": "#0E2A55",
  "--ink": "#161A22",
  "--slate": "#667085",
  "--paper": "#F8F7F2",
  "--white": "#FFFFFF",
  "--line": "#E4E1D6",
  "--gold": "#C99A2E",
  "--gold-text": "#8A6A1C",
  "--blue": "#1456C3",
};

const pairs = [
  ["--ink", "--paper", "Body text"],
  ["--ink", "--white", "Body text on cards"],
  ["--slate", "--paper", "Secondary text"],
  ["--slate", "--white", "Secondary text on cards"],
  ["--gold-text", "--paper", "Gold text on light"],
  ["--blue", "--paper", "Links and focus ring"],
  ["--blue", "--white", "Links on cards"],
  ["--paper", "--navy-900", "Text on navy bands"],
  ["--paper", "--navy-800", "Text on raised navy"],
  ["--gold", "--navy-900", "Gold text and focus ring on navy"],
  ["--navy-900", "--gold", "Navy number on a gold pin"],
  ["--gold", "--paper", "Never: gold text on light"],
  ["--blue", "--navy-900", "Never: blue on navy"],
];

module.exports = {
  layout: "layouts/base.njk",
  title: "Styleguide | Couch & Craft",
  noindex: true,
  crumb: "Styleguide",
  stylesheets: ["/assets/css/styleguide.css"],
  eleventyExcludeFromCollections: true,
  colors: Object.entries(colors).map(([token, hex]) => ({ token, hex })),
  pairs: pairs.map(([fg, bg, use]) => {
    const r = ratio(colors[fg], colors[bg]);
    return { fg, bg, fgHex: colors[fg], bgHex: colors[bg], use, ratio: r.toFixed(2), grade: grade(r) };
  }),
  steps: ["5", "4", "3", "2", "1", "0", "-1"],
};
