#!/usr/bin/env python3
"""Génère les pages du site à partir de src/.

    python3 scripts/build.py

Chaque page de src/ porte l'anglais dans le HTML et le français dans les
attributs `data-fr` (contenu), `data-fr-href` (lien) et `data-fr-content`
(balise meta). Le script écrit une page par langue, pour que Google indexe
les deux :

    src/index.html   → index.html        (/)        et fr/index.html   (/fr)
    src/support.html → support.html      (/support) et fr/support.html (/fr/support)

Il ajoute aussi les balises SEO (canonical, hreflang, Open Graph), les données
structurées et sitemap.xml. Ne modifie jamais les fichiers générés : modifie
src/, puis relance le script.
"""

import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

SITE = "https://www.heyyana.com"
ROOT = Path(__file__).resolve().parent.parent
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

# page source → chemin public par langue
PAGES = {
    "index.html": {"en": "/", "fr": "/fr"},
    "support.html": {"en": "/support", "fr": "/fr/support"},
}
OUT = {
    ("index.html", "en"): "index.html",
    ("index.html", "fr"): "fr/index.html",
    ("support.html", "en"): "support.html",
    ("support.html", "fr"): "fr/support.html",
}
LANG = {
    "en": {"locale": "en_US", "other": "fr", "label": "FR", "base": "", "home": "/"},
    "fr": {"locale": "fr_FR", "other": "en", "label": "EN", "base": "/fr", "home": "/fr"},
}
APP_DESCRIPTION = {
    "en": "Yana is a daily manifestation app for iPhone. Two short audio sessions a day, written for your goal: "
          "visualization, personalized affirmations and one small mission.",
    "fr": "Yana est une app de manifestation quotidienne pour iPhone. Deux courtes séances audio par jour, écrites "
          "pour ton objectif : visualisation, affirmations personnalisées et une petite mission.",
}


class Ranges(HTMLParser):
    """Repère le contenu de chaque élément qui porte `data-fr`."""

    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.lines = [0]
        for line in source.splitlines(keepends=True):
            self.lines.append(self.lines[-1] + len(line))
        self.stack, self.found = [], []

    def char_offset(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        inner_start = self.char_offset() + len(self.get_starttag_text())
        self.stack.append((tag, inner_start, dict(attrs).get("data-fr")))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            open_tag, inner_start, fr = self.stack.pop()
            if open_tag == tag:
                if fr is not None:
                    if any(f is not None for _, _, f in self.stack):
                        raise SystemExit(f"data-fr imbriqué dans un autre data-fr (<{tag}>), non pris en charge")
                    self.found.append((inner_start, self.char_offset(), fr))
                return


def translate(source, lang):
    if lang == "fr":
        parser = Ranges(source)
        parser.feed(source)
        for start, end, fr in sorted(parser.found, reverse=True):
            source = source[:start] + fr + source[end:]

        def swap(match, attr, data_attr):
            tag = match.group(0)
            value = re.search(rf'\b{data_attr}="([^"]*)"', tag).group(1)
            return re.sub(rf'\b{attr}="[^"]*"', f'{attr}="{value}"', tag, count=1)

        source = re.sub(r'<[^>]*\bdata-fr-href="[^"]*"[^>]*>', lambda m: swap(m, "href", "data-fr-href"), source)
        source = re.sub(r'<[^>]*\bdata-fr-content="[^"]*"[^>]*>', lambda m: swap(m, "content", "data-fr-content"), source)
    return re.sub(r'\s+data-fr(?:-href|-content)?="[^"]*"', "", source)


def plain(fragment):
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def faq_entities(page):
    items = re.findall(r'<summary[^>]*>(.*?)</summary>\s*<div class="answer">(.*?)</div>', page, flags=re.S)
    return [{"@type": "Question", "name": plain(q),
             "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in items]


def seo_block(page, lang, name):
    url = SITE + PAGES[name][lang]
    title = plain(re.search(r"<title>(.*?)</title>", page, flags=re.S).group(1))
    desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', page).group(1))
    image = f"{SITE}/assets/og-{lang}.jpg"
    other = LANG[lang]["other"]
    e = lambda v: html.escape(v, quote=True)
    return "\n".join([
        '<meta name="theme-color" content="#EEE8F8">',
        f'<link rel="canonical" href="{url}">',
        f'<link rel="alternate" hreflang="en" href="{SITE + PAGES[name]["en"]}">',
        f'<link rel="alternate" hreflang="fr" href="{SITE + PAGES[name]["fr"]}">',
        f'<link rel="alternate" hreflang="x-default" href="{SITE + PAGES[name]["en"]}">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Yana">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:image" content="{image}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:locale" content="{LANG[lang]["locale"]}">',
        f'<meta property="og:locale:alternate" content="{LANG[other]["locale"]}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{e(title)}">',
        f'<meta name="twitter:description" content="{e(desc)}">',
        f'<meta name="twitter:image" content="{image}">',
    ])


def jsonld_block(page, lang, name):
    url = SITE + PAGES[name][lang]
    graph = [
        {"@type": "WebSite", "@id": f"{SITE}/#website", "name": "Yana", "url": SITE + "/", "inLanguage": ["en", "fr"]},
        {"@type": "MobileApplication", "@id": f"{SITE}/#app", "name": "Yana", "operatingSystem": "iOS 17.0+",
         "applicationCategory": "LifestyleApplication", "description": APP_DESCRIPTION[lang],
         "inLanguage": ["en", "fr"], "image": f"{SITE}/assets/icon.png", "url": SITE + PAGES["index.html"][lang]},
    ]
    faq = faq_entities(page)
    if faq:
        graph.append({"@type": "FAQPage", "@id": f"{url}#faq", "inLanguage": lang, "mainEntity": faq})
    data = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1)
    data = data.replace("</", "<\\/")
    return f'<script type="application/ld+json">\n{data}\n</script>'


def build(name, lang):
    source = (ROOT / "src" / name).read_text(encoding="utf-8")
    source = source.replace("<!-- Source : `python3 scripts/build.py` génère index.html, support.html et fr/ à partir de ce fichier. -->\n",
                            f"<!-- Fichier généré par scripts/build.py depuis src/{name} : ne pas modifier ici. -->\n")
    other = LANG[lang]["other"]
    for key, value in {
        "lang": lang, "base": LANG[lang]["base"], "home": LANG[lang]["home"],
        "other_url": PAGES[name][other], "other_lang": other, "other_label": LANG[lang]["label"],
    }.items():
        source = source.replace("{{" + key + "}}", value)
    page = translate(source, lang)
    page = page.replace("{{seo}}", seo_block(page, lang, name)).replace("{{jsonld}}", jsonld_block(page, lang, name))
    leftover = re.findall(r"\{\{\w+\}\}", page)
    if leftover:
        raise SystemExit(f"{name} ({lang}) : marqueurs non remplacés {leftover}")
    out = ROOT / OUT[(name, lang)]
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"✓ {OUT[(name, lang)]}")


def sitemap():
    rows = []
    for urls in PAGES.values():
        for lang in ("en", "fr"):
            alts = "".join(f'\n    <xhtml:link rel="alternate" hreflang="{l}" href="{SITE + urls[l]}"/>' for l in ("en", "fr"))
            alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{SITE + urls["en"]}"/>'
            rows.append(f"  <url>\n    <loc>{SITE + urls[lang]}</loc>{alts}\n  </url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")
    print("✓ sitemap.xml")


if __name__ == "__main__":
    for name in PAGES:
        for lang in ("en", "fr"):
            build(name, lang)
    sitemap()
