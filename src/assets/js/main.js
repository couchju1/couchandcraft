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

document.querySelectorAll("[data-before-after]").forEach((slider) => {
  const frame = slider.querySelector(".before-after__frame");
  const range = slider.querySelector(".before-after__range");
  if (!frame || !range) return;

  const set = (value) => {
    const position = Math.min(100, Math.max(0, Number(value)));
    range.value = String(position);
    frame.style.setProperty("--position", `${position}%`);
    range.setAttribute("aria-valuetext", `Showing ${position}% before, ${100 - position}% after`);
  };

  let reported = false;
  const report = () => {
    if (reported) return;
    reported = true;
    slider.dispatchEvent(new CustomEvent("before-after:interact", { bubbles: true }));
  };

  range.addEventListener("input", () => {
    set(range.value);
    report();
  });

  range.addEventListener("keydown", (event) => {
    const current = Number(range.value);
    const moves = {
      ArrowLeft: current - 5,
      ArrowDown: current - 5,
      ArrowRight: current + 5,
      ArrowUp: current + 5,
      PageDown: current - 20,
      PageUp: current + 20,
      Home: 0,
      End: 100,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    set(moves[event.key]);
    report();
  });

  set(range.value);
});

document.querySelectorAll("[data-pin]").forEach((element) => {
  const key = element.dataset.pin;
  const toggle = (on) => {
    document.querySelectorAll(`[data-pin="${key}"]`).forEach((match) => match.classList.toggle("is-active", on));
  };
  element.addEventListener("mouseenter", () => toggle(true));
  element.addEventListener("mouseleave", () => toggle(false));
  element.addEventListener("focus", () => toggle(true));
  element.addEventListener("blur", () => toggle(false));
});

const validators = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
  tel: (value) => value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "").length === 10,
  url: (value) => /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(value),
};

document.querySelectorAll("[data-form]").forEach((form) => {
  const summary = form.querySelector(".form__errors");
  const summaryList = form.querySelector(".form__errors-list");
  const submit = form.querySelector("[data-submit]");
  const started = form.querySelector("[data-started]");
  const fields = [...form.querySelectorAll("input, select, textarea")].filter(
    (el) => el.type !== "hidden" && el.name !== "fax" && el.type !== "checkbox"
  );
  let attempted = false;

  if (started) started.value = String(Date.now());

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    delete form.dataset.sending;
    submit.removeAttribute("aria-busy");
    submit.textContent = submit.dataset.label;
  });
  submit.dataset.label = submit.textContent;

  const errorFor = (field) => {
    const value = field.value.trim();
    if (!value) return field.required ? field.dataset.requiredMsg || "Fill in this field" : "";
    const check = validators[field.type];
    if (check && !check(value)) return field.dataset.invalidMsg || "Check this field";
    return "";
  };

  const show = (field, message) => {
    const error = form.querySelector(`#${field.id}-error`);
    field.setAttribute("aria-invalid", message ? "true" : "false");
    field.closest("[data-field]").classList.toggle("has-error", Boolean(message));
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
  };

  fields.forEach((field) => {
    const recheck = () => {
      if (attempted) show(field, errorFor(field));
    };
    field.addEventListener("input", recheck);
    field.addEventListener("change", recheck);
  });

  form.addEventListener("submit", (event) => {
    if (form.dataset.sending === "true") {
      event.preventDefault();
      return;
    }
    attempted = true;
    const problems = fields.map((field) => ({ field, message: errorFor(field) })).filter((p) => p.message);
    fields.forEach((field) => show(field, problems.find((p) => p.field === field)?.message || ""));

    if (problems.length) {
      event.preventDefault();
      summaryList.replaceChildren(
        ...problems.map(({ field, message }) => {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = `#${field.id}`;
          link.textContent = message;
          link.addEventListener("click", (e) => {
            e.preventDefault();
            field.focus();
          });
          item.append(link);
          return item;
        })
      );
      summary.hidden = false;
      summary.focus();
      return;
    }

    summary.hidden = true;
    fields
      .filter((field) => field.type === "url" && field.value.trim() && !/^https?:\/\//i.test(field.value.trim()))
      .forEach((field) => {
        field.value = `https://${field.value.trim()}`;
      });
    form.dataset.sending = "true";
    submit.setAttribute("aria-busy", "true");
    submit.textContent = "Sending";
  });
});
