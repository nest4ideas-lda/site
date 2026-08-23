/*
 * Nest4Ideas landing page, lightweight i18n.
 *
 * Portuguese is the canonical copy and ships directly in index.html, so the
 * page is fully readable with no JavaScript and no network request. Choosing
 * English fetches assets/i18n/en.json and swaps text and attributes in place.
 * Missing keys fall back to the Portuguese baseline cached from the DOM.
 *
 * Translation strings are trusted, first-party static assets and are applied
 * with textContent / setAttribute only (never innerHTML), so there is no XSS
 * surface here.
 */
;(function () {
  'use strict'

  var STORAGE_KEY = 'nest4ideas:locale'
  var DEFAULT_LANG = 'pt-PT'

  // Must match the app locales (frontend/src/i18n/locales) and the menu markup.
  var SUPPORTED = ['pt-PT', 'en']

  var dictCache = {}
  var root = document.documentElement

  // Cache the Portuguese baseline straight from the rendered DOM.
  var textTargets = Array.prototype.map.call(
    document.querySelectorAll('[data-i18n]'),
    function (el) {
      return { el: el, key: el.getAttribute('data-i18n'), orig: el.textContent }
    },
  )

  var attrTargets = Array.prototype.map.call(
    document.querySelectorAll('[data-i18n-attr]'),
    function (el) {
      var pairs = el
        .getAttribute('data-i18n-attr')
        .split(';')
        .map(function (raw) {
          var part = raw.trim()
          if (!part) return null
          var idx = part.indexOf(':')
          if (idx === -1) return null
          var attr = part.slice(0, idx).trim()
          return {
            attr: attr,
            key: part.slice(idx + 1).trim(),
            orig: el.getAttribute(attr),
          }
        })
        .filter(Boolean)
      return { el: el, pairs: pairs }
    },
  )

  /**
   * Resolve a dotted key (e.g. "hero.title") against a nested dictionary.
   * @returns {string|null}
   */
  function lookup(dict, key) {
    if (!dict) return null
    var value = key.split('.').reduce(function (acc, part) {
      return acc && typeof acc === 'object' ? acc[part] : undefined
    }, dict)
    return typeof value === 'string' ? value : null
  }

  /**
   * Normalise a language tag to a supported locale, or null when unknown.
   * @returns {string|null}
   */
  function normalise(tag) {
    var wanted = String(tag || '')
      .trim()
      .toLowerCase()
    if (!wanted) return null

    var exact = SUPPORTED.find(function (locale) {
      return locale.toLowerCase() === wanted
    })
    if (exact) return exact

    var base = wanted.split('-')[0]
    return (
      SUPPORTED.find(function (locale) {
        return locale.toLowerCase().split('-')[0] === base
      }) || null
    )
  }

  /**
   * Best-effort match of the browser languages to a supported locale.
   * @returns {string}
   */
  function matchBrowserLang() {
    var tags =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language || DEFAULT_LANG]

    for (var i = 0; i < tags.length; i++) {
      var match = normalise(tags[i])
      if (match) return match
    }
    return DEFAULT_LANG
  }

  /**
   * A ?lang= query parameter wins, so shared links keep their language.
   * @returns {string}
   */
  function initialLang() {
    var fromQuery = normalise(
      new URLSearchParams(window.location.search).get('lang'),
    )
    if (fromQuery) return fromQuery

    var stored = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch (e) {
      /* storage unavailable, fall through to the browser languages */
    }
    return normalise(stored) || matchBrowserLang()
  }

  function loadDict(lang) {
    if (lang === DEFAULT_LANG) return Promise.resolve(null)
    if (dictCache[lang]) return Promise.resolve(dictCache[lang])
    return fetch('assets/i18n/' + lang + '.json', { cache: 'default' })
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status)
        return resp.json()
      })
      .then(function (json) {
        dictCache[lang] = json
        return json
      })
      .catch(function () {
        // Fall back to the baseline silently if a locale file is unavailable.
        return null
      })
  }

  function applyDict(dict) {
    textTargets.forEach(function (t) {
      var value = dict ? lookup(dict, t.key) : null
      t.el.textContent = value != null ? value : t.orig
    })
    attrTargets.forEach(function (t) {
      t.pairs.forEach(function (p) {
        var value = dict ? lookup(dict, p.key) : null
        t.el.setAttribute(p.attr, value != null ? value : p.orig)
      })
    })
  }

  /**
   * Keep the address bar and the canonical link in step with the language, so
   * the page can be shared as displayed and each variant is self-canonical for
   * the hreflang cluster declared in <head>.
   */
  function syncUrl(lang) {
    var canonical = document.querySelector('link[rel="canonical"]')
    var target = 'https://nest4ideas.com/'
    if (lang !== DEFAULT_LANG) target += '?lang=' + lang
    if (canonical) canonical.setAttribute('href', target)

    if (!window.history || !window.history.replaceState) return
    var url = new URL(window.location.href)
    if (lang === DEFAULT_LANG) {
      url.searchParams.delete('lang')
    } else {
      url.searchParams.set('lang', lang)
    }
    window.history.replaceState(null, '', url)
  }

  /* ------------------------------ language menu --------------------------- */

  var toggle = document.getElementById('lang-toggle')
  var menu = document.getElementById('lang-menu')
  var options = menu
    ? Array.prototype.slice.call(menu.querySelectorAll('[data-lang]'))
    : []

  function markSelected(lang) {
    options.forEach(function (option) {
      option.setAttribute(
        'aria-selected',
        String(option.getAttribute('data-lang') === lang),
      )
    })
  }

  function closeMenu() {
    if (!menu || !toggle) return
    menu.hidden = true
    toggle.setAttribute('aria-expanded', 'false')
  }

  function openMenu() {
    if (!menu || !toggle) return
    menu.hidden = false
    toggle.setAttribute('aria-expanded', 'true')
    var selected = options.find(function (option) {
      return option.getAttribute('aria-selected') === 'true'
    })
    ;(selected || options[0]).focus()
  }

  function setLang(lang) {
    var resolved = normalise(lang) || DEFAULT_LANG
    loadDict(resolved).then(function (dict) {
      applyDict(dict)
      root.setAttribute('lang', resolved)
      try {
        localStorage.setItem(STORAGE_KEY, resolved)
      } catch (e) {
        /* storage unavailable, the choice still applies for this session */
      }
      markSelected(resolved)
      syncUrl(resolved)
    })
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      if (menu.hidden) openMenu()
      else closeMenu()
    })

    menu.addEventListener('click', function (event) {
      var option = event.target.closest('[data-lang]')
      if (!option) return
      setLang(option.getAttribute('data-lang'))
      closeMenu()
      toggle.focus()
    })

    menu.addEventListener('keydown', function (event) {
      var index = options.indexOf(document.activeElement)
      if (event.key === 'Escape') {
        closeMenu()
        toggle.focus()
      } else if (event.key === 'ArrowDown' && index > -1) {
        event.preventDefault()
        options[(index + 1) % options.length].focus()
      } else if (event.key === 'ArrowUp' && index > -1) {
        event.preventDefault()
        options[(index - 1 + options.length) % options.length].focus()
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (index > -1) {
          setLang(options[index].getAttribute('data-lang'))
          closeMenu()
          toggle.focus()
        }
      }
    })

    document.addEventListener('click', function (event) {
      if (menu.hidden) return
      if (!menu.contains(event.target) && !toggle.contains(event.target)) {
        closeMenu()
      }
    })
  }

  /* -------------------------------- bootstrap ----------------------------- */

  setLang(initialLang())
})()
