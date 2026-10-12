module.exports = {
  eleventyComputed: {
    permalink: (data) => (data.ready.pricing ? "/pricing/" : false),
  },
};
