// POST /api/subscribe — inscription à la liste « lancement » depuis la popup.
//
// Corps JSON : { email, consent, ref?, lang?, website? }
// - ajoute le contact au segment Resend RESEND_AUDIENCE_ID (propriétés ref et lang) ;
// - envoie l'email de bienvenue avec le lien vers la séance audio offerte
//   et un lien de désinscription.
//
// Réponses : 200 { ok: true } ou { error } avec un code parmi
// invalid_email, consent_required, already_subscribed, server_error.

const { SITE, isEmail, resend, unsubscribeUrl } = require("./_lib");

const AUDIO_URL = `${SITE}/audio/seance-demo.mp3`;

const EMAIL = {
  fr: {
    subject: "Bienvenue chez Yana : ta séance audio offerte",
    hello: "Merci de ton inscription.",
    intro: "Tu seras parmi les premiers prévenus quand Yana arrivera sur l'App Store. En attendant, voici ta séance audio offerte : installe-toi au calme, mets tes écouteurs et laisse-toi guider.",
    button: "Écouter ma séance",
    sign: "Belle séance,<br>L'équipe Yana",
    footer: "Tu reçois cet email parce que tu t'es inscrit·e sur heyyana.com pour être averti·e du lancement de Yana.",
    unsubscribe: "Se désinscrire",
  },
  en: {
    subject: "Welcome to Yana: your free audio session",
    hello: "Thanks for signing up.",
    intro: "You'll be among the first to know when Yana lands on the App Store. In the meantime, here's your free audio session: find a quiet spot, put your headphones on and let it guide you.",
    button: "Listen to my session",
    sign: "Enjoy,<br>The Yana team",
    footer: "You're receiving this email because you signed up on heyyana.com to hear about Yana's launch.",
    unsubscribe: "Unsubscribe",
  },
};

function emailHtml(t, unsubscribe) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F5F0FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E1B22;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0FA;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:22px;padding:36px 32px;">
<tr><td>
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:26px;color:#43215C;">Yana</p>
<p style="margin:0 0 12px;font-size:17px;font-weight:600;">${t.hello}</p>
<p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#4D4652;">${t.intro}</p>
<p style="margin:0 0 28px;"><a href="${AUDIO_URL}" style="display:inline-block;background:#1E1B22;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 26px;border-radius:999px;">${t.button}</a></p>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4D4652;">${t.sign}</p>
</td></tr></table>
<p style="max-width:520px;margin:20px auto 0;font-size:12px;line-height:1.5;color:#8D7F97;">${t.footer}<br><a href="${unsubscribe}" style="color:#7D5670;">${t.unsubscribe}</a></p>
</td></tr></table>
</body></html>`;
}

function emailText(t, unsubscribe) {
  return [t.hello, "", t.intro, "", `${t.button} : ${AUDIO_URL}`, "", t.sign.replace("<br>", "\n"), "",
    "—", t.footer, `${t.unsubscribe} : ${unsubscribe}`].join("\n");
}

async function sendWelcome(email, lang) {
  const t = EMAIL[lang];
  const unsubscribe = unsubscribeUrl(email, lang);
  return resend("POST", "/emails", {
    from: process.env.RESEND_FROM,
    to: [email],
    subject: t.subject,
    html: emailHtml(t, unsubscribe),
    text: emailText(t, unsubscribe),
    headers: {
      // Bouton « Se désinscrire » natif de Gmail / Apple Mail (RFC 8058).
      "List-Unsubscribe": `<${unsubscribe}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const body = typeof req.body === "object" && req.body ? req.body : {};

  // Champ piège invisible : un humain le laisse vide.
  if (body.website) return res.status(200).json({ ok: true });

  const email = String(body.email || "").trim().toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ error: "invalid_email" });
  if (body.consent !== true) return res.status(400).json({ error: "consent_required" });

  const lang = body.lang === "fr" ? "fr" : "en";
  const ref = String(body.ref || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  const segment = process.env.RESEND_AUDIENCE_ID;
  const path = "/contacts/" + encodeURIComponent(email);

  try {
    const existing = await resend("GET", path);

    if (existing.status === 404) {
      const properties = { lang };
      if (ref) properties.ref = ref;
      const created = await resend("POST", "/contacts", {
        email, unsubscribed: false, segments: [{ id: segment }], properties,
      });
      if (created.status >= 300) throw new Error("create contact: " + JSON.stringify(created));
    } else if (existing.status === 200) {
      const segments = await resend("GET", path + "/segments?limit=100");
      const inList = (segments.data && segments.data.data || []).some((s) => s.id === segment);
      if (inList && !existing.data.unsubscribed) {
        return res.status(409).json({ error: "already_subscribed" });
      }
      // Contact connu (désinscrit, ou dans une autre liste) qui redonne son
      // consentement : on le réabonne sans écraser un ref déjà enregistré.
      const update = { unsubscribed: false };
      if (ref && !(existing.data.properties && existing.data.properties.ref)) update.properties = { ref };
      const patched = await resend("PATCH", path, update);
      if (patched.status >= 300) throw new Error("update contact: " + JSON.stringify(patched));
      if (!inList) {
        const added = await resend("POST", `${path}/segments/${segment}`);
        if (added.status >= 300) throw new Error("add to segment: " + JSON.stringify(added));
      }
    } else {
      throw new Error("get contact: " + JSON.stringify(existing));
    }

    const sent = await sendWelcome(email, lang);
    if (sent.status >= 300) throw new Error("send email: " + JSON.stringify(sent));

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[subscribe]", err.message);
    return res.status(500).json({ error: "server_error" });
  }
};
