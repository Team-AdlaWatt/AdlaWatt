(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#site-nav");

  if (!header || !toggle || !nav) return;

  const label = toggle.querySelector(".nav-toggle-label");
  const mobile = window.matchMedia("(max-width: 820px)");

  const setOpen = (open, returnFocus = false) => {
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "Close" : "Menu";

    if (open) {
      const firstLink = nav.querySelector("a");
      if (firstLink) firstLink.focus({ preventScroll: true });
    } else if (returnFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener("click", () => {
    setOpen(!header.classList.contains("nav-open"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("nav-open")) {
      setOpen(false, true);
    }
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a") && header.classList.contains("nav-open")) {
      setOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (header.classList.contains("nav-open") && !header.contains(event.target)) {
      setOpen(false);
    }
  });

  mobile.addEventListener("change", (event) => {
    if (!event.matches) setOpen(false);
  });
})();
