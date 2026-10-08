# Yana_website

Site de [heyyana.com](https://www.heyyana.com), hébergé sur Vercel (site statique, aucune étape de build côté Vercel).

## Modifier une page

Les pages se modifient **uniquement dans `src/`**. Chaque élément porte l'anglais dans le HTML et le français dans `data-fr` (ou `data-fr-href` pour un lien, `data-fr-content` pour une balise meta).

Après chaque modification :

```sh
python3 scripts/build.py
```

Le script régénère `index.html`, `support.html`, `fr/index.html`, `fr/support.html` et `sitemap.xml`, avec les balises SEO (canonical, hreflang, Open Graph) et les données structurées. Commite les fichiers générés avec la source.

## Images

```sh
swift scripts/make-images.swift ../Yana
```

Recrée `assets/figure.avif` et les images de partage `assets/og-en.jpg` / `assets/og-fr.jpg` à partir de `assets/figure.png` et des polices de l'app.

## Lancement sur l'App Store

Colle le lien de la fiche dans `APP_STORE_URL`, en haut de `script.js`.

## Liste de lancement (popup + emails)

La page d'accueil ouvre une popup d'inscription (8 s ou mi-page, une fois par visiteur). Elle appelle `api/subscribe.js`, une fonction Vercel qui ajoute le contact au segment Resend et envoie l'email de bienvenue. La séance offerte (`audio/seance-demo.mp3`, à la racine du site) y sera ajoutée une fois `AUDIO_URL` renseigné en haut de `api/subscribe.js`. Les liens `?ref=tiktok` sont enregistrés dans la propriété `ref` du contact. Le lien de désinscription de l'email pointe vers `api/unsubscribe.js`.

Variables d'environnement Vercel :

| Variable | Valeur |
| --- | --- |
| `RESEND_API_KEY` | clé API Resend (accès complet : contacts + envoi) |
| `RESEND_AUDIENCE_ID` | ID du segment Resend « Yana – Lancement » |
| `RESEND_FROM` | expéditeur sur un domaine vérifié dans Resend, ex. `Yana <bonjour@heyyana.com>` |
| `UNSUBSCRIBE_SECRET` | longue chaîne aléatoire (`openssl rand -base64 32`), ne plus la changer ensuite |
| `SITE_URL` | facultatif, `https://www.heyyana.com` par défaut |
