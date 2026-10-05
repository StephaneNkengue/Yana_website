(function () {
  // Le jour où Apple valide l'app, colle ici le lien de la fiche App Store
  // (ex. "https://apps.apple.com/app/id0000000000") : tous les boutons
  // « Bientôt sur l'App Store » deviennent « Télécharger dans l'App Store ».
  const APP_STORE_URL = "";

  const html = document.documentElement;
  const toggle = document.getElementById("lang-toggle");

  // ---------- Langue ----------
  // Le HTML porte l'anglais ; `data-fr` porte le français. On garde l'anglais
  // d'origine en mémoire pour pouvoir y revenir.
  const textEls = Array.from(document.querySelectorAll("[data-fr]"));
  textEls.forEach((el) => { el.dataset.en = el.innerHTML; });
  const hrefEls = Array.from(document.querySelectorAll("[data-fr-href]"));
  hrefEls.forEach((el) => { el.dataset.enHref = el.getAttribute("href"); });

  const strings = {
    en: { soonSmall: "Coming soon on the", liveSmall: "Download on the", soonNote: "Coming soon on the App Store", liveNote: "Available on the App Store", liveBtn: "Download" },
    fr: { soonSmall: "Bientôt sur", liveSmall: "Télécharger dans", soonNote: "Bientôt sur l'App Store", liveNote: "Disponible sur l'App Store", liveBtn: "Télécharger" },
  };

  function applyLang(lang) {
    html.setAttribute("data-lang", lang);
    html.setAttribute("lang", lang);
    textEls.forEach((el) => { el.innerHTML = lang === "fr" ? el.dataset.fr : el.dataset.en; });
    hrefEls.forEach((el) => { el.setAttribute("href", lang === "fr" ? el.dataset.frHref : el.dataset.enHref); });
    if (toggle) toggle.textContent = lang === "en" ? "FR" : "EN";
    applyStore(lang);
    restartRotator(lang);
    try { localStorage.setItem("yana-lang", lang); } catch (e) { /* stockage indisponible */ }
  }

  // ---------- Boutons App Store ----------
  function applyStore(lang) {
    if (!APP_STORE_URL) return;
    const s = strings[lang];
    document.querySelectorAll(".js-store").forEach((a) => {
      a.setAttribute("href", APP_STORE_URL);
      a.removeAttribute("aria-disabled");
      a.removeAttribute("role");
    });
    document.querySelectorAll(".js-store-small").forEach((el) => { el.textContent = s.liveSmall; });
    document.querySelectorAll(".js-store-note").forEach((el) => { el.hidden = true; });
    document.querySelectorAll(".js-store-note-short").forEach((el) => { el.textContent = s.liveNote; });
    document.querySelectorAll(".js-store-btn").forEach((el) => {
      el.setAttribute("href", APP_STORE_URL);
      el.textContent = s.liveBtn;
    });
  }

  // ---------- Mot qui tourne dans le hero ----------
  const rotator = document.getElementById("rotator");
  let rotateTimer = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function restartRotator(lang) {
    if (!rotator) return;
    clearInterval(rotateTimer);
    const words = (rotator.getAttribute(`data-words-${lang}`) || "").split("|");
    let i = 0;
    rotator.textContent = words[0];
    if (reduceMotion || words.length < 2) return;
    rotateTimer = setInterval(() => {
      rotator.classList.add("out");
      setTimeout(() => {
        i = (i + 1) % words.length;
        rotator.textContent = words[i];
        rotator.classList.remove("out");
      }, 350);
    }, 2600);
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      applyLang(html.getAttribute("data-lang") === "en" ? "fr" : "en");
    });
  }

  let initial = (navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
  try {
    const saved = localStorage.getItem("yana-lang");
    if (saved === "en" || saved === "fr") initial = saved;
  } catch (e) { /* stockage indisponible : langue du navigateur */ }
  applyLang(initial);

  // ---------- En-tête au défilement + barre mobile ----------
  const header = document.querySelector(".site-header");
  const mobileCta = document.getElementById("mobile-cta");
  const hero = document.querySelector(".hero");
  const finalCta = document.querySelector(".final-cta");

  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 8);
    if (mobileCta && hero) {
      const pastHero = y > hero.offsetTop + hero.offsetHeight - 200;
      const atEnd = finalCta && y + window.innerHeight > finalCta.offsetTop + 120;
      mobileCta.classList.toggle("show", pastHero && !atEnd);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- Apparition des blocs ----------
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }
})();
