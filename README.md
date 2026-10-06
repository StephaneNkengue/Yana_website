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
