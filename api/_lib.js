// Outils partagés par les fonctions de api/. Le préfixe « _ » empêche Vercel
// d'en faire une route.

const crypto = require("crypto");

const SITE = (process.env.SITE_URL || "https://www.heyyana.com").replace(/\/$/, "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

// Appel à l'API REST de Resend. Renvoie { status, data } sans lever d'erreur
// sur un statut HTTP ; une seule nouvelle tentative si la limite de débit
// par seconde est atteinte.
async function resend(method, path, body, retried) {
  const res = await fetch("https://api.resend.com" + path, {
    method,
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* réponse vide */ }
  // Seule la limite par seconde vaut un nouvel essai ; un quota journalier ou
  // mensuel épuisé ne se débloquera pas en une seconde.
  if (res.status === 429 && !retried && !/quota/.test(data && data.name)) {
    await new Promise((r) => setTimeout(r, 1100));
    return resend(method, path, body, true);
  }
  return { status: res.status, data };
}

// Jeton de désinscription : HMAC de l'adresse, pour qu'on ne puisse pas
// désinscrire quelqu'un d'autre en devinant l'URL.
function unsubscribeToken(email) {
  return crypto.createHmac("sha256", process.env.UNSUBSCRIBE_SECRET).update(email).digest("base64url");
}

function checkToken(email, token) {
  if (typeof token !== "string" || !isEmail(email)) return false;
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function unsubscribeUrl(email, lang) {
  const q = new URLSearchParams({ email, token: unsubscribeToken(email), lang });
  return `${SITE}/api/unsubscribe?${q}`;
}

module.exports = { SITE, isEmail, resend, unsubscribeUrl, checkToken };
