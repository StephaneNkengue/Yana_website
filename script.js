(function () {
  // Le jour où Apple valide l'app, colle ici le lien de la fiche App Store
  // (ex. "https://apps.apple.com/app/id0000000000") : tous les boutons
  // « Bientôt sur l'App Store » deviennent « Télécharger dans l'App Store ».
  const APP_STORE_URL = "";

  const html = document.documentElement;
  const lang = html.getAttribute("lang") === "fr" ? "fr" : "en";

  // ---------- Provenance (?ref=tiktok, ?ref=instagram…) ----------
  // Lue avant la redirection de langue ci-dessous, qui perd la query string,
  // puis jointe à l'inscription de la popup.
  const refParam = new URLSearchParams(location.search).get("ref");
  if (refParam) {
    try { localStorage.setItem("yana-ref", refParam.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40)); } catch (e) { /* stockage indisponible */ }
  }

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

  // ---------- Liste d'attente : formulaires et popup ----------
  // Les formulaires .js-signup-form (hero, bas de page, popup) envoient tous à
  // /api/subscribe. Une fois inscrit, on le retient : la popup ne s'ouvre plus
  // et les formulaires affichent directement leur message de confirmation.
  const msgs = {
    en: {
      placeholder: "your@email.com", close: "Close", sending: "One moment…",
      invalid_email: "That email address doesn't look right.",
      consent_required: "Please tick the box to receive emails from Yana.",
      already_subscribed: "You're already on the list. See you at launch!",
      server_error: "Something went wrong on our end. Please try again in a moment.",
    },
    fr: {
      placeholder: "ton@email.com", close: "Fermer", sending: "Un instant…",
      invalid_email: "Cette adresse email ne semble pas valide.",
      consent_required: "Coche la case pour recevoir les emails de Yana.",
      already_subscribed: "Tu es déjà inscrit·e. À très vite pour le lancement !",
      server_error: "Un souci de notre côté. Réessaie dans un instant.",
    },
  }[lang];

  let subscribed = false;
  try { subscribed = localStorage.getItem("yana-subscribed") === "1"; } catch (e) { /* stockage indisponible */ }

  function showDone(form) {
    form.hidden = true;
    const done = form.parentElement.querySelector(".js-signup-done");
    if (done) done.hidden = false;
  }
  function markSubscribed() {
    subscribed = true;
    try { localStorage.setItem("yana-subscribed", "1"); } catch (e) { /* stockage indisponible */ }
    document.querySelectorAll(".waitlist .js-signup-form").forEach(showDone);
  }

  document.querySelectorAll(".js-signup-form").forEach((form) => {
    const msg = form.querySelector(".signup-msg");
    const submit = form.querySelector('button[type="submit"]');
    form.email.placeholder = msgs.placeholder;
    if (subscribed && form.closest(".waitlist")) { showDone(form); return; }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = msgs.invalid_email; form.email.focus(); return; }
      if (!form.consent.checked) { msg.textContent = msgs.consent_required; form.consent.focus(); return; }

      let ref = "";
      try { ref = localStorage.getItem("yana-ref") || ""; } catch (err) { /* stockage indisponible */ }
      submit.disabled = true;
      msg.textContent = msgs.sending;
      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, consent: true, ref, lang, website: form.website.value }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          msg.textContent = "";
          showDone(form);
          markSubscribed();
        } else {
          msg.textContent = msgs[data.error] || msgs.server_error;
          if (data.error === "already_subscribed") markSubscribed();
        }
      } catch (err) {
        msg.textContent = msgs.server_error;
      } finally {
        submit.disabled = false;
      }
    });
  });

  // Popup (page d'accueil) : carte flottante non bloquante (la page reste
  // utilisable). S'ouvre après 8 s ou à mi-page ; si le visiteur la ferme
  // sans s'inscrire, elle revient 45 s plus tard, 3 fois au plus par visite.
  const signup = document.getElementById("signup");
  if (signup && typeof signup.close === "function" && !subscribed) {
    signup.querySelector(".signup-close").setAttribute("aria-label", msgs.close);

    const REOPEN_DELAY = 45000;
    const MAX_SHOWS = 3;
    let shows = 0;
    let timer;
    function open() {
      clearTimeout(timer);
      window.removeEventListener("scroll", onHalf);
      if (subscribed || signup.open || shows >= MAX_SHOWS) return;
      // Ne pas couper quelqu'un qui remplit déjà un formulaire de la page.
      if (document.activeElement && document.activeElement.closest(".js-signup-form")) {
        timer = setTimeout(open, REOPEN_DELAY);
        return;
      }
      shows += 1;
      // Attribut plutôt que show() : la popup ne prend pas le focus (pas de
      // clavier qui s'ouvre tout seul sur mobile).
      signup.setAttribute("open", "");
    }
    function onHalf() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.5) open();
    }
    timer = setTimeout(open, 8000);
    window.addEventListener("scroll", onHalf, { passive: true });

    signup.querySelectorAll(".js-signup-close").forEach((b) => b.addEventListener("click", () => signup.close()));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && signup.open) signup.close(); });
    signup.addEventListener("close", () => {
      if (!subscribed && shows < MAX_SHOWS) timer = setTimeout(open, REOPEN_DELAY);
    });
  }
})();
