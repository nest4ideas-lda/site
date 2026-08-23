# Nest4Ideas website

The marketing site for Nest4Ideas, a fully remote accounting and management
practice serving companies across Portugal. The team is split between Madeira
and the mainland, there are no offices, and everything is handled digitally. It
is published at [nest4ideas.com](https://nest4ideas.com/).

The site is plain HTML, CSS and vanilla JavaScript. There is no build step: what
is in [site/](site/) is exactly what is served. Node is used only for formatting
and linting.

## Layout

```
.github/
  dependabot.yml                          keeps the pinned actions fresh
  scripts/check_conventional_commits.py   commit message validator
  workflows/                              lint, deploy, conventional commits
site/                                     everything that gets published
  index.html                              the page, Portuguese, source of truth
  en/index.html                           generated English page, do not edit
  404.html                                not-found page
  site.webmanifest                        installable metadata
  robots.txt, sitemap.xml, CNAME          crawler and domain configuration
  scripts/build-i18n.mjs                  generates en/index.html
  scripts/og-card.html                    source for the social card image
  assets/
    css/style.css                         design tokens and all styling
    fonts/                                self-hosted Inter Variable
    i18n/en.json                          English translations
    img/                                  icons and the social card
    js/main.js                            theme, navigation, scroll reveal
```

## Local development

```sh
cd site
npm install
npm run dev      # serves the folder on http://localhost:4173
```

`npm run dev` uses Python's built-in HTTP server. Any static server works.

Opening `site/index.html` straight from disk also works: the language switch
uses site-absolute paths (`/` and `/en/`), which would point at the filesystem
root under `file://`, so the script rewrites them to the matching files and
skips the stored-language redirect. Serving the folder is still the accurate
way to preview, since that is how the site is deployed.

## Brand

The design tokens in [site/assets/css/style.css](site/assets/css/style.css)
mirror `frontend/src/assets/main.css` in the app repository, so the site and the
product read as one brand. Keep the two in step when either changes.

The brand is gold, `#c9a15c`. It cannot be the light theme primary: against
white it is 2.4:1, well under the 4.5:1 WCAG AA floor. Light mode therefore uses
a deeper shade of the same hue for anything that carries text, and keeps the
gold for decoration. Dark mode uses the gold itself, where it has a dark surface
to sit on.

| Token          | Light                  | Dark                   |
| -------------- | ---------------------- | ---------------------- |
| `--background` | `#f4f4f7`              | `#17171b`              |
| `--foreground` | `#23232a`              | `#f3f3f5`              |
| `--card`       | `#ffffff`              | `#212127`              |
| `--primary`    | `#7a5c26`              | `#c9a15c`              |
| `--secondary`  | `#f7f1e4`              | `#3a2d13`              |
| `--border`     | `rgba(0, 0, 0, 0.09)`  | `rgba(255,255,255,.1)` |

Semantic accents are shared by both themes: info `#2f7fd4`, success `#2f8f4e`,
warning `#c4620f`, danger `#d24a45`. Warning shares a family with the brand
gold, so it leans orange to stay distinguishable.

Radii follow the app: card `12px`, badge `20px`, input `8px`. Typography is
Inter Variable, self-hosted from `assets/fonts` so the page makes no
third-party request to render.

## Theme

Light and dark are both supported. The inline script in `<head>` resolves the
theme before first paint, so the page never flashes the wrong colour scheme.
The choice is stored under `nest4ideas:theme` and the OS preference is followed
only until the visitor picks a theme explicitly. Dark mode is driven by a `dark`
class on `<html>`, the same mechanism the app uses.

## Localization

Portuguese lives in `index.html` and is the source of truth. English is
**pre-rendered** into `site/en/index.html` by
[site/scripts/build-i18n.mjs](site/scripts/build-i18n.mjs), so each language is a
real, indexable URL that arrives fully translated. Nothing is swapped in at
runtime, so English readers never see a flash of Portuguese.

Elements opt in with two attributes, which the generator reads:

```html
<h1 data-i18n="hero.title">Contabilidade que te dá clareza para decidir.</h1>

<button data-i18n-attr="aria-label:a11y.theme; title:a11y.theme">…</button>
```

After editing `index.html` or `assets/i18n/en.json`, regenerate:

```sh
npm run build:i18n
```

The generated file is committed and CI fails if it has drifted. The generator
also fails when a key is used in the markup but missing from `en.json`, or
present in `en.json` but unused, so the two can never fall out of step.

The switcher in the header is two ordinary links, so it works with scripting
disabled. The chosen language is stored under `nest4ideas:locale`, and a small
pre-paint script sends a returning visitor to the page they last read. There is
no automatic redirect based on browser language: `hreflang` tells search engines
which version to serve, and visitors keep control.

Locale codes match the app (`pt-PT`, `en`). To add a language, add
`assets/i18n/<code>.json`, teach the generator the new code, add a link to the
switcher, and add the `hreflang` alternate plus the `sitemap.xml` entry.

Translations are applied with text and attribute assignment only, never raw
markup, so a translation file cannot inject HTML.

### Voice

The Portuguese copy addresses the reader as `tu`, not `você`: *"Contabilidade
que **te** dá clareza"*, *"para **gerires** o teu negócio"*, *"**Fala**
connosco"*. This is deliberate, so keep new copy in the same register. English
has no equivalent distinction and simply uses "you".

## The social card

`assets/img/og-card.png` is the 1200x630 image used by Open Graph and Twitter.
It is generated from [site/scripts/og-card.html](site/scripts/og-card.html); the
regeneration command is in a comment at the top of that file. Regenerate it
whenever the tagline changes.

## Formatting and linting

```sh
cd site
npm run check      # what CI runs: Prettier, ESLint, html-validate
npm run format     # apply Prettier
npm run lint       # apply ESLint fixes
```

## Deployment

Pushing to `main` runs
[.github/workflows/deploy.yml](.github/workflows/deploy.yml), which publishes
`site/` to GitHub Pages. Development files (`node_modules`, `package.json`, the
lint configuration) are excluded from the artifact. The custom domain comes from
`site/CNAME`.

Every action is pinned to a commit SHA. `actions/upload-pages-artifact` calls an
unpinned `actions/upload-artifact` internally, so its steps are inlined in the
workflow instead.

## Before going live

### Placeholders still in the page

- [ ] OCC registration number for the firm, which appears twice: the
      identification card and the footer. Search for `a preencher` and
      `to be added`.

### Values inherited from the mockup, never verified

These are not placeholders, so they will not show up in a search. They were
carried over from the original mockup and nobody has confirmed them:

- [ ] `about.hqValue` reads "Funchal, Madeira". It is labelled *Sede social* /
      *Registered office*, so it has to be the address on file at the
      Conservatória do Registo Comercial, and normally the full street address
      rather than just the city.

### Legal, to confirm with counsel

A Portuguese company selling services is generally expected to publish these.
None of it is legal advice, so have it checked:

- [ ] link to the Livro de Reclamações Eletrónico
- [ ] the alternative dispute resolution entity the firm is bound to
- [ ] full company identification: NIPC, share capital, conservatória do registo
      comercial (Código das Sociedades Comerciais, article 171)
- [ ] a privacy policy, which GDPR article 13 requires as soon as any contact
      form exists

### Worth doing before launch

- [ ] add a real contact form; a `mailto:` link silently fails for anyone
      without a mail client configured
- [ ] fill in the registered office and `sameAs` (LinkedIn) in the JSON-LD block
- [ ] add social proof: client count, years in practice, or testimonials
- [ ] add a photo of the team; the page argues against being anonymous while
      being anonymous
