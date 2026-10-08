// /api/unsubscribe?email=…&token=…&lang=…
//
// GET  : page de confirmation avec un bouton (les antivirus de messagerie
//        ouvrent les liens des emails ; un simple GET ne doit rien changer).
// POST : désinscrit le contact (bouton de la page, ou désinscription en un
//        clic des clients mail via l'en-tête List-Unsubscribe-Post).

const { SITE, resend, checkToken } = require("./_lib");

const TEXT = {
  fr: {
    title: "Désinscription",
    confirm: "Tu ne recevras plus d'emails de Yana à l'adresse",
    button: "Me désinscrire",
    done: "C'est fait : tu ne recevras plus d'emails de Yana.",
    invalid: "Ce lien de désinscription n'est pas valide. Écris-nous à digest.mtl@gmail.com et on s'en occupe.",
    error: "Une erreur est survenue. Réessaie dans un instant, ou écris-nous à digest.mtl@gmail.com.",
    back: "Retour au site",
  },
  en: {
    title: "Unsubscribe",
    confirm: "You will no longer receive emails from Yana at",
    button: "Unsubscribe me",
    done: "Done: you will no longer receive emails from Yana.",
    invalid: "This unsubscribe link isn't valid. Email us at digest.mtl@gmail.com and we'll take care of it.",
    error: "Something went wrong. Please try again in a moment, or email us at digest.mtl@gmail.com.",
    back: "Back to the site",
  },
};

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(res, status, lang, inner) {
  const t = TEXT[lang];
  res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Robots-Tag", "noindex");
  res.send(`<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t.title} — Yana</title><meta name="robots" content="noindex">
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;
background:linear-gradient(180deg,#EEE8F8 0%,#F5F0FA 45%,#F1EAF6 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1E1B22}
.card{max-width:440px;width:100%;background:rgba(255,255,255,.86);border-radius:22px;padding:36px 32px;box-shadow:0 30px 70px rgba(48,32,60,.16);text-align:center}
.logo{font-family:Georgia,serif;font-size:26px;color:#43215C;margin:0 0 20px}
p{line-height:1.6;color:#4D4652}
button{font:inherit;font-weight:600;background:#1E1B22;color:#fff;border:0;border-radius:999px;padding:14px 26px;cursor:pointer;margin-top:12px}
a{color:#7D5670}
</style></head>
<body><main class="card"><p class="logo">Yana</p>${inner}<p><a href="${SITE}${lang === "fr" ? "/fr" : "/"}">${t.back}</a></p></main></body></html>`);
}

module.exports = async (req, res) => {
  const { email = "", token = "", lang: rawLang } = req.query;
  const lang = rawLang === "fr" ? "fr" : "en";
  const t = TEXT[lang];

  if (!checkToken(email, token)) return page(res, 400, lang, `<p>${t.invalid}</p>`);

  if (req.method === "GET") {
    return page(res, 200, lang, `<p>${t.confirm} <b>${escape(email)}</b>.</p>
<form method="post"><button type="submit">${t.button}</button></form>`);
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }

  const result = await resend("PATCH", "/contacts/" + encodeURIComponent(email), { unsubscribed: true });
  // 404 : le contact a déjà été supprimé de Resend, il ne recevra donc plus rien.
  if (result.status >= 300 && result.status !== 404) {
    console.error("[unsubscribe]", JSON.stringify(result));
    return page(res, 500, lang, `<p>${t.error}</p>`);
  }
  return page(res, 200, lang, `<p>${t.done}</p>`);
};
