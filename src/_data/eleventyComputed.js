const crumbsFor = (data) => {
  const url = data.page && data.page.url;
  if (!url || url === "/" || data.hideBreadcrumbs) return [];
  const current = data.crumb || String(data.title || "").split(" | ")[0];
  return [{ title: "Home", url: "/" }, ...(data.breadcrumbs || []), { title: current, url }];
};

module.exports = {
  crumbs: crumbsFor,
  breadcrumbTrail: (data) => {
    const crumbs = crumbsFor(data);
    if (crumbs.length < 2) return null;
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.title,
        item: new URL(c.url, data.site.business.url).href,
      })),
    };
  },
};
