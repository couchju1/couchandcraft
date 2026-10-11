const site = require("../../site.config.json");
const { isSet } = require("../../lib/values");

module.exports = () => {
  const { business, contact, social } = site;
  const home = `${business.url}/`;

  const org = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${home}#business`,
    name: business.name,
    url: home,
    description: business.descriptor,
    image: `${home}assets/img/og/default.jpg`,
    address: {
      "@type": "PostalAddress",
      addressLocality: business.city,
      addressRegion: business.state,
      addressCountry: "US",
    },
    areaServed: business.serviceArea.map((town) => ({ "@type": "City", name: `${town}, ${business.state}` })),
    founder: { "@type": "Person", name: business.founder },
  };

  if (isSet(contact.phoneE164)) org.telephone = contact.phoneE164;
  if (isSet(contact.email)) org.email = contact.email;

  const sameAs = Object.values(social).filter(isSet);
  if (sameAs.length) org.sameAs = sameAs;

  return { business: org };
};
