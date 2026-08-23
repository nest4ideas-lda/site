# Nest4Ideas website

The marketing site for Nest4Ideas, an accounting and management practice based
in Funchal, Madeira. It is published at [nest4ideas.com](https://nest4ideas.com/).

The site is plain HTML, CSS and vanilla JavaScript. There is no build step: what
is in [site/](site/) is exactly what is served. Node is used only for formatting
and linting.

## Layout

```
.github/
  scripts/check_conventional_commits.py   commit message validator
  workflows/                              lint, deploy, conventional commits
site/                                     everything that gets published
  index.html                              the page, Portuguese baseline copy
  site.webmanifest                        installable metadata
  robots.txt, sitemap.xml, CNAME          crawler and domain configuration
  assets/
    css/style.css                         design tokens and all styling
    fonts/                                self-hosted Inter Variable
    i18n/en.json                          English translations
    img/                                  icons, shared with the app
    js/i18n.js                            runtime language switching
    js/main.js                            theme, navigation, scroll reveal
```

## Local development

```sh
cd site
npm install
npm run dev      # serves the folder on http://localhost:4173
```

`npm run dev` uses Python's built-in HTTP server. Any static server works, but
the page must be served over HTTP rather than opened as a `file://` URL,
otherwise `fetch` cannot load the translation files.

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

Portuguese is the canonical copy and ships directly in `index.html`, so the page
is fully readable with JavaScript disabled. English is fetched from
`assets/i18n/en.json` and swapped in at runtime.

Elements opt in with two attributes:

```html
<h1 data-i18n="hero.title">Contabilidade que te dá clareza para decidir.</h1>

<button data-i18n-attr="aria-label:a11y.theme; title:a11y.theme">…</button>
```

Language is resolved in this order: the `?lang=` query parameter, the
`nest4ideas:locale` storage entry, then the browser languages. Selecting a
language updates `<html lang>`, the address bar and the canonical link, so a
copied URL opens in the same language it was read in.

Locale codes match the app (`pt-PT`, `en`). To add a language:

1. Add the code to `SUPPORTED` in
   [site/assets/js/i18n.js](site/assets/js/i18n.js).
2. Add `site/assets/i18n/<code>.json` with the same keys as `en.json`.
3. Add an `<li role="option" data-lang="<code>">` entry to the language menu in
   `index.html`.
4. Add the `hreflang` alternate in `<head>` and the matching entry in
   `sitemap.xml`.

Missing keys fall back to the Portuguese baseline. Translations are applied with
`textContent` and `setAttribute` only, never `innerHTML`, so a translation file
cannot inject markup.

## Formatting and linting

```sh
cd site
npm run check      # what CI runs
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

The page still carries placeholders from the original mockup. Search for
`a preencher` and `to be added` and replace:

- [ ] OCC registration number for the firm
- [ ] CC numbers for both managing partners
- [ ] the full name of the partner shown as `Diana [apelido]`
- [ ] NIPC in the footer
- [ ] phone number in the contact section
- [ ] confirm `geral@nest4ideas.com` is the address that should receive enquiries
- [ ] add a proper Open Graph image, currently the app icon is used
