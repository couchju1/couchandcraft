const menuToggle = document.querySelector(".site-nav__toggle");
const menu = document.getElementById("site-menu");

if (menuToggle && menu) {
  const desktop = window.matchMedia("(min-width: 1024px)");
  const isOpen = () => menuToggle.getAttribute("aria-expanded") === "true";
  const setOpen = (open) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
  };

  menuToggle.addEventListener("click", () => setOpen(!isOpen()));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      menuToggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (isOpen() && !menu.contains(event.target) && !menuToggle.contains(event.target)) setOpen(false);
  });

  menu.addEventListener("focusout", (event) => {
    if (isOpen() && !desktop.matches && event.relatedTarget && !menu.contains(event.relatedTarget) && event.relatedTarget !== menuToggle) {
      setOpen(false);
    }
  });

  desktop.addEventListener("change", () => setOpen(false));
}

const mobileBar = document.querySelector("[data-mobile-bar]");
const forms = document.querySelectorAll("form");

if (mobileBar && forms.length && "IntersectionObserver" in window) {
  const formsInView = new Set();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) formsInView.add(entry.target);
      else formsInView.delete(entry.target);
    }
    const hide = formsInView.size > 0;
    mobileBar.classList.toggle("is-hidden", hide);
    mobileBar.inert = hide;
  });
  forms.forEach((form) => observer.observe(form));
}
