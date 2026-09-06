/*
 * Generates en/index.html from index.html plus assets/i18n/en.json.
 *
 * Portuguese is the source of truth. Pre-rendering English instead of swapping
 * it in at runtime removes the flash of Portuguese an English reader used to
 * see, drops a network round trip, and gives the translation its own indexable
 * URL for the hreflang cluster.
 *
 * The output is committed, so the deployed site stays a plain static folder.
 * CI regenerates it and fails if the committed copy has drifted.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'node-html-parser'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://nest4ideas.com'
const LANG = 'en'

const source = await readFile(resolve(root, 'index.html'), 'utf8')
const dict = JSON.parse(
  await readFile(resolve(root, `assets/i18n/${LANG}.json`), 'utf8'),
)

const used = new Set()
const missing = []

function lookup(key) {
  used.add(key)
  const value = key
    .split('.')
    .reduce((acc, part) => (acc == null ? acc : acc[part]), dict)
  if (typeof value !== 'string') {
    missing.push(key)
    return null
  }
  return value
}

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, entry]) =>
    typeof entry === 'object' && entry !== null
      ? flatten(entry, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

const doc = parse(source, { comment: true })

for (const el of doc.querySelectorAll('[data-i18n]')) {
  const value = lookup(el.getAttribute('data-i18n'))
  if (value !== null) el.set_content(escapeText(value))
}

for (const el of doc.querySelectorAll('[data-i18n-attr]')) {
  for (const pair of el.getAttribute('data-i18n-attr').split(';')) {
    const separator = pair.indexOf(':')
    if (separator === -1) continue
    const attr = pair.slice(0, separator).trim()
    const value = lookup(pair.slice(separator + 1).trim())
    if (value !== null) el.setAttribute(attr, value)
  }
}

const unused = flatten(dict).filter((key) => !used.has(key))
if (missing.length || unused.length) {
  const lines = [
    missing.length && `Missing from ${LANG}.json: ${missing.join(', ')}`,
    unused.length && `Unused in index.html: ${unused.join(', ')}`,
  ].filter(Boolean)
  throw new Error(`Translation keys are out of sync.\n${lines.join('\n')}`)
}

/* ------------------------------ per-page bits ----------------------------- */

doc.querySelector('html').setAttribute('lang', LANG)
doc.querySelector('link[rel="canonical"]').setAttribute('href', `${ORIGIN}/en/`)
doc
  .querySelector('meta[property="og:url"]')
  .setAttribute('content', `${ORIGIN}/en/`)
doc.querySelector('meta[property="og:locale"]').setAttribute('content', 'en_GB')
doc
  .querySelector('meta[property="og:locale:alternate"]')
  .setAttribute('content', 'pt_PT')

const structuredData = doc.querySelector('script[type="application/ld+json"]')
const schema = JSON.parse(structuredData.textContent)
for (const [index, offer] of schema.makesOffer.entries()) {
  offer.name = dict.services[`s${index + 1}Title`]
}
structuredData.set_content(JSON.stringify(schema))

for (const option of doc.querySelectorAll('.lang-opt')) {
  if (option.getAttribute('data-lang') === LANG) {
    option.setAttribute('aria-current', 'page')
  } else {
    option.removeAttribute('aria-current')
  }
}

// The hint always speaks the language it offers, so this page gets the opposite
// of the source and hands its own wording back through the data-alt-* pair.
const hint = doc.querySelector('#lang-hint')
const hintText = hint.querySelector('.lang-hint-text')
const hintGo = hint.querySelector('.lang-hint-go')
const hintClose = hint.querySelector('.lang-hint-close')

const offered = {
  lang: hint.getAttribute('data-alt-lang'),
  href: hint.getAttribute('data-alt-href'),
  text: hint.getAttribute('data-alt-text'),
  action: hint.getAttribute('data-alt-action'),
  dismiss: hint.getAttribute('data-alt-dismiss'),
}
const current = {
  lang: hintGo.getAttribute('data-lang'),
  href: hintGo.getAttribute('href'),
  text: hintText.textContent.trim(),
  action: hintGo.textContent.trim(),
  dismiss: hintClose.getAttribute('aria-label'),
}

hintText.set_content(escapeText(offered.text))
hintText.setAttribute('lang', offered.lang)
hintGo.set_content(escapeText(offered.action))
hintGo.setAttribute('lang', offered.lang)
hintGo.setAttribute('href', offered.href)
hintGo.setAttribute('data-lang', offered.lang)
hintClose.setAttribute('lang', offered.lang)
hintClose.setAttribute('aria-label', offered.dismiss)
hintClose.setAttribute('title', offered.dismiss)

hint.setAttribute('data-alt-lang', current.lang)
hint.setAttribute('data-alt-href', current.href)
hint.setAttribute('data-alt-text', current.text)
hint.setAttribute('data-alt-action', current.action)
hint.setAttribute('data-alt-dismiss', current.dismiss)

// One directory deeper, so document-relative asset URLs need a level added.
for (const el of doc.querySelectorAll('[href], [src]')) {
  for (const attr of ['href', 'src']) {
    const value = el.getAttribute(attr)
    if (value && /^(assets\/|site\.webmanifest)/.test(value)) {
      el.setAttribute(attr, `../${value}`)
    }
  }
}

// Mirror the pre-paint redirect so each page sends visitors the other way.
const bootstrap = doc.querySelector('head script:not([type])')
bootstrap.set_content(
  bootstrap.textContent.replace(
    /\/\* lang-redirect \*\/[\s\S]*?\/\* end lang-redirect \*\//,
    [
      '/* lang-redirect */',
      "          if (localStorage.getItem('nest4ideas:locale') === 'pt-PT') {",
      "            location.replace('/' + location.hash)",
      '          }',
      '          /* end lang-redirect */',
    ].join('\n'),
  ),
)

/* --------------------------------- output --------------------------------- */

function escapeText(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

const banner = `<!-- Generated by scripts/build-i18n.mjs from ../index.html. Do not edit. -->\n`
await mkdir(resolve(root, 'en'), { recursive: true })
await writeFile(
  resolve(root, 'en/index.html'),
  doc
    .toString()
    .replace(/^(<!doctype html>\s*)/i, `$1${banner}`)
    // The parser serialises alt="" as a bare attribute; keep it explicit.
    .replace(/(<img\b[^>]*?\s)alt(?=[\s/>])/g, '$1alt=""'),
  'utf8',
)

console.log(`en/index.html written (${used.size} keys)`)
