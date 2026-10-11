const tag = document.currentScript;
const id = tag && tag.dataset.ga4;

window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}

if (id) {
  gtag("js", new Date());
  gtag("config", id);

  const loader = document.createElement("script");
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(loader);

  const page = location.pathname;
  const send = (name, params = {}) => gtag("event", name, { page_path: page, ...params });
  const where = (element) => {
    if (element.closest("[data-mobile-bar]")) return "mobile-bar";
    if (element.closest("header")) return "header";
    if (element.closest("footer")) return "footer";
    return "content";
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a, button");
    if (!link) return;
    const href = link.getAttribute("href") || "";

    if (href.startsWith("tel:")) {
      send("phone_click", { link_location: link.dataset.location || where(link) });
    } else if (href.startsWith("mailto:")) {
      send("email_click", { link_location: link.dataset.location || where(link) });
    } else if (link.dataset.track === "calculator_download") {
      send("calculator_download");
    } else if (link.dataset.track === "cta_click") {
      send("cta_click", { cta_label: link.dataset.label || link.textContent.trim(), link_url: href });
    }
  });

  document.addEventListener("before-after:interact", (event) => {
    send("before_after_interact", { slider_id: event.target.id || "before-after" });
  });

  const conversion = document.querySelector("[data-conversion]");
  if (conversion) {
    const form = new URLSearchParams(location.search).get("form") || "project";
    send("generate_lead", { form_type: form });
    if (form === "teardown") send("teardown_request");
  }
}
