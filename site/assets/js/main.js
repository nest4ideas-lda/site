/*
 * Nest4Ideas landing page behaviour: theme, navigation, scroll reveal.
 *
 * The theme is already resolved by the inline script in <head> so the page
 * never paints in the wrong colour scheme. This file only handles the parts
 * that can wait until the document is parsed.
 */
;(function () {
  'use strict'

  var root = document.documentElement
  var THEME_KEY = 'nest4ideas:theme'

  /* --------------------------------- theme -------------------------------- */

  var themeToggle = document.getElementById('theme-toggle')

  /**
   * Persist and apply the given theme.
   * @param {'light'|'dark'} theme
   */
  function setTheme(theme) {
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch (e) {
      /* storage unavailable, the theme still applies for this session */
    }
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(theme === 'dark'))
    }
  }

  if (themeToggle) {
    themeToggle.setAttribute(
      'aria-pressed',
      String(root.classList.contains('dark')),
    )
    themeToggle.addEventListener('click', function () {
      setTheme(root.classList.contains('dark') ? 'light' : 'dark')
    })
  }

  // Follow the OS only while the visitor has not made an explicit choice.
  var media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', function (event) {
    var stored = null
    try {
      stored = localStorage.getItem(THEME_KEY)
    } catch (e) {
      /* ignore */
    }
    if (!stored) {
      root.classList.toggle('dark', event.matches)
      root.style.colorScheme = event.matches ? 'dark' : 'light'
    }
  })

  /* ------------------------------ mobile nav ------------------------------ */

  var header = document.querySelector('.site-header')
  var navToggle = document.getElementById('nav-toggle')
  var nav = document.getElementById('site-nav')
  var mobileQuery = window.matchMedia('(max-width: 860px)')

  /**
   * Show or hide the collapsed navigation.
   * @param {boolean} open
   */
  function setNav(open) {
    if (!nav || !navToggle) return
    nav.hidden = !open
    navToggle.setAttribute('aria-expanded', String(open))
    // The open panel covers the page, so the page behind it must not scroll.
    document.body.classList.toggle('nav-open', open && mobileQuery.matches)
  }

  /** Collapse the menu on small screens, always show it on large ones. */
  function syncNav() {
    setNav(!mobileQuery.matches)
  }

  if (nav && navToggle) {
    syncNav()
    mobileQuery.addEventListener('change', syncNav)

    navToggle.addEventListener('click', function () {
      setNav(nav.hidden)
    })

    nav.addEventListener('click', function (event) {
      if (mobileQuery.matches && event.target.closest('a')) setNav(false)
    })

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && mobileQuery.matches && !nav.hidden) {
        setNav(false)
        navToggle.focus()
      }
    })

    document.addEventListener('click', function (event) {
      if (!mobileQuery.matches || nav.hidden) return
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
        setNav(false)
      }
    })

    // Rather than trap focus in what is only a disclosure, close the panel as
    // soon as focus leaves it, so nothing is ever focused behind the overlay.
    document.addEventListener('focusin', function (event) {
      if (!mobileQuery.matches || nav.hidden || !header) return
      if (!header.contains(event.target)) setNav(false)
    })
  }

  /* ---------------------------- language choice --------------------------- */

  var LOCALE_KEY = 'nest4ideas:locale'
  var HINT_KEY = 'nest4ideas:locale-hint'
  var langLinks = document.querySelectorAll('[data-lang]')

  /** @returns {string|null} */
  function readStorage(key) {
    try {
      return localStorage.getItem(key)
    } catch (e) {
      return null
    }
  }

  // The switch uses site-absolute paths, which point at the filesystem root
  // when the page is opened as a file rather than served.
  if (location.protocol === 'file:') {
    var onEnglishPage = document.documentElement.lang === 'en'
    var localHref = onEnglishPage
      ? { 'pt-PT': '../index.html', en: 'index.html' }
      : { 'pt-PT': 'index.html', en: 'en/index.html' }
    Array.prototype.forEach.call(langLinks, function (link) {
      link.setAttribute('href', localHref[link.getAttribute('data-lang')])
    })
  }

  Array.prototype.forEach.call(langLinks, function (link) {
    link.addEventListener('click', function () {
      try {
        localStorage.setItem(LOCALE_KEY, link.getAttribute('data-lang'))
      } catch (e) {
        /* storage unavailable, the navigation still happens */
      }
    })
  })

  /* ----------------------------- language hint ---------------------------- */

  var hint = document.getElementById('lang-hint')

  if (hint && !readStorage(LOCALE_KEY) && !readStorage(HINT_KEY)) {
    var wantsPortuguese =
      String(navigator.language || '')
        .toLowerCase()
        .indexOf('pt') === 0
    var readingEnglish = document.documentElement.lang === 'en'

    // Offer the other language only to someone who did not ask for this one.
    if (readingEnglish === wantsPortuguese) hint.hidden = false

    hint
      .querySelector('.lang-hint-close')
      .addEventListener('click', function () {
        hint.hidden = true
        try {
          localStorage.setItem(HINT_KEY, 'dismissed')
        } catch (e) {
          /* storage unavailable, the hint returns on the next visit */
        }
      })
  }

  /* ----------------------------- scroll reveal ---------------------------- */

  var revealTargets = document.querySelectorAll('.reveal')
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(revealTargets, function (el) {
      el.classList.add('in')
    })
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return
          entry.target.classList.add('in')
          revealObserver.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    )
    Array.prototype.forEach.call(revealTargets, function (el) {
      revealObserver.observe(el)
    })
  }

  /* --------------------------- active nav section ------------------------- */

  var navLinks = nav ? nav.querySelectorAll('a[href^="#"]') : []
  var sections = []

  Array.prototype.forEach.call(navLinks, function (link) {
    var target = document.getElementById(link.getAttribute('href').slice(1))
    if (target) sections.push({ link: link, target: target })
  })

  if (sections.length && 'IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var match = sections.find(function (s) {
            return s.target === entry.target
          })
          if (!match) return
          if (entry.isIntersecting) {
            sections.forEach(function (s) {
              s.link.removeAttribute('aria-current')
            })
            match.link.setAttribute('aria-current', 'true')
          }
        })
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )
    sections.forEach(function (s) {
      sectionObserver.observe(s.target)
    })
  }

  /* -------------------------------- footer -------------------------------- */

  var year = document.getElementById('year')
  if (year) year.textContent = String(new Date().getFullYear())
})()
