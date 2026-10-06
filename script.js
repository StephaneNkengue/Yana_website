(function () {
  // Le jour où Apple valide l'app, colle ici le lien de la fiche App Store
  // (ex. "https://apps.apple.com/app/id0000000000") : tous les boutons
  // « Bientôt sur l'App Store » deviennent « Télécharger dans l'App Store ».
  const APP_STORE_URL = "";

  const html = document.documentElement;
  const lang = html.getAttribute("lang") === "fr" ? "fr" : "en";

  // ---------- Langue ----------
  // Chaque langue a ses propres pages (/ et /fr) : le bouton FR/EN est un
  // simple lien. On retient le choix pour ne pas rediriger quelqu'un qui a
  // choisi l'anglais.
  function remember(value) {
    try { localStorage.setItem("yana-lang", value); } catch (e) { /* stockage indisponible */ }
  }
  const toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.addEventListener("click", () => remember(toggle.getAttribute("hreflang")));

  // Première visite d'une page anglaise depuis un navigateur en français :
  // on propose directement la version française.
  let saved = null;
  try { saved = localStorage.getItem("yana-lang"); } catch (e) { /* stockage indisponible */ }
  const browserFr = (navigator.language || "").toLowerCase().startsWith("fr");
  if (lang === "en" && !saved && browserFr && toggle) {
    remember("fr");
    location.replace(toggle.getAttribute("href") + location.hash);
    return;
  }
  if (!saved) remember(lang);

  // ---------- Boutons App Store ----------
  const strings = {
    en: { liveSmall: "Download on the", liveNote: "Available on the App Store", liveBtn: "Download" },
    fr: { liveSmall: "Télécharger dans", liveNote: "Disponible sur l'App Store", liveBtn: "Télécharger" },
  };
  if (APP_STORE_URL) {
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
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rotator = document.getElementById("rotator");
  if (rotator && !reduceMotion) {
    const words = (rotator.getAttribute(`data-words-${lang}`) || "").split("|");
    let i = 0;
    if (words.length > 1) {
      setInterval(() => {
        rotator.classList.add("out");
        setTimeout(() => {
          i = (i + 1) % words.length;
          rotator.textContent = words[i];
          rotator.classList.remove("out");
        }, 350);
      }, 2600);
    }
  }

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
