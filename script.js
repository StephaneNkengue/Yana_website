(function () {
  const toggle = document.getElementById("lang-toggle");
  const html = document.documentElement;

  function applyLang(lang) {
    html.setAttribute("data-lang", lang);
    document.querySelectorAll("[data-en]").forEach((el) => {
      const text = el.getAttribute(`data-${lang}`);
      if (text !== null) el.innerHTML = text;
    });
    document.querySelectorAll("[data-en-href]").forEach((el) => {
      const href = el.getAttribute(`data-${lang}-href`);
      if (href) el.setAttribute("href", href);
    });
    toggle.textContent = lang === "en" ? "FR" : "EN";
    localStorage.setItem("yana-lang", lang);
  }

  toggle.addEventListener("click", () => {
    const current = html.getAttribute("data-lang");
    applyLang(current === "en" ? "fr" : "en");
  });

  try {
    const saved = localStorage.getItem("yana-lang");
    if (saved) applyLang(saved);
  } catch (e) {
    // localStorage unavailable, default stays English
  }
})();
