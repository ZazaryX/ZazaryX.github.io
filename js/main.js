/*! zazary.site runtime | built 2026-11-13 */
const ASSET_V = '20261112c',
    I18N_BASE = 'data/i18n.',
    I18N_BUNDLE = `js/i18n.bundle.min.js?v=${ASSET_V}`,
    LANGS = ['en', 'ru', 'ja', 'zh'],
    LANG_CUR = { en: 'USD', ru: 'RUB', ja: 'JPY', zh: 'CNY' },
    LANG_LABEL = { en: 'EN', ru: 'RU', ja: '日', zh: '中' },
    FX_RATES = { USD: 1, RUB: 85, JPY: 150, CNY: 7.3 },
    $ = (e, t = document) => t.querySelector(e),
    $$ = (e, t = document) => Array.from(t.querySelectorAll(e)),
    reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    safeText = (e) => (null == e ? '' : String(e)),
    mobileHeroVideoAllowed = () => {
        const e = navigator.connection;
        return !reducedMotion() && !e?.saveData && (!e?.effectiveType || !/(^|-)2g$/.test(e.effectiveType));
    },
    whenSettled = (e) =>
        new Promise((t) => {
            const o = () => {
                const o = window.requestIdleCallback;
                'function' == typeof o ? o(() => t(e()), { timeout: 3e3 }) : setTimeout(() => t(e()), 1200);
            };
            'complete' === document.readyState ? o() : window.addEventListener('load', o, { once: !0 });
        }),
    TELEGRAM_HANDLE = 'ZazaryXS',
    BOT_USERNAME = 'zazarymaru_bot',
    // set to the bot webapp origin after deploy (e.g. 'https://mini.example.com');
    // the origin must also be listed in connect-src of the CSP meta
    BRIEF_API_BASE = '',
    // mini app origin for the 'open with data' CTA (e.g. 'https://mini.example.com');
    // empty = the button stays hidden
    MINIAPP_ORIGIN = '',
    storage = {
        get(e) {
            try {
                return window.localStorage.getItem(e);
            } catch (e) {
                return null;
            }
        },
        set(e, t) {
            try {
                return window.localStorage.setItem(e, t);
            } catch (e) {}
        }
    };
function el(e, t = null, o = []) {
    const a = document.createElement(e);
    if (t)
        for (const [e, o] of Object.entries(t))
            if (null != o && !1 !== o)
                if ('class' === e) a.className = o;
                else if ('text' === e) a.textContent = o;
                else if ('html' === e && 'string' == typeof o) a.innerHTML = o;
                else if (e.startsWith('on') && 'function' == typeof o) a.addEventListener(e.slice(2).toLowerCase(), o);
                else if ('dataset' === e && 'object' == typeof o)
                    for (const [e, t] of Object.entries(o)) a.dataset[e] = t;
                else !0 === o ? a.setAttribute(e, '') : a.setAttribute(e, o);
    for (const e of [].concat(o)) null != e && a.appendChild('string' == typeof e ? document.createTextNode(e) : e);
    return a;
}
function iconEl(e = '') {
    return el('i', { class: e, 'aria-hidden': 'true' });
}
function getPath(e, t, o) {
    if (!e || !t) return o;
    const a = Array.isArray(t) ? t : String(t).split('.');
    let i = e;
    for (const e of a) {
        if (null == i) return o;
        i = i[e];
    }
    return null == i ? o : i;
}
const EMAIL_USER = 'zazaryxs',
    EMAIL_DOMAIN = 'gmail.com',
    X_HANDLE = 'ZazaryXS',
    buildEmail = () => 'zazaryxs@gmail.com',
    buildMailto = () => 'mailto:' + buildEmail(),
    state = {
        lang: LANGS.includes(storage.get('zazary.lang')) ? storage.get('zazary.lang') : 'en',
        optimized: !1,
        fxAuto: !1,
        scrollY: 0,
        raf: 0,
        hidden: !1,
        i18n: null,
        sakura: null,
        els: {},
        lastFocus: null,
        currency: storage.get('zazary.cur') || 'RUB',
        experienceSort: 'desc' === storage.get('zazary.experienceSort') ? 'desc' : 'asc',
        portfolioFilter: 'all',
        portfolioTransition: null,
        heroHeight: Math.max(480, screen.height || 900),
        viewportHeight: Math.max(480, screen.height || 900),
        heroReady: null,
        heroVideoReady: !1,
        heroVideoPromise: null,
        heroVideoObjectUrls: [],
        mobileHeroReady: !1,
        mobileHeroPromise: null,
        portfolioImagePromises: [],
        portfolioImagesReady: Promise.resolve([]),
        portfolioVideoPromises: [],
        portfolioVideosReady: Promise.resolve([])
    },
    detailsMotion = new WeakMap();
let revealObserver = null,
    scrollSettleTimer = 0;
const CUR_SYM = { RUB: '₽', USD: '$', JPY: '¥', CNY: '￥' },
    CUR_LEAD = { RUB: !1, USD: !0, JPY: !0, CNY: !0 };
function roundFor(e, t) {
    const o = { RUB: 50, USD: 1, JPY: 10, CNY: 1 }[e] || 50;
    return Math.round(t / o) * o;
}
function normalisePrice(e) {
    if (!e || 'string' != typeof e) return null;
    const t = e.replace(/^(from|от|から|起)\s*/i, ''),
        o = t.match(/(\d[\d\s]*)/);
    if (!o) return null;
    const a = parseInt(o[1].replace(/\s+/g, ''), 10);
    if (!a) return null;
    const i = t.toLowerCase();
    let n;
    return (
        (n = /₽|руб|rub/.test(i)
            ? 'RUB'
            : /\$|usd/.test(i)
              ? 'USD'
              : /¥|jpy/.test(i)
                ? 'JPY'
                : /￥|cny/.test(i)
                  ? 'CNY'
                  : 'RUB'),
        { num: a, srcCur: n }
    );
}
function formatPrice(e, t, o) {
    const a = normalisePrice(e);
    if (!a) return '';
    const i = roundFor(t, (a.num / FX_RATES[a.srcCur]) * FX_RATES[t]),
        n = new Intl.NumberFormat(o.htmlLang || state.lang, { maximumFractionDigits: 0 }).format(i);
    return CUR_LEAD[t] ? CUR_SYM[t] + n : n + ' ' + CUR_SYM[t];
}
function priceParts(e) {
    const t = (e.faq && e.faq.price && e.faq.price.from) || 'from {p}',
        o = t.indexOf('{p}');
    return o < 0 ? { before: t, after: '' } : { before: t.slice(0, o), after: t.slice(o + 3) };
}
let i18nBundlePromise = null;
function loadI18nBundle() {
    return globalThis.ZAZARY_I18N
        ? Promise.resolve(globalThis.ZAZARY_I18N)
        : (i18nBundlePromise ||
              (i18nBundlePromise = new Promise((e, t) => {
                  const o = document.createElement('script');
                  ((o.src = I18N_BUNDLE),
                      (o.defer = !0),
                      (o.onload = () =>
                          globalThis.ZAZARY_I18N
                              ? e(globalThis.ZAZARY_I18N)
                              : t(new Error('bundled i18n data is empty'))),
                      (o.onerror = () => t(new Error('bundled i18n data failed to load'))),
                      document.head.appendChild(o));
              }).catch((e) => {
                  throw ((i18nBundlePromise = null), e);
              })),
          i18nBundlePromise);
}
async function loadI18n(e) {
    if ((LANGS.includes(e) || (e = 'en'), 'file:' === location.protocol)) {
        const t = await loadI18nBundle();
        if (!t[e]) throw new Error('bundled i18n language is missing: ' + e);
        return t[e];
    }
    const t = ASSET_V;
    try {
        const o = await fetch(I18N_BASE + e + '.json?v=' + t);
        if (!o.ok) throw new Error('i18n fetch failed: ' + o.status);
        const r = await o.json();
        try { storage.set('zazary.i18n.' + e, JSON.stringify({ v: t, data: r })); } catch (e) {}
        return r;
    } catch (t) {
        try {
            const c = JSON.parse(storage.get('zazary.i18n.' + e) || 'null');
            if (c && c.v === t && c.data) return c.data;
        } catch (e) {}
        const o = await loadI18nBundle();
        if (!o[e]) throw t;
        return o[e];
    }
}
function applyStaticI18n(e) {
    ($$('[data-i18n]').forEach((t) => {
        const o = getPath(e, t.dataset.i18n, null);
        null != o && (t.textContent = o);
    }),
        $$('[data-i18n-placeholder]').forEach((t) => {
            const o = getPath(e, t.dataset.i18nPlaceholder, null);
            null != o && t.setAttribute('placeholder', o);
        }),
        $$('[data-i18n-aria]').forEach((t) => {
            const o = getPath(e, t.dataset.i18nAria, null);
            null != o && t.setAttribute('aria-label', o);
        }),
        $$('[data-i18n-title]').forEach((t) => {
            const o = getPath(e, t.dataset.i18nTitle, null);
            null != o && t.setAttribute('title', o);
        }));
    const t = getPath(e, 'a11y.openProject', null);
    (t &&
        $$('.folio-hit[data-open]').forEach((o) => {
            const a = getPath(e, `projects.${o.dataset.open}.title`, null);
            null != a && o.setAttribute('aria-label', t.replace('{title}', a));
        }),
        (document.documentElement.lang = e.htmlLang || state.lang),
        document.body.classList.toggle('lang-en', 'en' === state.lang),
        document.body.classList.toggle('lang-ru', 'ru' === state.lang));
}
function renderValueGrid(e) {
    const t = $('#valueGrid');
    t &&
        (t.replaceChildren(),
        (e.value.items || []).forEach((e) => {
            const o = [];
            (e.icon && o.push(iconEl(e.icon)),
                o.push(el('h3', { text: e.t })),
                t.appendChild(
                    el('article', { class: 'value-card reveal' }, [
                        el('div', { class: 'value-card-head' }, o),
                        el('p', { text: e.b })
                    ])
                ));
        }));
}
function renderUses(e) {
    const t = $('#useGrid');
    t &&
        (t.replaceChildren(),
        Object.entries(e.uses).forEach(([e, o]) => {
            if ('lead' === e) return;
            const a = o.icons || {},
                i = el(
                    'ul',
                    null,
                    (o.items || []).map((e) => {
                        const t = a[e];
                        return t ? el('li', null, [iconEl(t), el('span', { text: e })]) : el('li', { text: e });
                    })
                ),
                n = [];
            (o.icon && n.push(iconEl(o.icon)),
                n.push(el('h3', { text: o.h })),
                t.appendChild(
                    el('article', { class: 'use-group reveal' }, [el('div', { class: 'use-group-head' }, n), i])
                ));
        }));
}
function renderSkills(e) {
    const t = $('#skillGroups');
    if (!t) return;
    t.replaceChildren();
    const o = {
        languages: [
            { skill: 'cpp', icon: 'fa-solid fa-memory', name: 'C++' },
            { skill: 'csharp', icon: 'fa-brands fa-microsoft', name: 'C#' },
            { skill: 'python', icon: 'fa-brands fa-python', name: 'Python' },
            { skill: 'asm', icon: 'fa-solid fa-terminal', name: 'NASM / Assembly' },
            { skill: 'html', icon: 'fa-solid fa-layer-group', name: 'HTML / JS' }
        ],
        systems: [
            { skill: 'winapi', icon: 'fa-solid fa-window-maximize', name: 'WinAPI' },
            { skill: 'ida', icon: 'fa-solid fa-magnifying-glass-chart', name: 'IDA Pro' },
            { skill: 'cheatengine', icon: 'fa-solid fa-wrench', name: 'Cheat Engine' },
            { skill: 'imgui', icon: 'fa-solid fa-robot', name: 'imgui / Selenium' }
        ],
        realtime: [
            { skill: 'opengl', icon: 'fa-solid fa-cubes', name: 'OpenGL / GLSL' },
            { skill: 'unity', icon: 'fa-brands fa-unity', name: 'Unity' }
        ],
        image: [
            { skill: 'photoshop', icon: 'fa-solid fa-image', name: 'Photoshop' },
            { skill: 'clipstudio', icon: 'fa-solid fa-palette', name: 'Clip Studio Paint' },
            { skill: 'design', icon: 'fa-solid fa-pen-nib', name: 'Design & GFX' }
        ],
        motion: [
            { skill: 'blender', icon: 'fa-solid fa-shapes', name: 'Blender / Goo Engine' },
            { skill: 'aftereffects', icon: 'fa-solid fa-photo-film', name: 'After Effects' },
            { skill: 'animation', icon: 'fa-solid fa-film', name: '2D, 3D & Live2D' }
        ]
    };
    for (const [a, i] of Object.entries(o)) {
        const o = el('h3', { class: 'skill-group-title', text: e.skillGroups[a] || a }),
            n = el(
                'div',
                { class: 'skills' },
                i.map((t) =>
                    el('article', { class: 'skill-card reveal', 'data-skill': t.skill }, [
                        iconEl(t.icon),
                        el('h3', { text: t.name }),
                        el('p', { text: getPath(e, ['skillCopy', t.skill], '') })
                    ])
                )
            );
        t.appendChild(el('div', { class: 'skill-group' }, [o, n]));
    }
}
function renderTimeline(e) {
    const t = $('#timeline');
    if (!t) return;
    t.replaceChildren();
    const o = [
            'csharp',
            'unity',
            'blender',
            'cpp',
            'reverse',
            'opengl',
            'design',
            'animation',
            'drawing',
            'website',
            'northmine',
            'live2d',
            'maya',
            'ta',
            'noxyrium'
        ],
        a = 'desc' === state.experienceSort ? o.slice().reverse() : o.slice();
    let i = 0;
    (a.forEach((o) => {
        const a = e.experience[o],
            n = getPath(e, ['experienceHtml', o], '');
        if (!a || !n) return;
        const r = el('article', { class: 'timeline-item', 'data-exp': o }, [
            el('div', { class: 'timeline-date', text: a.date }),
            el('h3', { class: 'timeline-title', text: a.title }),
            el('div', { class: 'timeline-content', html: n })
        ]);
        (t.appendChild(r), i++);
    }),
        updateExperienceMeta(e, i));
}
function updateExperienceMeta(e, t) {
    const o = $('#expSummaryRange'),
        a = $('#expSummaryMeta'),
        i = $('#experienceCollapse');
    if (!o && !a) return;
    const n = state.i18n || e,
        r = [
            'csharp',
            'unity',
            'blender',
            'cpp',
            'reverse',
            'opengl',
            'design',
            'animation',
            'drawing',
            'website',
            'northmine',
            'live2d',
            'maya',
            'ta',
            'noxyrium'
        ]
            .map((t) => e.experience[t]?.date || '')
            .flatMap((e) => e.match(/\d{4}/g) || [])
            .map(Number)
            .filter((e) => e > 1990 && e < 2100);
    if ((o && (o.textContent = r.length ? Math.min(...r) + ' — ' + Math.max(...r) : ''), a && i)) {
        const e = i.open ? n.experienceExpanded || 'collapse' : n.experienceCollapsed || 'tap to expand';
        a.textContent = e;
    }
}
function bindCollapseChromeRefresh(e) {
    if (!e || e.dataset.chromeRefreshBound) return;
    e.dataset.chromeRefreshBound = '1';
    const t = (t) => {
        t.target === e && updateChrome();
    };
    (e.addEventListener('transitionend', t),
        e.addEventListener('transitioncancel', t),
        e.addEventListener('animationend', t),
        e.addEventListener('animationcancel', t));
}
function measureClosedDetailsHeight(e, t) {
    const o = getComputedStyle(e),
        a = (parseFloat(o.borderTopWidth) || 0) + (parseFloat(o.borderBottomWidth) || 0);
    return t.getBoundingClientRect().height + a;
}
function animateDetailsHeight(e, t, o, a) {
    let i = detailsMotion.get(e);
    i || ((i = { animation: null, targetOpen: null, timer: 0, run: 0 }), detailsMotion.set(e, i));
    const n = e.getBoundingClientRect().height,
        r = ++i.run;
    (clearTimeout(i.timer),
        i.animation && ((i.animation.onfinish = null), i.animation.cancel()),
        (i.animation = null),
        o && (e.open = !0),
        e.classList.toggle('is-opening', o),
        e.classList.toggle('is-closing', !o),
        e.style.removeProperty('height'),
        e.style.removeProperty('overflow'));
    const s = o ? e.getBoundingClientRect().height : measureClosedDetailsHeight(e, t),
        l = o ? a.openDuration : a.closeDuration;
    ((e.style.height = `${n}px`),
        (e.style.overflow = 'hidden'),
        (e.dataset.animating = o ? 'opening' : 'closing'),
        (i.targetOpen = o));
    const c = (t) => {
        i.run === r &&
            i.animation === t &&
            (clearTimeout(i.timer),
            o || (e.open = !1),
            e.classList.remove('is-opening', 'is-closing'),
            e.style.removeProperty('height'),
            e.style.removeProperty('overflow'),
            delete e.dataset.animating,
            (i.animation = null),
            (i.targetOpen = null),
            (t.onfinish = null),
            t.cancel(),
            a.onSettled?.(o),
            updateChrome());
    };
    if (Math.abs(s - n) < 1)
        return (
            o || (e.open = !1),
            e.classList.remove('is-opening', 'is-closing'),
            e.style.removeProperty('height'),
            e.style.removeProperty('overflow'),
            delete e.dataset.animating,
            (i.targetOpen = null),
            void a.onSettled?.(o)
        );
    const d = e.animate([{ height: `${n}px` }, { height: `${s}px` }], {
        duration: l,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'forwards'
    });
    ((d.id = a.id), (i.animation = d), (d.onfinish = () => c(d)), (i.timer = setTimeout(() => c(d), l + 600)));
}
function bindExperienceCollapse() {
    const e = $('#experienceCollapse');
    if (!e || e.dataset.collapseBound) return;
    const t = $('.experience-summary', e);
    t &&
        ((e.dataset.collapseBound = '1'),
        bindCollapseChromeRefresh($('.experience-container', e)),
        t.addEventListener('click', (o) => {
            if (o.defaultPrevented || o.target.closest('#expSortBtn')) return;
            if (reducedMotion() || state.optimized || 'function' != typeof e.animate) return;
            o.preventDefault();
            const a = detailsMotion.get(e),
                i = null == a?.targetOpen ? e.open : a.targetOpen;
            animateDetailsHeight(e, t, !i, {
                id: 'experience-collapse',
                openDuration: 520,
                closeDuration: 440,
                onSettled: () => {
                    state.i18n && updateExperienceMeta(state.i18n, $$('#timeline .timeline-item').length);
                }
            });
        }),
        e.addEventListener('toggle', () => {
            (state.i18n && updateExperienceMeta(state.i18n, $$('#timeline .timeline-item').length), updateChrome());
        }));
}
function bindFaqCollapse() {
    $$('#faqList .faq-item').forEach((e) => {
        if (e.dataset.collapseBound) return;
        const t = $('summary', e);
        t &&
            ((e.dataset.collapseBound = '1'),
            bindCollapseChromeRefresh($('.faq-answer', e)),
            t.addEventListener('click', (o) => {
                if (reducedMotion() || state.optimized || 'function' != typeof e.animate) return;
                o.preventDefault();
                const a = detailsMotion.get(e),
                    i = null == a?.targetOpen ? e.open : a.targetOpen;
                animateDetailsHeight(e, t, !i, { id: 'faq-collapse', openDuration: 380, closeDuration: 320 });
            }),
            e.addEventListener('toggle', updateChrome));
    });
}
function bindExperienceSort() {
    const e = $('#expSortBtn');
    e &&
        (e.dataset.sortBound ||
            ((e.dataset.sortBound = '1'),
            e.addEventListener('click', (e) => {
                (e.preventDefault(),
                    e.stopPropagation(),
                    'asc' === state.experienceSort ? (state.experienceSort = 'desc') : (state.experienceSort = 'asc'),
                    storage.set('zazary.experienceSort', state.experienceSort),
                    syncExperienceSortUi(),
                    state.i18n && (renderTimeline(state.i18n), initReveal()),
                    requestAnimationFrame(syncExpSortBtn));
            })),
        bindExpSortSync(),
        syncExperienceSortUi());
}
function syncExpSortBtn() {
    const e = $('#experienceHead'),
        t = $('#expSortSlot'),
        o = $('#expSortBtn');
    if (!e || !t || !o) return;
    const a = e.getBoundingClientRect(),
        i = t.getBoundingClientRect();
    (i.width || i.height) &&
        ((o.style.top = i.top - a.top + (i.height - o.offsetHeight) / 2 + 'px'),
        (o.style.left = i.left - a.left + (i.width - o.offsetWidth) / 2 + 'px'));
}
function bindExpSortSync() {
    if (window.__expSortSyncBound) return;
    window.__expSortSyncBound = !0;
    let e = 0;
    const t = () => {
        (cancelAnimationFrame(e), (e = requestAnimationFrame(syncExpSortBtn)));
    };
    (window.addEventListener('resize', t, { passive: !0 }),
        window.addEventListener('scrollend', t, { passive: !0 }),
        document.addEventListener('zazary:lang', t));
    const o = $('#experienceCollapse');
    (o?.addEventListener('toggle', t),
        document.fonts?.ready && document.fonts.ready.then(t),
        Promise.resolve(state.heroReady).then(t),
        t());
}
function syncExperienceSortUi() {
    const e = $('#expSortBtn');
    if (e && (e.setAttribute('aria-pressed', 'desc' === state.experienceSort ? 'true' : 'false'), state.i18n)) {
        const t = state.i18n,
            o = 'desc' === state.experienceSort ? t.sortAsc || 'oldest first' : t.sortDesc || 'newest first';
        ((e.title = t.experienceSortLabel || 'Toggle order'), e.setAttribute('aria-label', o));
    }
}
function renderFaq(e) {
    const t = $('#faqList');
    t &&
        (t.replaceChildren(),
        (e.faq.items || []).forEach((e) => {
            const o = el('details', { class: 'faq-item', 'data-faq': '' }, [
                el('summary', { text: e.q }),
                el('div', { class: 'faq-answer' }, [el('p', { text: e.a })])
            ]);
            t.appendChild(o);
        }));
}
function renderPrice(e) {
    const t = $('#priceGrid');
    if (!t) return;
    const o = e.faq && e.faq.price;
    if (!o) return;
    t.replaceChildren();
    ([
        { key: 'design', klass: 'price-design' },
        { key: 'threeD', klass: 'price-3d' },
        { key: 'dev', klass: 'price-dev' },
        { key: 'reverse', klass: 'price-reverse' }
    ].forEach((a) => {
        const i = o[a.key];
        if (!i) return;
        const n = el('article', { class: 'price-card reveal', 'data-kanji': i.kanji || '' }, [
            el('div', { class: 'price-head' }, [
                i.kanji ? el('span', { class: 'price-kanji', 'aria-hidden': 'true', text: i.kanji }) : null,
                el('h3', { class: 'price-title', text: i.title })
            ]),
            i.note ? el('p', { class: 'price-note', text: i.note }) : null,
            el(
                'ul',
                { class: 'price-list' },
                (i.items || []).map((t) => {
                    const o = formatPrice(t.price, state.currency, e),
                        { before: a, after: i } = priceParts(e);
                    return el('li', { class: 'price-item' }, [
                        el('span', { class: 'price-bullet', 'aria-hidden': 'true', text: '✦' }),
                        el('span', { class: 'price-name', text: t.name }),
                        el('span', { class: 'price-sep', 'aria-hidden': 'true' }),
                        el('span', { class: 'price-value' }, [
                            el('span', { class: 'price-from', text: a }),
                            el('span', { class: 'price-num', text: o }),
                            el('span', { class: 'price-cur', text: i })
                        ])
                    ]);
                })
            )
        ]);
        t.appendChild(n);
    }),
        renderPriceTerms(e));
}
function renderPriceTerms(e) {
    const t = $('#priceTerms'),
        o = e.faq?.price?.terms;
    if (!t || !o) return;
    const a = (o.items || []).map((e) =>
            el('li', { class: 'price-term' }, [
                el('span', { class: 'price-term-t', text: e.t }),
                el('span', { class: 'price-term-b', text: e.b })
            ])
        ),
        i = e.brief
            ? el('button', {
                  type: 'button',
                  class: 'price-terms-link',
                  'data-brief-open': !0,
                  'aria-haspopup': 'dialog',
                  'aria-controls': 'briefModal',
                  text: e.brief.title || ''
              })
            : null;
    t.replaceChildren(
        el('h3', { class: 'price-terms-title', text: o.title || '' }),
        el('ul', { class: 'price-terms-list' }, a),
        i
    );
}
function wipBandData() {
    const e = $('#folioWipBlock');
    return e ? { block: e, items: $$('.portfolio-card', e) } : null;
}
function wipBandOpen() {
    return '1' === storage.get('zazary.wipOpen');
}
const blockMotion = new WeakMap();
function animateBlockHeight(e, t, o) {
    let a = blockMotion.get(e);
    a || ((a = { animation: null, targetOpen: null, timer: 0, run: 0 }), blockMotion.set(e, a));
    const i = e.getBoundingClientRect().height,
        n = ++a.run;
    (clearTimeout(a.timer),
        a.animation && ((a.animation.onfinish = null), a.animation.cancel()),
        (a.animation = null),
        o.beforeMeasure?.(t),
        e.style.removeProperty('height'));
    const r = e.getBoundingClientRect().height,
        s = t ? r : 0,
        l = t ? o.openDuration : o.closeDuration;
    ((e.style.overflow = 'hidden'),
        (e.style.height = `${i}px`),
        (e.dataset.animating = t ? 'opening' : 'closing'),
        (a.targetOpen = t));
    const c = (i) => {
        a.run !== n ||
            (i && a.animation !== i) ||
            (clearTimeout(a.timer),
            e.classList.remove('is-opening', 'is-closing'),
            e.style.removeProperty('height'),
            e.style.removeProperty('overflow'),
            delete e.dataset.animating,
            (a.animation = null),
            (a.targetOpen = null),
            i?.cancel(),
            o.onSettled?.(t),
            updateChrome());
    };
    if (Math.abs(s - i) < 1) return void c(null);
    const d = e.animate([{ height: `${i}px` }, { height: `${s}px` }], {
        duration: l,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'forwards'
    });
    ((d.id = o.id), (a.animation = d), (d.onfinish = () => c(d)), (a.timer = setTimeout(() => c(d), l + 600)));
}
function setWipBandOpen(e, t = {}) {
    const o = wipBandData();
    if (!o) return;
    const { block: a } = o,
        i = a.querySelector('.folio-wip-toggle');
    if (i) {
        i.setAttribute('aria-expanded', e ? 'true' : 'false');
        const t = state.i18n?.portfolio || {};
        i.textContent = e ? t.wipHide || '' : t.wipShow || '';
    }
    const n = a.querySelector('.portfolio-grid');
    t.animate && n && !reducedMotion() && !state.optimized && 'function' == typeof n.animate
        ? animateBlockHeight(n, e, {
              id: 'wip-band',
              openDuration: 520,
              closeDuration: 440,
              beforeMeasure: () => a.classList.remove('is-collapsed'),
              onSettled: (e) => a.classList.toggle('is-collapsed', !e)
          })
        : a.classList.toggle('is-collapsed', !e);
}
function renderWipBand(e) {
    const t = wipBandData();
    if (!t || !t.items.length) return;
    const { block: o, items: a } = t;
    let i = o.querySelector('.folio-wip-band');
    if (!i) {
        i = el('div', { class: 'folio-wip-band' });
        const e = o.querySelector('.portfolio-grid');
        o.insertBefore(i, e || null);
    }
    const n = e.portfolio || {},
        r = wipBandOpen();
    (i.replaceChildren(
        el('p', { class: 'folio-wip-count', text: (n.wipSummary || '{n}').replace('{n}', String(a.length)) }),
        el('button', {
            type: 'button',
            class: 'folio-wip-toggle',
            'aria-expanded': r ? 'true' : 'false',
            text: r ? n.wipHide || '' : n.wipShow || ''
        })
    ),
        o.classList.toggle('is-collapsed', !r),
        a.forEach((e, t) => e.style.setProperty('--wip-i', String(t))),
        o.dataset.wipBound ||
            ((o.dataset.wipBound = '1'),
            o.addEventListener('click', (e) => {
                if (!e.target.closest('.folio-wip-toggle')) return;
                const t = o.classList.contains('is-collapsed');
                (setWipBandOpen(t, { animate: !0 }), storage.set('zazary.wipOpen', t ? '1' : '0'));
            })));
}
const BRIEF_GROUPS = [
        { key: 'task', options: 'taskOptions', label: 'taskLabel', multi: !1, bot: 'need' },
        { key: 'motion', options: 'motionOptions', label: 'motionLabel', multi: !1, bot: 'type' },
        { key: 'cast', options: 'castOptions', label: 'castLabel', multi: !1, bot: 'cast' },
        { key: 'style', options: 'styleOptions', label: 'styleLabel', multi: !1, bot: 'mood' },
        { key: 'place', options: 'placeOptions', label: 'placeLabel', multi: !1, bot: 'platform' },
        { key: 'deadline', options: 'deadlineOptions', label: 'deadlineLabel', multi: !1, bot: 'deadline' },
        { key: 'budget', options: 'budgetOptions', label: 'budgetLabel', multi: !1, bot: 'budget' },
        { key: 'pay', options: 'payOptions', label: 'payLabel', multi: !1, bot: 'pay' },
        { key: 'have', options: 'haveOptions', label: 'haveLabel', multi: !0, bot: 'have' },
        { key: 'deliver', options: 'deliverOptions', label: 'deliverLabel', multi: !0, bot: 'deliver' }
    ],
    briefPicks = {
        task: '',
        motion: '',
        cast: '',
        style: '',
        place: '',
        deadline: '',
        budget: '',
        have: [],
        deliver: []
    };
function briefText(e) {
    // машиночитаемый формат бота: ZMR-BRIEF + ключ: значение (парсится сразу в заявку)
    const o = [];
    BRIEF_GROUPS.forEach((g) => {
        const a = g.multi ? briefPicks[g.key].join(', ') : briefPicks[g.key];
        a && o.push(`${g.bot || g.key}: ${a}`);
    });
    const a = ($('#briefNotes')?.value || '').trim();
    a && o.push(`extra: ${a}`);
    const i = ($('#briefLink')?.value || '').trim();
    i && o.push(`refs: ${i}`);
    const lang = document.documentElement.lang || 'ru';
    return ['ZMR-BRIEF', `lang: ${lang}`, ...o].filter(Boolean).join('\n');
}
function collectBriefPicks(e) {
    (BRIEF_GROUPS.forEach((t) => {
        const o = $$(`[name="brief-${t.key}"]:checked`, e).map((e) => e.value);
        briefPicks[t.key] = t.multi ? o : o[0] || '';
    }),
        $$('.brief-opt', e).forEach((e) => {
            const t = e.querySelector('input');
            t && e.classList.toggle('is-on', t.checked);
        }));
}
function updateBriefPreview(e) {
    const t = $('#briefPreview');
    if (!t) return;
    t.value = briefText(e);
    const o = $('#briefForm .brief-cta');
    o && o.classList.toggle('is-waiting', !briefPicks.task);
    const link = $('#briefMiniappLink');
    if (!link) return;
    if (!MINIAPP_ORIGIN) { link.hidden = !0; return; }
    const params = new URLSearchParams();
    params.set('lang', document.documentElement.lang || 'ru');
    params.set('screen', 'brief');
    BRIEF_GROUPS.forEach((g) => {
        const a = g.multi ? briefPicks[g.key].join(', ') : briefPicks[g.key];
        if (a) params.set(g.bot || g.key, a.slice(0, 120));
    });
    const notes = ($('#briefNotes')?.value || '').trim();
    notes && params.set('extra', notes.slice(0, 200));
    const ref = ($('#briefLink')?.value || '').trim();
    ref && params.set('refs', ref.slice(0, 200));
    link.href = MINIAPP_ORIGIN.replace(/\/$/, '') + '/?' + params.toString();
    link.hidden = !1;
}
function renderBrief(e) {
    const t = $('#brief'),
        o = $('#briefForm');
    if (!t || !o || !e.brief) return;
    if (
        (BRIEF_GROUPS.forEach((t) => {
            const a = o.querySelector(`[data-group="${t.key}"] .brief-options`);
            if (!a) return;
            const i = e.brief[t.options] || [];
            a.replaceChildren(
                ...i.map((e, o) => {
                    const a = `brief-${t.key}-${o}`,
                        i = el('input', {
                            type: t.multi ? 'checkbox' : 'radio',
                            name: `brief-${t.key}`,
                            id: a,
                            value: e
                        });
                    return (
                        (t.multi ? briefPicks[t.key].includes(e) : briefPicks[t.key] === e) && (i.checked = !0),
                        el('label', { class: 'brief-opt', for: a }, [
                            i,
                            el('span', { class: 'brief-opt-text', text: e })
                        ])
                    );
                })
            );
        }),
        collectBriefPicks(o),
        updateBriefPreview(e),
        o.dataset.briefBound)
    )
        return;
    o.dataset.briefBound = '1';
    const a = () => {
        (collectBriefPicks(o), updateBriefPreview(state.i18n));
    };
    (o.addEventListener('change', a),
        o.addEventListener('input', (e) => {
            ('briefNotes' !== e.target.id && 'briefLink' !== e.target.id) || updateBriefPreview(state.i18n);
        }),
        o.addEventListener('submit', async (e) => {
            e.preventDefault();
            const t = $('#briefWarn');
            if (!briefPicks.task)
                return (
                    t && ((t.textContent = state.i18n?.brief?.needTask || ''), (t.hidden = !1)),
                    void o.querySelector('[name="brief-task"]')?.focus()
                );
            t && (t.hidden = !0);
            if (BRIEF_API_BASE && tgLogin) {
                // autonomous: the brief goes straight to the bot api as a ticket
                const c = o.querySelector('.brief-cta');
                c?.classList.add('is-waiting');
                try {
                    const r = await fetch(BRIEF_API_BASE + '/api/site/tickets', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            login: tgLogin,
                            lang: state.lang || 'en',
                            request_id: window.crypto?.randomUUID?.() || null,
                            contact_ok: !!$('#briefContactOk')?.checked,
                            brief: { text: briefText(state.i18n), budget: briefPicks.budget || '' }
                        })
                    });
                    const body = await r.json().catch(() => ({}));
                    if (!r.ok) throw new Error(body.error || r.status);
                    t && ((t.textContent = `✓ ${body.ticket?.ticket_code || ''} — ${state.i18n?.brief?.sentOk || ''}`), (t.hidden = !1));
                    o.reset();
                    requestAnimationFrame(() => a());
                } catch (e) {
                    t && ((t.textContent = state.i18n?.brief?.sendFail || ''), (t.hidden = !1));
                } finally {
                    c?.classList.remove('is-waiting');
                }
                return;
            }
            // app link not set yet: the bot opens at once (gesture keeps window.open alive),
            // the composed text follows into the clipboard
            window.open(`https://t.me/${BOT_USERNAME}?start=b_${state.lang || 'en'}`, '_blank', 'noopener');
            try { await navigator.clipboard.writeText(briefText(state.i18n)); } catch (e) {}
        }),
        o.addEventListener('click', (e) => {
            // b_<lang> - the bot opens the mini app brief in the visitor's language
            if (e.target.closest('.brief-bot'))
                window.open(`https://t.me/${BOT_USERNAME}?start=b_${state.lang || 'en'}`, '_blank', 'noopener');
        }),
        o.addEventListener('reset', () => {
            requestAnimationFrame(() => a());
        }));
    const i = o.querySelector('.brief-copy');
    i?.addEventListener('click', async () => {
        const e = briefText(state.i18n);
        let t = !1;
        try {
            (await navigator.clipboard.writeText(e), (t = !0));
        } catch (e) {
            const o = $('#briefPreview');
            if (o) {
                (o.removeAttribute('readonly'), o.select());
                try {
                    t = document.execCommand('copy');
                } catch (e) {}
                (o.setAttribute('readonly', ''), window.getSelection()?.removeAllRanges());
            }
        }
        if (t) {
            const e = i.textContent;
            ((i.textContent = state.i18n?.brief?.copied || ''),
                i.classList.add('is-done'),
                setTimeout(() => {
                    ((i.textContent = e), i.classList.remove('is-done'));
                }, 1600));
        }
    });
}
let briefLastFocus = null;
let tgLogin = null;
window.onTelegramAuth = (u) => {
    tgLogin = u;
    const s = $('#tgLoginState');
    s && (s.textContent = '✓ ' + (u.first_name || u.username || 'telegram'));
};
function mountTelegramLogin() {
    const host = $('#tgLogin');
    if (!host || host.dataset.mounted) return;
    host.dataset.mounted = '1';
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', BOT_USERNAME);
    s.setAttribute('data-size', 'medium');
    s.setAttribute('data-userpic', 'false');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-onauth', 'onTelegramAuth(user)');
    host.append(s);
}
function openBriefModal() {
    const e = $('#briefModal');
    e &&
        !e.classList.contains('is-open') &&
        ((briefLastFocus = document.activeElement),
        e.removeAttribute('inert'),
        e.classList.add('is-open'),
        e.setAttribute('aria-hidden', 'false'),
        document.body.classList.add('modal-open'),
        mountTelegramLogin(),
        '#brief' !== location.hash && history.replaceState(null, '', '#brief'),
        requestAnimationFrame(() => {
            const t = $('#briefClose');
            (t && t.focus({ preventScroll: !0 }), trapFocus(e));
        }));
}
function closeBriefModal() {
    const e = $('#briefModal');
    if (
        e &&
        e.classList.contains('is-open') &&
        (e.classList.remove('is-open'),
        e.setAttribute('aria-hidden', 'true'),
        e.setAttribute('inert', ''),
        document.body.classList.remove('modal-open'),
        '#brief' === location.hash && history.replaceState(null, '', `${location.pathname}${location.search}`),
        releaseFocusTrap(),
        briefLastFocus && 'function' == typeof briefLastFocus.focus)
    )
        try {
            briefLastFocus.focus({ preventScroll: !0 });
        } catch (e) {}
}
function initBriefDialog() {
    (document.addEventListener('click', (e) => {
        e.target.closest('[data-brief-open]') && openBriefModal();
    }),
        $('#briefClose')?.addEventListener('click', closeBriefModal),
        $('#briefModal')?.addEventListener('click', (e) => {
            e.target === e.currentTarget && closeBriefModal();
        }));
    const e = () => {
        '#brief' === location.hash && openBriefModal();
    };
    (afterBoot(e), window.addEventListener('hashchange', e));
}
function afterBoot(e) {
    if (!document.getElementById('preloader')) return void e();
    const t = new MutationObserver(() => {
        document.getElementById('preloader') || (t.disconnect(), e());
    });
    t.observe(document.body, { childList: !0, subtree: !0 });
}
function initWorkDeepLink() {
    const e = () => {
        const e = /^#work-([a-z0-9-]+)$/i.exec(location.hash || '');
        if (!e) return;
        const t = e[1].toLowerCase();
        state.i18n?.projects?.[t] && openProject(t);
    };
    (afterBoot(e), window.addEventListener('hashchange', e));
}
function bindPriceCurrency() {
    const e = $('#priceCurrency');
    if (!e) return;
    const t = LANG_CUR[state.lang] || state.currency || 'USD';
    ((state.currency = t),
        storage.set('zazary.cur', t),
        $$('.price-cur-btn', e).forEach((e) => {
            const o = e.dataset.cur === t;
            (e.classList.toggle('is-on', o), e.setAttribute('aria-pressed', o ? 'true' : 'false'));
        }),
        e.addEventListener('click', (t) => {
            const o = t.target.closest('.price-cur-btn');
            if (!o) return;
            const a = o.dataset.cur;
            a &&
                a !== state.currency &&
                ((state.currency = a),
                storage.set('zazary.cur', a),
                $$('.price-cur-btn', e).forEach((e) => {
                    const t = e.dataset.cur === a;
                    (e.classList.toggle('is-on', t), e.setAttribute('aria-pressed', t ? 'true' : 'false'));
                }),
                state.i18n &&
                    (renderPrice(state.i18n), $$('#priceGrid .price-card').forEach((e) => e.classList.add('is-in'))));
        }));
}
function renderHw(e) {
    const t = $('#hwGrid');
    t &&
        (t.replaceChildren(),
        (e.hw.items || []).forEach((e) => {
            t.appendChild(
                el('article', { class: 'hw-card reveal' }, [el('span', { text: e.k }), el('strong', { text: e.v })])
            );
        }));
}
function renderAbout(e) {
    const t = $('#aboutText');
    t && (t.innerHTML = e.aboutText);
}
let i18nRenderRun = 0;
const yieldToMain = () =>
    globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((e) => setTimeout(e, 0));
async function applyI18n(e) {
    const t = ++i18nRenderRun;
    state.i18n = e;
    const o = () => t === i18nRenderRun;
    try {
        (applyStaticI18n(e), await yieldToMain());
        const t = [
            renderAbout,
            renderValueGrid,
            renderSkills,
            renderTimeline,
            renderUses,
            renderHw,
            renderFaq,
            renderPrice,
            renderWipBand,
            renderBrief
        ];
        for (const a of t) {
            if (!o()) return;
            (a(e), await yieldToMain());
        }
        if (!o()) return;
        (bindFaqCollapse(), initReveal());
    } catch (e) {
        console.error('applyI18n failed:', e);
    }
    if (!o()) return;
    const a = $$(
        '#priceGrid .price-card, #valueGrid .value-card, #useGrid .use-group, #skillGroups .skill-card, #timeline .timeline-item, #faqList .faq-item, #hwGrid .hw-card, .folio-block:not(.is-empty) .portfolio-card, .folio-block:not(.is-empty)'
    );
    for (let e = 0; e < a.length; e += 16) {
        if (!o()) return;
        (a.slice(e, e + 16).forEach((e) => {
            (e.classList.add('is-in'), e.classList.add('was-in'));
        }),
            await yieldToMain());
    }
    o() && (measureScrollMax(), paintFxPrompt(), syncHeroCtaGhost());
}
let initialI18nPromise = null;
async function ensureInitialI18n() {
    if (state.i18n) return state.i18n;
    try {
        const c = JSON.parse(storage.get('zazary.i18n.' + state.lang) || 'null');
        if (c && c.v === ASSET_V && c.data) { state.i18n = c.data; applyI18n(c.data); }
    } catch (e) {}
    if (!initialI18nPromise) {
        const e = state.lang;
        initialI18nPromise = (async () => {
            const t = await loadI18n(e);
            return state.lang !== e ? state.i18n : (await applyI18n(t), bindExperienceSort(), t);
        })().catch(() => ((initialI18nPromise = null), null));
    }
    return initialI18nPromise;
}
async function setLanguage(e) {
    (LANGS.includes(e) || (e = 'en'),
        (state.lang = e),
        storage.set('zazary.lang', e),
        LANG_CUR[e] && ((state.currency = LANG_CUR[e]), storage.set('zazary.cur', state.currency)));
    const t = await loadI18n(e);
    await applyI18n(t);
    const o = $('#langSwitch'),
        a = document.querySelector('.lang-toggle');
    (o && (o.checked = !1), a && a.setAttribute('data-pos', e));
    const i = $('#priceCurrency');
    (i &&
        LANG_CUR[e] &&
        ((state.currency = LANG_CUR[e]),
        storage.set('zazary.cur', state.currency),
        $$('.price-cur-btn', i).forEach((e) => {
            const t = e.dataset.cur === state.currency;
            (e.classList.toggle('is-on', t), e.setAttribute('aria-pressed', t ? 'true' : 'false'));
        })),
        document.dispatchEvent(new CustomEvent('zazary:lang')));
}
class Sakura {
    constructor(e) {
        if (!e) throw new Error('Sakura root is missing');
        ((this.root = e),
            (this.petals = []),
            (this.template = $('#petalTemplate')),
            this.resize(),
            window.addEventListener('resize', () => this.resize(), { passive: !0 }));
    }
    count() {
        return state.optimized || reducedMotion() || matchMedia('(max-width: 767px)').matches
            ? 0
            : matchMedia('(max-width: 1099px)').matches
              ? 4
              : 6;
    }
    resize() {
        const e = this.count();
        for (; this.petals.length > e;) this.petals.pop().remove();
        for (; this.petals.length < e;) this.petals.push(this.spawn());
    }
    spawn() {
        const e = this.template.content.firstElementChild.cloneNode(!0),
            t = Math.round(100 * Math.random()),
            o = Math.round(18 + 38 * Math.random()),
            a = (0.5 + 0.75 * Math.random()).toFixed(2),
            i = (9 + 9 * Math.random()).toFixed(2);
        return (
            e.style.setProperty('--petal-x', `${t}vw`),
            e.style.setProperty('--petal-sway', `${o}px`),
            e.style.setProperty('--petal-scale', a),
            e.style.setProperty('--petal-rotation', `${Math.round(180 + 540 * Math.random())}deg`),
            e.style.setProperty('--petal-duration', `${i}s`),
            e.style.setProperty('--petal-delay', `${(-Math.random() * Number(i)).toFixed(2)}s`),
            this.root.appendChild(e),
            e
        );
    }
    stop() {
        this.root.classList.add('is-paused');
    }
    start() {
        (this.root.classList.remove('is-paused'), this.resize());
    }
}
function paintFxPrompt() {
    const e = state.optimized,
        t = $('#fxOpen');
    if (!t) return;
    (t.setAttribute('aria-pressed', e ? 'true' : 'false'),
        t.classList.toggle('is-off', e),
        t.classList.toggle('is-auto', !!state.fxAuto));
    const o = $('#fxDot');
    o && o.classList.toggle('is-on', !!state.fxAuto || e);
}
function setOptimized(e) {
    ((state.optimized = !!e),
        document.body.classList.toggle('fast-af', state.optimized),
        storage.set('zazary.fx', state.optimized ? 'off' : 'on'),
        state.optimized
            ? ($$('.reveal').forEach((e) => e.classList.add('is-in', 'was-in')),
              state.sakura && state.sakura.stop(),
              $$('.bg-video').forEach((e) => e.pause()),
              document.body.classList.remove('hero-video-ready'))
            : (state.sakura && state.sakura.start(),
              state.heroVideoReady && document.body.classList.add('hero-video-ready'),
              playVideos()),
        paintFxPrompt(),
        document.dispatchEvent(new CustomEvent('zazary:fx')));
}
function autoTuneFx() {
    const e = storage.get('zazary.fx');
    if (e) return void setOptimized('off' === e);
    const t = reducedMotion() || navigator.connection?.saveData;
    ((state.fxAuto = t), setOptimized(t));
}
function initFxPrompt() {
    (paintFxPrompt(),
        $('#fxOpen')?.addEventListener('click', () => {
            ((state.fxAuto = !1), setOptimized(!state.optimized), state.optimized || activateHeroVideos());
        }),
        autoTuneFx());
}
function syncHeroCtaGhost() {
    const e = $('[data-ctaworks]');
    if (!e) return;
    const t = e.querySelector('.hero-cta-text'),
        o = e.querySelector('.hero-cta-ghost');
    t && o && o.setAttribute('data-text', t.textContent || '');
}
let lastFocused = null;
function openProject(e) {
    const t = state.i18n;
    if (!t || !t.projects)
        return void ensureInitialI18n().then(() => {
            state.i18n?.projects?.[e] && openProject(e);
        });
    const o = t.projects[e],
        a = $('#folioModal'),
        i = $('#folioModalCard');
    if (!o || !a || !i) return;
    ((lastFocused = document.activeElement),
        ($('#folioModalTag').textContent = o.tag || ''),
        e && history.replaceState(null, '', `#work-${encodeURIComponent(e)}`),
        ($('#folioModalTitle').textContent = o.title || e),
        ($('#folioModalDesc').textContent = o.desc || ''));
    const n = $('#folioModalPublished'),
        r = n?.closest('.folio-published');
    n && o.published
        ? ((n.textContent = o.published),
          o.publishedISO ? n.setAttribute('datetime', o.publishedISO) : n.removeAttribute('datetime'),
          r && (r.hidden = !1))
        : r && (r.hidden = !0);
    const s = $('#folioModalVideo'),
        l = $('#folioModalImg');
    if (
        ((() => {
            if ((i.classList.remove('has-video'), s)) {
                try {
                    s.pause();
                } catch (e) {}
                s.removeAttribute('src');
                try {
                    s.load();
                } catch (e) {}
                s.hidden = !0;
            }
            l && ((l.hidden = !0), l.classList.remove('is-loaded'), l.removeAttribute('src'), l.removeAttribute('alt'));
        })(),
        o.video)
    ) {
        if ((i.classList.add('has-video'), l && ((l.hidden = !0), l.removeAttribute('src')), s)) {
            ((s.hidden = !1), s.getAttribute('src') !== o.video && (s.src = o.video));
            const e = () => {
                s.videoWidth && i.style.setProperty('--ar', `${s.videoWidth} / ${s.videoHeight}`);
            };
            (s.videoWidth ? e() : s.addEventListener('loadedmetadata', e, { once: !0 }), s.play().catch(() => {}));
        }
    } else if (o.image) {
        if (s) {
            try {
                s.pause();
            } catch (e) {}
            (s.removeAttribute('src'), (s.hidden = !0));
        }
        if (l) {
            ((l.hidden = !1), (l.decoding = 'async'), (l.src = o.image), (l.alt = o.title || e));
            const t = () => {
                (l.naturalWidth && i.style.setProperty('--ar', `${l.naturalWidth} / ${l.naturalHeight}`),
                    l.classList.add('is-loaded'));
            };
            l.complete && l.naturalWidth ? t() : l.addEventListener('load', t, { once: !0 });
        }
    }
    const c = $('#folioCase'),
        d = $('#folioCaseVideo'),
        u = $('#folioCaseNote');
    if (d) {
        try {
            d.pause();
        } catch (e) {}
        (d.replaceChildren(), d.removeAttribute('poster'), d.removeAttribute('aria-label'));
        try {
            d.load();
        } catch (e) {}
        d.hidden = !0;
    }
    (c && (c.hidden = !1),
        o.caseVideo && d
            ? (u && (u.hidden = !0),
              (d.hidden = !1),
              o.casePoster && (d.poster = o.casePoster),
              d.setAttribute('aria-label', t.modal?.casePlay || `${o.title || e} process case`),
              d.appendChild(el('source', { src: o.caseVideo, type: 'video/webm' })),
              o.caseVideoFallback && d.appendChild(el('source', { src: o.caseVideoFallback, type: 'video/mp4' })),
              d.load(),
              d.play().catch(() => {}))
            : u &&
              ((u.textContent =
                  o.caseNote || t.modal?.caseNotRecorded || 'The creation process was not recorded for this project.'),
              (u.hidden = !1)));
    const p = $('#folioWorkflow');
    if (p)
        if (o.task && Array.isArray(o.steps) && o.steps.length) {
            ((p.hidden = !1), ($('#fwTask').textContent = o.task));
            const e = $('#fwSteps');
            (e.replaceChildren(), o.steps.forEach((t) => e.appendChild(el('li', { text: t }))));
            const a = t.modal;
            $('#fwLessons').replaceChildren(
                el('p', null, [el('strong', { text: a.fwProblem + '. ' }), document.createTextNode(o.problem || '')]),
                el('p', null, [el('strong', { text: a.fwTakeaway + '. ' }), document.createTextNode(o.takeaway || '')])
            );
        } else
            ((p.hidden = !0),
                $('#fwSteps').replaceChildren(),
                $('#fwLessons').replaceChildren(),
                ($('#fwTask').textContent = ''));
    (a.removeAttribute('inert'),
        a.classList.add('is-open'),
        a.setAttribute('aria-hidden', 'false'),
        document.body.classList.add('modal-open'),
        requestAnimationFrame(() => {
            const e = $('#folioClose');
            (e && e.focus({ preventScroll: !0 }), trapFocus(a));
        }));
}
function closeModal() {
    const e = $('#folioModal');
    if (!e || !e.classList.contains('is-open')) return;
    (e.classList.remove('is-open'),
        /^#work-[a-z0-9-]+$/i.test(location.hash) &&
            history.replaceState(null, '', `${location.pathname}${location.search}`),
        e.setAttribute('aria-hidden', 'true'),
        e.setAttribute('inert', ''),
        document.body.classList.remove('modal-open'));
    const t = $('#folioModalVideo');
    if (t)
        try {
            t.pause();
        } catch (e) {}
    const o = $('#folioCaseVideo');
    if (o) {
        try {
            o.pause();
        } catch (e) {}
        (o.replaceChildren(), o.removeAttribute('poster'));
        try {
            o.load();
        } catch (e) {}
    }
    const a = $('#folioZoom');
    if ((a && (a.hidden = !0), releaseFocusTrap(), lastFocused && 'function' == typeof lastFocused.focus))
        try {
            lastFocused.focus({ preventScroll: !0 });
        } catch (e) {}
}
function openZoom(e, t) {
    const o = $('#folioZoom'),
        a = $('#folioZoomImg');
    o &&
        a &&
        ((a.src = e),
        (a.alt = t || ''),
        o.removeAttribute('inert'),
        (o.hidden = !1),
        (lastFocused = document.activeElement),
        requestAnimationFrame(() => o.focus({ preventScroll: !0 })),
        trapFocus(o));
}
function closeZoom() {
    const e = $('#folioZoom');
    if (!e) return;
    ((e.hidden = !0), e.setAttribute('inert', ''));
    const t = $('#folioZoomImg');
    (t && t.removeAttribute('src'), releaseFocusTrap());
}
let trapHandler = null,
    trapContainer = null;
function trapFocus(e) {
    (releaseFocusTrap(),
        (trapContainer = e),
        (trapHandler = (t) => {
            if ('Tab' !== t.key) return;
            const o = $$('a, button, input, [tabindex]:not([tabindex="-1"])', e).filter(
                (e) => !e.hasAttribute('disabled') && null !== e.offsetParent
            );
            if (!o.length) return;
            const a = o[0],
                i = o[o.length - 1];
            t.shiftKey && document.activeElement === a
                ? (t.preventDefault(), i.focus())
                : t.shiftKey || document.activeElement !== i || (t.preventDefault(), a.focus());
        }),
        e.addEventListener('keydown', trapHandler));
}
function releaseFocusTrap() {
    (trapHandler && trapContainer && trapContainer.removeEventListener('keydown', trapHandler),
        (trapHandler = null),
        (trapContainer = null));
}
let portfolioFilterRun = 0,
    portfolioRequestedFilter = 'all',
    portfolioFallbackAnimations = [];
function ensurePortfolioWrappers() {
    const e = new Set();
    return $$('.portfolio-card').map((t, o) => {
        let a = t.parentElement;
        (a && a.classList.contains('portfolio-card-wrap')) ||
            ((a = el('div', { class: 'portfolio-card-wrap' })), t.parentNode.insertBefore(a, t), a.appendChild(t));
        const i = t.dataset.project || `item-${o + 1}`;
        ((a.dataset.project = i),
            (a.dataset.cat = t.dataset.cat || ''),
            a.classList.toggle('is-featured', t.classList.contains('is-featured')));
        let n = `folio-${i}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        return (e.has(n) && (n += `-${o + 1}`), e.add(n), (a.style.viewTransitionName = n), a);
    });
}
function portfolioMatches(e, t) {
    return !e || 'all' === t || (e.dataset.cat || '').split(/\s+/).includes(t);
}
function setPortfolioFilterControls(e) {
    $$('#portfolioFilters .filter-btn').forEach((t) => {
        const o = t.dataset.filter === e;
        (t.classList.toggle('is-on', o), t.setAttribute('aria-pressed', o ? 'true' : 'false'));
    });
}
function applyPortfolioFilter(e) {
    const t = e || 'all',
        o = ensurePortfolioWrappers();
    ((state.portfolioFilter = t),
        o.forEach((e) => {
            const o = e.querySelector('.portfolio-card'),
                a = !portfolioMatches(o, t);
            (e.classList.toggle('is-hidden', a),
                o?.classList.toggle('is-hidden', a),
                a ? e.setAttribute('aria-hidden', 'true') : e.removeAttribute('aria-hidden'));
            const i = o?.querySelector('.folio-hit');
            i && (a ? i.setAttribute('tabindex', '-1') : i.removeAttribute('tabindex'));
        }),
        $$('.folio-block').forEach((e) => {
            const t = $$('.portfolio-card-wrap', e).some((e) => !e.classList.contains('is-hidden'));
            e.classList.toggle('is-empty', !t);
        }),
        'all' !== t && setWipBandOpen(!0));
}
function stopPortfolioFallbackAnimations() {
    (portfolioFallbackAnimations.forEach((e) => {
        try {
            e.cancel();
        } catch (e) {}
    }),
        (portfolioFallbackAnimations = []));
}
async function fallbackPortfolioFilter(e, t) {
    const o = ensurePortfolioWrappers(),
        a = new Map(),
        i = [];
    if (
        (o.forEach((t) => {
            if (t.classList.contains('is-hidden')) return;
            const o = t.getBoundingClientRect();
            o.width && o.height && a.set(t, o);
            portfolioMatches(t.querySelector('.portfolio-card'), e) || i.push(t);
        }),
        'function' != typeof Element.prototype.animate || reducedMotion() || state.optimized)
    )
        return void applyPortfolioFilter(e);
    const n = i.map((e) => {
        const t = e.animate(
            [
                { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
                { opacity: 0, transform: 'translate3d(0, 8px, 0) scale(.975)' }
            ],
            { duration: 150, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'none' }
        );
        return (portfolioFallbackAnimations.push(t), t.finished.catch(() => {}));
    });
    (n.length && (await Promise.all(n)),
        t === portfolioFilterRun &&
            (applyPortfolioFilter(e),
            await new Promise((e) => requestAnimationFrame(() => requestAnimationFrame(e))),
            t === portfolioFilterRun &&
                ensurePortfolioWrappers().forEach((e) => {
                    if (e.classList.contains('is-hidden')) return;
                    const t = e.getBoundingClientRect(),
                        o = a.get(e);
                    let i;
                    if (o) {
                        const e = o.left - t.left,
                            a = o.top - t.top;
                        if (Math.abs(e) < 0.5 && Math.abs(a) < 0.5) return;
                        i = [{ transform: `translate3d(${e}px, ${a}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }];
                    } else
                        i = [
                            { opacity: 0, transform: 'translate3d(0, 16px, 0) scale(.985)' },
                            { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
                        ];
                    const n = e.animate(i, {
                        duration: o ? 520 : 420,
                        easing: 'cubic-bezier(.22, 1, .36, 1)',
                        fill: 'none'
                    });
                    portfolioFallbackAnimations.push(n);
                })));
}
function changePortfolioFilter(e) {
    const t = e || 'all';
    if (t === portfolioRequestedFilter) return;
    portfolioRequestedFilter = t;
    const o = ++portfolioFilterRun;
    if ((setPortfolioFilterControls(t), stopPortfolioFallbackAnimations(), state.portfolioTransition?.skipTransition))
        try {
            state.portfolioTransition.skipTransition();
        } catch (e) {}
    if ('function' == typeof document.startViewTransition && !reducedMotion() && !state.optimized)
        try {
            document.documentElement.classList.add('portfolio-filter-transition');
            const e = document.startViewTransition(() => applyPortfolioFilter(t));
            return (
                (state.portfolioTransition = e),
                void e.finished
                    .catch(() => {})
                    .finally(() => {
                        o === portfolioFilterRun &&
                            ((state.portfolioTransition = null),
                            document.documentElement.classList.remove('portfolio-filter-transition'),
                            state.portfolioFilter !== t && applyPortfolioFilter(t));
                    })
            );
        } catch (e) {
            ((state.portfolioTransition = null),
                document.documentElement.classList.remove('portfolio-filter-transition'));
        }
    fallbackPortfolioFilter(t, o).catch(() => {
        o === portfolioFilterRun && applyPortfolioFilter(t);
    });
}
function initPortfolio() {
    (ensurePortfolioWrappers(),
        (portfolioRequestedFilter = state.portfolioFilter),
        applyPortfolioFilter(state.portfolioFilter),
        setPortfolioFilterControls(state.portfolioFilter));
    const e = $('#portfolioFilters');
    (e &&
        !e.dataset.filterBound &&
        ((e.dataset.filterBound = '1'),
        e.addEventListener('click', (e) => {
            const t = e.target.closest('.filter-btn');
            t && changePortfolioFilter(t.dataset.filter);
        }),
        e.addEventListener('keydown', (t) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(t.key)) return;
            const o = $$('.filter-btn', e),
                a = Math.max(0, o.indexOf(document.activeElement));
            let i = a;
            ('ArrowLeft' === t.key && (i = (a - 1 + o.length) % o.length),
                'ArrowRight' === t.key && (i = (a + 1) % o.length),
                'Home' === t.key && (i = 0),
                'End' === t.key && (i = o.length - 1),
                t.preventDefault(),
                o[i]?.focus(),
                changePortfolioFilter(o[i]?.dataset.filter));
        })),
        document.addEventListener('click', (e) => {
            const t = e.target.closest('.folio-hit');
            if (t) return (e.preventDefault(), void openProject(t.dataset.open));
            const o = e.target.closest('.portfolio-card.is-live');
            o &&
                (e.target.closest('.portfolio-meta a, .portfolio-meta button') ||
                    (e.preventDefault(), openProject(o.dataset.project)));
        }),
        document.addEventListener('keydown', (e) => {
            ('Enter' !== e.key && ' ' !== e.key) ||
                (e.target.classList &&
                    e.target.classList.contains('folio-hit') &&
                    (e.preventDefault(), openProject(e.target.dataset.open)));
        }),
        $('#folioClose')?.addEventListener('click', closeModal),
        $('#folioModal')?.addEventListener('click', (e) => {
            e.target === e.currentTarget && closeModal();
        }),
        $('#folioModalImg')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const t = e.currentTarget;
            !t.hidden && t.src && openZoom(t.src, t.alt);
        }),
        $('#folioZoom')?.addEventListener('click', closeZoom));
}
function playSafeReveal(e) {
    if (!e || e.dataset.revealEntered) return;
    if (
        ((e.dataset.revealEntered = '1'),
        e.classList.add('has-entered'),
        reducedMotion() || state.optimized || 'function' != typeof e.animate)
    )
        return;
    const t = getComputedStyle(e),
        o = t.transform,
        a = e.matches('.panel'),
        i = e.matches('.portfolio-card-wrap') ? $('.portfolio-card', e) : e,
        n = i ? getComputedStyle(i) : t,
        r = n.boxShadow && 'none' !== n.boxShadow,
        s = {},
        l = {};
    if (
        (a ||
            ((s.transform = 'none' === o ? 'translate3d(0, 12px, 0)' : `translate3d(0, 12px, 0) ${o}`),
            (l.transform = o)),
        r && i === e && ((s.boxShadow = 'none'), (l.boxShadow = n.boxShadow)),
        !Object.keys(s).length)
    )
        return;
    const c = { duration: a ? 640 : 520, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'none' },
        d = e.animate([s, l], c);
    if (
        ((d.id = 'safe-reveal'),
        d.finished.catch(() => {}).finally(() => e.classList.add('reveal-finished')),
        r && i !== e)
    ) {
        i.animate([{ boxShadow: 'none' }, { boxShadow: n.boxShadow }], c).id = 'safe-shadow';
    }
}
function getRevealObserver() {
    return (
        revealObserver ||
            !('IntersectionObserver' in window) ||
            (revealObserver = new IntersectionObserver(
                (e) => {
                    e.forEach((e) => {
                        const t = e.boundingClientRect.top < (e.rootBounds?.top || 0);
                        (e.isIntersecting || t) && (revealObserver.unobserve(e.target), playSafeReveal(e.target));
                    });
                },
                { rootMargin: '80px 0px', threshold: 0.01 }
            )),
        revealObserver
    );
}
function initReveal() {
    const e = $$(
            '.panel, .value-card, .skill-card, .use-group, .hw-card, .faq-item, .experience-collapse, .contact-card, .price-card, #aboutText, .subhead, .section-lead'
        ).concat(ensurePortfolioWrappers()),
        t = getRevealObserver();
    e.forEach((e) => {
        (e.classList.add('reveal', 'is-in', 'was-in'),
            e.dataset.revealObserved || ((e.dataset.revealObserved = '1'), t ? t.observe(e) : playSafeReveal(e)));
    });
}
function waitForDecodedHeroImage(e, t = 4500) {
    return new Promise((o) => {
        if (!e) return void o(!1);
        let a = !1,
            i = 0;
        const n = (t) => {
                a ||
                    ((a = !0),
                    clearTimeout(i),
                    e.removeEventListener('load', r),
                    e.removeEventListener('error', s),
                    o(t && e.naturalWidth > 0));
            },
            r = () => n(!0),
            s = () => n(!1);
        (e.addEventListener('load', r, { once: !0 }),
            e.addEventListener('error', s, { once: !0 }),
            (i = setTimeout(() => n(e.complete && e.naturalWidth > 0), t)),
            e.complete && queueMicrotask(() => n(e.naturalWidth > 0)));
    });
}
function initPreloader() {
    window.__ZAZARY_BOOTED = !0;
    const e = $('#preloader');
    if (!e) return ((document.body.dataset.state = 'ready'), (state.heroReady = Promise.resolve(!0)), state.heroReady);
    const t = performance.now(),
        o = reducedMotion() ? 350 : 1400,
        a = $('#preloaderProgress'),
        i = $('.preloader-bar'),
        n = $('#preloaderStatus'),
        r = $('#heroPosterImage'),
        s = new Map(),
        l = [];
    let c = !1,
        d = 0,
        u = 6,
        p = 0,
        m = t,
        f = !1,
        h = !1,
        y = 0,
        v = null;
    n && (n.textContent = n.textContent.trim() || 'loading');
    const g = (e, t, o = !1) => Promise.race([Promise.resolve(e), new Promise((e) => setTimeout(() => e(o), t))]),
        b = $('link[href*="style.min.css"]'),
        w = new Promise((e) => {
            const t = () => Array.from(document.styleSheets).some((e) => e.href?.includes('style.min.css'));
            if (!b || t()) return e(!0);
            let o = !1;
            const a = (t) => {
                    o || ((o = !0), clearTimeout(i), e(t));
                },
                i = setTimeout(() => a(t()), 1e4);
            (b.addEventListener('load', () => requestAnimationFrame(() => a(!0)), { once: !0 }),
                b.addEventListener('error', () => a(!1), { once: !0 }));
        }),
        L = g(ensureInitialI18n().then(Boolean), 12e3, !1),
        x = L.then(async () => {
            if (!document.fonts?.load) return !0;
            const e = [
                ['400 16px Rajdhani', 'portfolio'],
                ['500 16px Rajdhani', 'portfolio'],
                ['600 16px Rajdhani', 'portfolio'],
                ['700 16px Rajdhani', 'portfolio'],
                ['700 16px Orbitron', 'ZAZARY'],
                ['700 32px "Noto Sans JP"', '鬼']
            ];
            ('ja' === state.lang && e.push(['500 16px "Noto Sans JP Locale"', '作品']),
                'zh' === state.lang && e.push(['500 16px "Noto Sans SC"', '作品']));
            const t = await g(Promise.allSettled(e.map(([e, t]) => document.fonts.load(e, t))), 1e4, null);
            return (
                !!t &&
                (await g(document.fonts.ready, 3e3, null),
                t.every((e) => 'fulfilled' === e.status && e.value.length > 0))
            );
        }),
        E = $('.preloader-content'),
        k = () => {
            E && E.classList.add('is-in');
        };
    (w
        .then(async () => {
            document.fonts?.load &&
                (await Promise.race([
                    Promise.allSettled([
                        document.fonts.load('800 32px Rajdhani', 'ZAZARY'),
                        document.fonts.load('700 32px "Noto Sans JP"', '鬼'),
                        document.fonts.load('600 12px Orbitron', 'ZAZARY')
                    ]),
                    new Promise((e) => setTimeout(e, 3e3))
                ]));
        })
        .finally(k),
        setTimeout(k, 6e3));
    const P = [
            ['stylesheet', w],
            ['locale-and-render', L],
            ['fonts', x],
            [
                'fa-icons',
                document.fonts?.load
                    ? g(
                          Promise.all([
                              document.fonts.load('900 16px "Font Awesome 6 Free"'),
                              document.fonts.load('400 16px "Font Awesome 6 Brands"')
                          ]).then((e) => e.flat().length > 0),
                          4e3,
                          !0
                      )
                    : Promise.resolve(!0)
            ],
            [
                'hero-poster',
                (async () => {
                    let e = await waitForDecodedHeroImage(r, 8e3);
                    return (
                        !e &&
                            r &&
                            (r
                                .closest('picture')
                                ?.querySelectorAll('source')
                                .forEach((e) => e.remove()),
                            (r.src = `images/hero-static-desktop.webp?v=${ASSET_V}`),
                            (e = await waitForDecodedHeroImage(r, 5e3))),
                        (c = e),
                        e
                    );
                })()
            ]
        ],
        M = [
            [
                'window-load',
                new Promise((e) => {
                    if ('complete' === document.readyState) return e(!0);
                    const t = setTimeout(() => e(!1), 2e4);
                    window.addEventListener(
                        'load',
                        () => {
                            (clearTimeout(t), e(!0));
                        },
                        { once: !0 }
                    );
                })
            ]
        ];
    (state.portfolioImagePromises.forEach((e, t) => {
        M.push([`portfolio-image-${t + 1}`, e]);
    }),
        state.portfolioVideoPromises.forEach((e, t) => {
            M.push([`portfolio-video-${t + 1}`, e]);
        }),
        matchMedia('(max-width: 768px)').matches
            ? mobileHeroVideoAllowed() &&
              M.push(['hero-mobile-motion', whenSettled(() => prepareMobileHeroVideo($('#heroMobileVideo')))])
            : reducedMotion() ||
              navigator.connection?.saveData ||
              $$('.bg-video').forEach((e, t) => {
                  M.push([`hero-desktop-layer-${t + 1}`, prepareHeroVideo(e)]);
              }));
    const S = (e, t) => (
            s.set(e, 'pending'),
            Promise.resolve(t)
                .then((t) => {
                    const o = !1 !== t && null != t;
                    return (s.set(e, o ? 'loaded' : 'failed'), o || l.push(e), { name: e, ok: o });
                })
                .catch(() => (s.set(e, 'failed'), l.push(e), { name: e, ok: !1 }))
                .finally(() => {
                    d += 1;
                })
        ),
        A = new Set(P.map(([e]) => e)),
        C = [...P, ...M].map(([e, t]) => ({ name: e, promise: S(e, t) })),
        F = C.map((e) => e.promise),
        T = Promise.all(C.filter((e) => A.has(e.name)).map((e) => e.promise)),
        R = (e) => {
            const n = Math.max(0, e - t),
                r = Math.min(1, n / o),
                s = 6 + 70 * (1 - Math.pow(1 - r, 2.35)),
                l = 6 + 86 * (F.length ? d / F.length : 1),
                c = Math.min(94, Math.max(s, l)),
                h = Math.min(0.05, Math.max(0.001, (e - m) / 1e3));
            ((m = e),
                (u += (c - u) * (1 - Math.exp(-7 * h))),
                a && (a.style.width = `${u.toFixed(2)}%`),
                i && i.setAttribute('aria-valuenow', String(Math.round(u))),
                f || (p = requestAnimationFrame(R)));
        };
    p = requestAnimationFrame(R);
    const z = $('#preloaderSkip'),
        B = new Promise((e) => {
            v = e;
        }),
        O = (e) => {
            h || 'Escape' !== e.key || (e.preventDefault(), v({ skipped: !0 }));
        };
    z &&
        ((y = setTimeout(() => {
            d >= F.length || z.classList.add('is-shown');
        }, 2500)),
        z.addEventListener('click', () => v({ skipped: !0 }), { once: !0 }),
        document.addEventListener('keydown', O));
    const I = async (n = {}) => {
            if (h) return !1;
            h = !0;
            const r = !0 === n.skipped,
                d = !0 === n.timedOut;
            if (
                (k(),
                clearTimeout(y),
                z && (z.classList.remove('is-shown'), (z.disabled = !0)),
                document.removeEventListener('keydown', O),
                r)
            )
                ((document.body.dataset.preloadState = 'skipped'), document.body.classList.add('preload-partial'));
            else {
                const e = Math.max(0, o - (performance.now() - t));
                (e && (await new Promise((t) => setTimeout(t, e))),
                    await new Promise((e) => requestAnimationFrame(() => requestAnimationFrame(e))));
                const a = [...s.entries()].filter(([, e]) => 'pending' === e).map(([e]) => e),
                    i = d || l.length > 0 || a.length > 0;
                ((document.body.dataset.preloadState = i ? 'partial' : 'complete'),
                    document.body.classList.toggle('preload-partial', i),
                    i && console.warn('Preloader released with fallback:', [...new Set([...l, ...a])].join(', ')));
            }
            return (
                (f = !0),
                cancelAnimationFrame(p),
                a && (a.style.width = '100%'),
                i && i.setAttribute('aria-valuenow', '100'),
                await new Promise((e) => setTimeout(e, r ? 140 : 180)),
                document.body.classList.toggle('hero-poster-fallback', !c),
                document.body.classList.add('hero-ready'),
                (document.body.dataset.state = 'ready'),
                e.classList.add('is-done'),
                e.setAttribute('aria-busy', 'false'),
                setTimeout(() => e.remove(), 360),
                !r
            );
        },
        q = Promise.all(F).then((e) => ({ timedOut: !1, results: e })),
        H = T.then(() => new Promise((e) => setTimeout(() => e({ bonusDeadline: !0 }), 900))),
        D = new Promise((e) => setTimeout(() => e({ timedOut: !0, results: [] }), 12e3));
    return (
        (state.heroReady = Promise.race([q, H, D, B])
            .then((e) => I(e))
            .catch(() => I({}))),
        state.heroReady
    );
}
let wechatLastFocus = null;
function openWechatModal() {
    const e = $('#wechatModal');
    if (!e) return;
    wechatLastFocus = document.activeElement;
    const t = $('#wechatQr');
    (t?.dataset.src && ((t.src = t.dataset.src), t.removeAttribute('data-src')),
        e.removeAttribute('inert'),
        e.classList.add('is-open'),
        e.setAttribute('aria-hidden', 'false'),
        document.body.classList.add('modal-open'),
        requestAnimationFrame(() => {
            const t = $('#wechatClose');
            (t && t.focus({ preventScroll: !0 }), trapFocus(e));
        }));
}
function closeWechatModal() {
    const e = $('#wechatModal');
    if (
        e &&
        e.classList.contains('is-open') &&
        (e.classList.remove('is-open'),
        e.setAttribute('aria-hidden', 'true'),
        e.setAttribute('inert', ''),
        document.body.classList.remove('modal-open'),
        releaseFocusTrap(),
        wechatLastFocus && 'function' == typeof wechatLastFocus.focus)
    )
        try {
            wechatLastFocus.focus({ preventScroll: !0 });
        } catch (e) {}
}
async function copyText(e) {
    try {
        if (navigator.clipboard && window.isSecureContext) return (await navigator.clipboard.writeText(e), !0);
    } catch (e) {}
    try {
        const t = document.createElement('textarea');
        ((t.value = e),
            (t.style.position = 'fixed'),
            (t.style.opacity = '0'),
            (t.style.left = '-9999px'),
            document.body.appendChild(t),
            t.select());
        const o = document.execCommand('copy');
        return (document.body.removeChild(t), !!o);
    } catch (e) {
        return !1;
    }
}
function flashCopied(e, t, o = 1400) {
    if (!e) return;
    const a = e.getAttribute('aria-label') || '';
    (e.classList.add('is-copied'),
        t && e.setAttribute('aria-label', t),
        setTimeout(() => {
            e.isConnected && (e.classList.remove('is-copied'), e.setAttribute('aria-label', a));
        }, o));
}
function initWechatModal() {
    const e = $('#wechatCard');
    e &&
        (e.addEventListener('click', openWechatModal),
        $('#wechatClose')?.addEventListener('click', closeWechatModal),
        $('#wechatModal')?.addEventListener('click', (e) => {
            e.target === e.currentTarget && closeWechatModal();
        }),
        $('#wechatCopy')?.addEventListener('click', async () => {
            const e = $('#wechatIdValue')?.textContent?.trim() || 'ZazaryXS';
            if (await copyText(e)) {
                const e = state.i18n,
                    t = (e && e.contact && e.contact.wechatCopied) || 'copied';
                flashCopied($('#wechatCopy'), t);
            }
        }));
}
let emailLastFocus = null;
function openEmailModal() {
    const e = $('#emailModal');
    e &&
        ((emailLastFocus = document.activeElement),
        e.removeAttribute('inert'),
        e.classList.add('is-open'),
        e.setAttribute('aria-hidden', 'false'),
        document.body.classList.add('modal-open'),
        requestAnimationFrame(() => {
            const t = $('#emailClose');
            (t && t.focus({ preventScroll: !0 }), trapFocus(e));
        }));
}
function closeEmailModal() {
    const e = $('#emailModal');
    if (
        e &&
        e.classList.contains('is-open') &&
        (e.classList.remove('is-open'),
        e.setAttribute('aria-hidden', 'true'),
        e.setAttribute('inert', ''),
        document.body.classList.remove('modal-open'),
        releaseFocusTrap(),
        emailLastFocus && 'function' == typeof emailLastFocus.focus)
    )
        try {
            emailLastFocus.focus({ preventScroll: !0 });
        } catch (e) {}
}
function initEmailModal() {
    const e = $('#emailCard');
    e &&
        (e.addEventListener('click', openEmailModal),
        $('#emailClose')?.addEventListener('click', closeEmailModal),
        $('#emailModal')?.addEventListener('click', (e) => {
            e.target === e.currentTarget && closeEmailModal();
        }),
        $('#emailCopy')?.addEventListener('click', async () => {
            const e = $('#emailIdValue')?.textContent?.trim() || buildEmail();
            if (await copyText(e)) {
                const e = state.i18n,
                    t = (e && e.contact && e.contact.emailCopied) || 'copied!';
                flashCopied($('#emailCopy'), t);
            }
        }),
        $('#emailMailto')?.addEventListener('click', () => {
            ($('#emailIdValue')?.textContent || '').trim() || buildEmail();
            window.location.href = buildMailto();
        }),
        $('#footerEmail')?.addEventListener('click', openEmailModal));
}
let mobileNavLastFocused = null,
    mobileNavScrollY = 0,
    mobileNavScrollLocked = !1;
function setMobileScrollLock(e) {
    if (e === mobileNavScrollLocked) return;
    if (((mobileNavScrollLocked = e), e))
        return (
            (mobileNavScrollY = window.scrollY || window.pageYOffset || 0),
            (document.body.style.top = `-${mobileNavScrollY}px`),
            void document.body.classList.add('drawer-open')
        );
    (document.body.classList.remove('drawer-open'), document.body.style.removeProperty('top'));
    const t = document.documentElement,
        o = t.style.scrollBehavior;
    ((t.style.scrollBehavior = 'auto'),
        window.scrollTo(0, mobileNavScrollY),
        requestAnimationFrame(() => {
            t.style.scrollBehavior = o;
        }));
}
function syncDrawerState() {
    const e = !!$('#mobileNavDrawer')?.classList.contains('is-open'),
        t = $('#mobileDrawerBackdrop');
    (t && (t.classList.toggle('is-open', e), t.setAttribute('aria-hidden', e ? 'false' : 'true')),
        setMobileScrollLock(e));
}
function closeMobile({ restoreFocus: e = !0 } = {}) {
    const t = $('#mobileNavDrawer'),
        o = $('#mobileNavToggle'),
        a = !!t?.classList.contains('is-open');
    if (
        (t &&
            (t.classList.remove('is-open'),
            t.setAttribute('aria-hidden', 'true'),
            t.setAttribute('inert', ''),
            trapContainer === t && releaseFocusTrap()),
        o?.setAttribute('aria-expanded', 'false'),
        syncDrawerState(),
        a && e)
    ) {
        const e = mobileNavLastFocused?.isConnected ? mobileNavLastFocused : o;
        requestAnimationFrame(() => e?.focus?.({ preventScroll: !0 }));
    }
    mobileNavLastFocused = null;
}
function initMobileNav() {
    const e = $('#mobileNavToggle'),
        t = $('#mobileNavDrawer'),
        o = $('#mobileNavClose'),
        a = $('#mnpFx'),
        i = $$('.mnp-lang-btn');
    if (!e || !t) return;
    (t.setAttribute('inert', ''),
        syncDrawerState(),
        e.addEventListener('click', () => {
            t.classList.contains('is-open')
                ? closeMobile()
                : ((mobileNavLastFocused = e),
                  t.removeAttribute('inert'),
                  t.classList.add('is-open'),
                  t.setAttribute('aria-hidden', 'false'),
                  e.setAttribute('aria-expanded', 'true'),
                  syncDrawerState(),
                  requestAnimationFrame(() => {
                      t.classList.contains('is-open') && (t.focus({ preventScroll: !0 }), trapFocus(t));
                  }));
        }),
        o?.addEventListener('click', () => closeMobile()),
        $$('#mobileNavDrawer a').forEach((e) => e.addEventListener('click', () => closeMobile())),
        $('#mobileDrawerBackdrop')?.addEventListener('click', () => closeMobile()));
    const n = () => {
        if (!a) return;
        const e = !!state.optimized;
        a.setAttribute('aria-pressed', e ? 'true' : 'false');
    };
    (n(),
        document.addEventListener('zazary:fx', n),
        a?.addEventListener('click', () => {
            ((state.fxAuto = !1),
                setOptimized(!state.optimized),
                state.optimized || activateHeroVideos(),
                document.dispatchEvent(new CustomEvent('zazary:fx')));
        }));
    const r = () => {
        (i.forEach((e) => {
            const t = e.dataset.lang === state.lang;
            e.setAttribute('aria-pressed', t ? 'true' : 'false');
        }),
            $('.mnp-lang')?.setAttribute('data-pos', state.lang));
    };
    (r(),
        document.addEventListener('zazary:lang', r),
        i.forEach((e) => {
            e.addEventListener('click', () => {
                const t = e.dataset.lang;
                t &&
                    t !== state.lang &&
                    setLanguage(t).then(() => {
                        (document.dispatchEvent(new CustomEvent('zazary:lang')), r());
                    });
            });
        }),
        t.addEventListener('keydown', (e) => {
            'Escape' === e.key && (e.stopPropagation(), closeMobile());
        }));
    const s = window.matchMedia('(min-width: 769px)'),
        l = (e) => {
            e.matches && closeMobile({ restoreFocus: !1 });
        };
    s.addEventListener ? s.addEventListener('change', l) : s.addListener(l);
}
function easeInOutCubic(e) {
    return e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
}
function scrollToId(e) {
    const t = 'hero' === e ? 0 : $('#' + e) ? $('#' + e).getBoundingClientRect().top + window.pageYOffset - 88 : 0;
    if (reducedMotion()) return void window.scrollTo(0, t);
    const o = window.pageYOffset,
        a = t - o,
        i = Math.min(1100, Math.max(480, 0.42 * Math.abs(a)));
    let n = null;
    const r = (e) => {
        n || (n = e);
        const t = Math.min(1, (e - n) / i);
        (window.scrollTo(0, o + a * easeInOutCubic(t)), t < 1 && requestAnimationFrame(r));
    };
    requestAnimationFrame(r);
}
let scrollMax = 1;
function measureScrollMax() {
    scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
}
let lastRailStep = -1;
function updateChrome() {
    const e = state.scrollY,
        t = Math.max(0, Math.min(1, e / scrollMax)),
        o = $('#scrollProgress');
    o && (o.style.transform = `scaleX(${t})`);
    const a = Math.round(200 * t);
    (a !== lastRailStep &&
        ((lastRailStep = a), document.documentElement.style.setProperty('--rail-progress', a / 2 + '%')),
        document.body.classList.toggle('is-scrolled', e > 80));
    const i = $('#scrollIndicator');
    i && i.classList.toggle('is-hidden', e > 100);
    const n = $('#mainNav');
    n && n.classList.toggle('scrolled', e > 80);
    const r = e > 80;
    $$('.side-rail').forEach((e) => e.classList.toggle('is-visible', r));
}
const heroStackUp = window.matchMedia('(min-width: 769px)');
function updateParallax(e = window.scrollY || window.pageYOffset || 0) {
    if (state.optimized || reducedMotion()) return;
    const t = Math.max(0, e),
        o = Math.max(1, state.heroHeight || state.viewportHeight),
        a = Math.min(t, o);
    if (heroStackUp.matches) {
        const e = 0.35 * a,
            t = 0.18 * a;
        (state.els.vidBack && (state.els.vidBack.style.transform = `translate3d(-50%, calc(-50% + ${e}px), 0)`),
            state.els.vidMid && (state.els.vidMid.style.transform = `translate3d(-50%, calc(-50% + ${t}px), 0)`),
            state.els.vidFront && (state.els.vidFront.style.transform = 'translate3d(-50%, -50%, 0)'));
    }
    const i = Math.min(0.12 * t, 0.22 * state.viewportHeight);
    if ((state.els.bg && (state.els.bg.style.transform = `translate3d(0, ${i}px, 0)`), state.els.heroId)) {
        const e = Math.max(0, 1 - a / (0.58 * state.viewportHeight));
        ((state.els.heroId.style.opacity = String(e)),
            (state.els.heroId.style.transform = `translate3d(0, ${0.18 * a}px, 0)`));
    }
}
let spyPoints = [],
    spyCurrent = '';
function measureSpy() {
    spyPoints = ['hero', 'portfolio', 'about', 'faq', 'pricing', 'contact']
        .map((e) => ({ id: e, top: $('#' + e)?.offsetTop }))
        .filter((e) => Number.isFinite(e.top));
}
function spy() {
    if (mobileNavScrollLocked) return;
    let e = spyPoints[0]?.id || 'hero';
    const t = state.scrollY + 0.32 * state.viewportHeight;
    for (const o of spyPoints) {
        if (!(o.top <= t)) break;
        e = o.id;
    }
    e !== spyCurrent &&
        ((spyCurrent = e),
        $$('.nav-item, .mnp-item').forEach((t) => {
            const o = (t.getAttribute('href') || '') === '#' + e;
            (t.classList.toggle('is-active', o),
                o ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current'));
        }));
}
function initSpyMetrics() {
    const e = () => {
        ((state.viewportHeight = Math.max(1, window.visualViewport?.height || window.innerHeight)),
            (state.heroHeight = Math.max(1, state.els.hero?.offsetHeight || state.viewportHeight)),
            (state.scrollY = window.scrollY || window.pageYOffset || 0),
            measureScrollMax(),
            measureSpy(),
            updateChrome(),
            spy(),
            updateParallax(state.scrollY));
    };
    if (
        (requestAnimationFrame(e),
        window.addEventListener('resize', e, { passive: !0 }),
        window.visualViewport?.addEventListener('resize', e, { passive: !0 }),
        'ResizeObserver' in window)
    ) {
        new ResizeObserver(() => requestAnimationFrame(e)).observe($('main') || document.body);
    }
}
function loop() {
    ((state.raf = 0), state.hidden || updateParallax());
}
function scheduleMotionFrame() {
    state.hidden || state.raf || (state.raf = requestAnimationFrame(loop));
}
function heroOverlayHasAlpha(e) {
    try {
        const t = document.createElement('canvas');
        ((t.width = 128), (t.height = 72));
        const o = t.getContext('2d', { willReadFrequently: !0 });
        o.drawImage(e, 0, 0, t.width, t.height);
        const a = o.getImageData(0, 0, t.width, t.height).data;
        let i = 0,
            n = 0;
        for (let e = 3; e < a.length; e += 4) (a[e] < 245 && (i += 1), a[e] > 10 && (n += 1));
        return i > 0.1 * (a.length / 4) && n > 4;
    } catch (e) {
        return !1;
    }
}
function prepareHeroVideo(e) {
    return e
        ? e._zazaryPreparePromise
            ? e._zazaryPreparePromise
            : e.readyState >= 2 && e.currentSrc
              ? Promise.resolve(!0)
              : ((e._zazaryPreparePromise = new Promise((t) => {
                    const o = e.querySelector('source'),
                        a = o?.dataset.src || o?.getAttribute('src');
                    if (!o || !a) return t(!1);
                    let i = !1;
                    const n = (o) => {
                            i ||
                                ((i = !0),
                                clearTimeout(l),
                                e.removeEventListener('loadeddata', r),
                                e.removeEventListener('error', s),
                                t(Boolean(o && e.readyState >= 2)));
                        },
                        r = () => n(!0),
                        s = () => n(!1),
                        l = setTimeout(() => n(e.readyState >= 2), 25e3);
                    (e.addEventListener('loadeddata', r, { once: !0 }), e.addEventListener('error', s, { once: !0 }));
                    const c = (t) => {
                        (o.removeAttribute('data-src'),
                            o.removeAttribute('src'),
                            (e.src = t),
                            (e.preload = 'auto'),
                            e.load(),
                            e.readyState >= 2 && queueMicrotask(r));
                    };
                    'http:' === location.protocol || 'https:' === location.protocol
                        ? fetch(a, { cache: 'force-cache' })
                              .then((e) => {
                                  if (!e.ok) throw new Error('desktop hero fetch failed');
                                  return e.blob();
                              })
                              .then((e) => {
                                  const t = URL.createObjectURL(e);
                                  (state.heroVideoObjectUrls.push(t), c(t));
                              })
                              .catch(() => c(a))
                        : c(a);
                })),
                e._zazaryPreparePromise)
        : Promise.resolve(!1);
}
function prepareMobileHeroVideo(e) {
    return e && matchMedia('(max-width: 768px)').matches
        ? (state.mobileHeroPromise ||
              (state.mobileHeroPromise = new Promise((t) => {
                  const o = e.querySelector('source');
                  if (!o) return t(!1);
                  let a = !1;
                  const i = (o) => {
                          a ||
                              ((a = !0),
                              clearTimeout(s),
                              e.removeEventListener('loadeddata', n),
                              e.removeEventListener('error', r),
                              (state.mobileHeroReady = o),
                              t(o));
                      },
                      n = () => i(!0),
                      r = () => i(!1),
                      s = setTimeout(() => i(!1), 2e4);
                  (e.addEventListener('loadeddata', n, { once: !0 }), e.addEventListener('error', r, { once: !0 }));
                  const l = o.dataset.src || o.getAttribute('src'),
                      c = (t) => {
                          (o.removeAttribute('data-src'),
                              o.removeAttribute('src'),
                              (e.src = t),
                              (e.preload = 'auto'),
                              e.load());
                      };
                  if (!l) return i(!1);
                  ('http:' === location.protocol || 'https:' === location.protocol
                      ? fetch(l, { cache: 'force-cache' })
                            .then((e) => {
                                if (!e.ok) throw new Error('mobile hero fetch failed');
                                return e.blob();
                            })
                            .then((e) => {
                                ((state.mobileHeroObjectUrl = URL.createObjectURL(e)), c(state.mobileHeroObjectUrl));
                            })
                            .catch(() => c(l))
                      : c(l),
                      e.readyState >= 2 && queueMicrotask(n));
              })),
          state.mobileHeroPromise)
        : Promise.resolve(!0);
}
function playMobileHeroVideo() {
    const e = $('#heroMobileVideo');
    if (!e || !matchMedia('(max-width: 768px)').matches || document.hidden) return Promise.resolve(!1);
    ((e.muted = !0), (e.defaultMuted = !0), (e.playsInline = !0));
    const t = () => {
        const t = e.play();
        return t && 'function' == typeof t.then ? t.then(() => !0).catch(() => !1) : Promise.resolve(!e.paused);
    };
    return e.readyState >= 2 ? t() : prepareMobileHeroVideo(e).then((e) => !!e && t());
}
function initMobileHeroVideo() {
    const e = $('#heroMobileVideo');
    if (!e || !matchMedia('(max-width: 768px)').matches) return;
    if (!mobileHeroVideoAllowed()) return;
    const t = () =>
        playMobileHeroVideo().then((e) => {
            e &&
                (document.body.classList.add('hero-mobile-video-ready'),
                window.removeEventListener('pointerdown', t),
                window.removeEventListener('touchend', t),
                window.removeEventListener('click', t));
        });
    (e.addEventListener('playing', () => {
        !e.paused &&
            e.readyState >= 2 &&
            ((state.mobileHeroReady = !0), document.body.classList.add('hero-mobile-video-ready'));
    }),
        e.addEventListener('loadeddata', t, { once: !0 }),
        window.addEventListener('pointerdown', t, { passive: !0 }),
        window.addEventListener('touchend', t, { passive: !0 }),
        window.addEventListener('click', t, { passive: !0 }),
        whenSettled(() => prepareMobileHeroVideo(e)).then(t));
}
function activateHeroVideos() {
    if (
        !matchMedia('(min-width: 769px)').matches ||
        reducedMotion() ||
        navigator.connection?.saveData ||
        state.optimized ||
        state.hidden
    )
        return Promise.resolve(!1);
    if (state.heroVideoReady)
        return (document.body.classList.add('hero-video-ready'), playVideos(), Promise.resolve(!0));
    if (state.heroVideoPromise) return state.heroVideoPromise;
    const e = [state.els.vidBack, state.els.vidMid, state.els.vidFront].filter(Boolean);
    return (
        (state.heroVideoPromise = Promise.resolve(state.heroReady)
            .then(async () => {
                if (state.optimized || state.hidden || 3 !== e.length) return !1;
                if (!(await Promise.all(e.map(prepareHeroVideo))).every(Boolean) || state.optimized || state.hidden)
                    return !1;
                if (!heroOverlayHasAlpha(state.els.vidMid) || !heroOverlayHasAlpha(state.els.vidFront))
                    return (e.forEach((e) => e.pause()), !1);
                e.forEach((e) => {
                    e.pause();
                    try {
                        e.currentTime = 0;
                    } catch (e) {}
                });
                return (
                    !!(
                        await Promise.all(
                            e.map((e) =>
                                e
                                    .play()
                                    .then(() => !0)
                                    .catch(() => !1)
                            )
                        )
                    ).every(Boolean) &&
                    (await new Promise((e) => requestAnimationFrame(() => requestAnimationFrame(e))),
                    (state.heroVideoReady = !0),
                    document.body.classList.add('hero-video-ready'),
                    !0)
                );
            })
            .then((e) => (e || (state.heroVideoPromise = null), e))
            .catch(() => ((state.heroVideoPromise = null), !1))),
        state.heroVideoPromise
    );
}
function initHeroVideoSources() {
    if (!matchMedia('(min-width: 769px)').matches || reducedMotion() || navigator.connection?.saveData) return;
    const e = () => {
        activateHeroVideos();
    };
    (window.addEventListener('pointerdown', e, { once: !0, passive: !0 }),
        window.addEventListener('keydown', e, { once: !0 }),
        Promise.resolve(state.heroReady).then(e));
}
function playVideos() {
    !state.heroVideoReady ||
        state.optimized ||
        state.hidden ||
        $$('.bg-video').forEach((e) => {
            e.querySelector('source[src]') && e.paused && e.play().catch(() => {});
        });
}
function initCardGlow() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || reducedMotion()) return;
    const e = [],
        t = new Set();
    let o = 0,
        a = 0;
    const i = (e, t, o) => Math.max(t, Math.min(o, e)),
        n = (e) => {
            const { card: t, current: o } = e;
            (t.style.setProperty('--tilt-x', `${o.tiltX.toFixed(3)}deg`),
                t.style.setProperty('--tilt-y', `${o.tiltY.toFixed(3)}deg`),
                t.style.setProperty('--card-lift', `${o.lift.toFixed(3)}px`),
                t.style.setProperty('--card-scale', o.scale.toFixed(5)),
                t.style.setProperty('--media-x', `${o.mediaX.toFixed(3)}px`),
                t.style.setProperty('--media-y', `${o.mediaY.toFixed(3)}px`),
                t.style.setProperty('--media-scale', o.mediaScale.toFixed(5)),
                t.style.setProperty('--mx', `${o.mx.toFixed(2)}%`),
                t.style.setProperty('--my', `${o.my.toFixed(2)}%`));
        },
        r = (e) => {
            const t = e.focused && !state.optimized;
            Object.assign(e.target, {
                tiltX: 0,
                tiltY: 0,
                lift: t ? -6 : 0,
                scale: t ? 1.006 : 1,
                mediaX: 0,
                mediaY: 0,
                mediaScale: t ? 1.018 : 1,
                mx: 50,
                my: 30
            });
        },
        s = (e) => {
            (t.add(e), o || ((a = performance.now()), (o = requestAnimationFrame(l))));
        },
        l = (e) => {
            o = 0;
            const i = Math.min(0.05, Math.max(0.001, (e - a) / 1e3));
            a = e;
            const s = 1 - Math.exp(-13 * i);
            let c = !1;
            (t.forEach((e) => {
                state.optimized && ((e.inside = !1), r(e));
                let o = 0;
                (Object.keys(e.current).forEach((t) => {
                    const a = ((e, t, o) => e + (t - e) * o)(e.current[t], e.target[t], s);
                    ((e.current[t] = a), (o = Math.max(o, Math.abs(e.target[t] - a))));
                }),
                    n(e),
                    o > 0.015
                        ? (c = !0)
                        : (Object.assign(e.current, e.target),
                          n(e),
                          t.delete(e),
                          e.inside || e.focused || e.card.classList.remove('is-pointer-active')));
            }),
                (c || t.size) && (o = requestAnimationFrame(l)));
        },
        c = (e, t) => {
            if (state.optimized) return;
            const o = e.card.getBoundingClientRect();
            if (!o.width || !o.height) return;
            const a = i((t.clientX - o.left) / o.width, 0, 1),
                n = i((t.clientY - o.top) / o.height, 0, 1),
                r = 2 * a - 1,
                l = 2 * n - 1;
            (Object.assign(e.target, {
                tiltX: 2.8 * -l,
                tiltY: 3.4 * r,
                lift: -9,
                scale: 1.01,
                mediaX: 3.5 * -r,
                mediaY: 3.5 * -l,
                mediaScale: 1.035,
                mx: 100 * a,
                my: 100 * n
            }),
                s(e));
        };
    ($$('.portfolio-card').forEach((t) => {
        if (t.dataset.pointerMotionBound) return;
        ((t.dataset.pointerMotionBound = '1'), t.classList.add('has-pointer-motion'));
        const o = { tiltX: 0, tiltY: 0, lift: 0, scale: 1, mediaX: 0, mediaY: 0, mediaScale: 1, mx: 50, my: 30 },
            a = { card: t, current: { ...o }, target: { ...o }, inside: !1, focused: !1 };
        (e.push(a),
            n(a),
            t.addEventListener(
                'pointerenter',
                (e) => {
                    (e.pointerType && 'mouse' !== e.pointerType && 'pen' !== e.pointerType) ||
                        ((a.inside = !0), t.classList.add('is-pointer-active'), c(a, e));
                },
                { passive: !0 }
            ),
            t.addEventListener(
                'pointermove',
                (e) => {
                    a.inside && c(a, e);
                },
                { passive: !0 }
            ));
        const i = () => {
            ((a.inside = !1), r(a), s(a));
        };
        (t.addEventListener('pointerleave', i, { passive: !0 }),
            t.addEventListener('pointercancel', i, { passive: !0 }),
            t.addEventListener('focusin', () => {
                ((a.focused = !0), t.classList.add('is-pointer-active'), a.inside || r(a), s(a));
            }),
            t.addEventListener('focusout', (e) => {
                t.contains(e.relatedTarget) || ((a.focused = !1), a.inside || r(a), s(a));
            }));
    }),
        document.addEventListener('zazary:fx', () => {
            state.optimized &&
                e.forEach((e) => {
                    ((e.inside = !1), r(e), s(e));
                });
        }));
}
function syncFeaturedAspect() {
    const e = $('#card-flourite'),
        t = e?.querySelector('video.folio-video');
    if (!e || !t) return;
    const o = (t, o) => {
        t && o && e.style.setProperty('--ar', `${t} / ${o}`);
    };
    (t.videoWidth && o(t.videoWidth, t.videoHeight),
        t.addEventListener('loadedmetadata', () => o(t.videoWidth, t.videoHeight), { once: !0 }));
}
function initPortfolioImages() {
    const e = $$('.folio-photo[data-src]');
    return (
        (state.portfolioImagePromises = e.map(
            (e) =>
                new Promise((t) => {
                    const o = e.dataset.src;
                    if (!o) return t(e.complete && e.naturalWidth > 0);
                    ((e.loading = 'eager'), (e.fetchPriority = 'auto'), e.classList.add('is-loading'));
                    let a = !1;
                    const i = (o) => {
                            a ||
                                ((a = !0),
                                clearTimeout(s),
                                e.removeEventListener('load', n),
                                e.removeEventListener('error', r),
                                o && e.naturalWidth
                                    ? e.classList.replace('is-loading', 'is-loaded')
                                    : e.classList.remove('is-loading'),
                                t(Boolean(o && e.naturalWidth)));
                        },
                        n = () => i(!0),
                        r = () => i(!1);
                    (e.addEventListener('load', n, { once: !0 }), e.addEventListener('error', r, { once: !0 }));
                    const s = setTimeout(() => i(e.complete && e.naturalWidth > 0), 15e3);
                    (e.dataset.sizes && (e.sizes = e.dataset.sizes),
                        e.dataset.srcset && (e.srcset = e.dataset.srcset),
                        (e.src = o),
                        e.removeAttribute('data-src'),
                        e.removeAttribute('data-srcset'),
                        e.removeAttribute('data-sizes'),
                        e.complete && queueMicrotask(() => i(e.naturalWidth > 0)));
                })
        )),
        (state.portfolioImagesReady = Promise.all(state.portfolioImagePromises)),
        state.portfolioImagesReady
    );
}
function tuneVideoPlayback() {
    const e = $$('.folio-video'),
        t = window.matchMedia('(max-width: 640px)').matches,
        o = navigator.connection?.saveData,
        a = !(t || o || reducedMotion() || state.optimized);
    state.portfolioVideoObjectUrls ||= [];
    if (
        ((state.portfolioVideoPromises = e.map(
            (e) =>
                new Promise((t) => {
                    const o = $('source[data-src], source[src]', e),
                        i = o?.dataset.src || o?.getAttribute('src'),
                        n = e.dataset.poster || e.poster;
                    if (n) {
                        const t = document.createElement('img');
                        ((t.className = 'folio-still'),
                            (t.src = n),
                            (t.alt = ''),
                            (t.decoding = 'async'),
                            e.before(t),
                            (e.poster = n),
                            e.removeAttribute('data-poster'));
                    }
                    if (((e.preload = 'auto'), e.removeAttribute('autoplay'), !a)) return t(!0);
                    if (!o || !i) return t(!1);
                    let r = !1;
                    const s = (o) => {
                            if (r) return;
                            ((r = !0),
                                clearTimeout(d),
                                e.removeEventListener('loadeddata', l),
                                e.removeEventListener('error', c));
                            const a = o && e.readyState >= 2;
                            (a && e.classList.add('is-ready'), t(Boolean(a)));
                        },
                        l = () => s(!0),
                        c = () => s(!1),
                        d = setTimeout(() => s(e.readyState >= 2), 2e4);
                    (e.addEventListener('loadeddata', l, { once: !0 }), e.addEventListener('error', c, { once: !0 }));
                    const u = (t) => {
                        (o.removeAttribute('data-src'),
                            o.removeAttribute('src'),
                            (e.src = t),
                            e.load(),
                            e.readyState >= 2 && queueMicrotask(l));
                    };
                    'http:' === location.protocol || 'https:' === location.protocol
                        ? fetch(i, { cache: 'force-cache' })
                              .then((e) => {
                                  if (!e.ok) throw new Error('portfolio video fetch failed');
                                  return e.blob();
                              })
                              .then((e) => {
                                  const t = URL.createObjectURL(e);
                                  (state.portfolioVideoObjectUrls.push(t), u(t));
                              })
                              .catch(() => u(i))
                        : u(i);
                })
        )),
        (state.portfolioVideosReady = Promise.all(state.portfolioVideoPromises)),
        'IntersectionObserver' in window)
    ) {
        const t = new IntersectionObserver(
            (e) => {
                for (const t of e) {
                    const e = t.target;
                    t.isIntersecting && a ? e.play().catch(() => {}) : e.pause();
                }
            },
            { rootMargin: '320px 0px', threshold: 0.01 }
        );
        e.forEach((e) => t.observe(e));
    } else a && state.portfolioVideosReady.then(() => e.forEach((e) => e.play().catch(() => {})));
    return state.portfolioVideosReady;
}
function initKeyHandlers() {
    document.addEventListener('keydown', (e) => {
        if ('Escape' !== e.key) return;
        const t = $('#folioZoom');
        !t || t.hidden
            ? $('#briefModal')?.classList.contains('is-open')
                ? closeBriefModal()
                : $('#emailModal')?.classList.contains('is-open')
                  ? closeEmailModal()
                  : $('#wechatModal')?.classList.contains('is-open')
                    ? closeWechatModal()
                    : $('#folioModal')?.classList.contains('is-open')
                      ? closeModal()
                      : $('#mobileNavDrawer')?.classList.contains('is-open') && closeMobile()
            : closeZoom();
    });
}
function initAnchors() {
    document.addEventListener('click', (e) => {
        const t = e.target.closest('a[href^="#"]');
        if (!t) return;
        const o = t.getAttribute('href').slice(1);
        o && document.getElementById(o) && (e.preventDefault(), scrollToId(o), closeMobile(), playVideos());
    });
}
async function boot() {
    (document.body.classList.remove('no-js'), (document.body.dataset.state = 'loading'));
    const e = buildEmail();
    ($$('[data-email-here]').forEach((t) => {
        t.textContent = e;
    }),
        $$('[data-x-href]').forEach((e) => {
            e.setAttribute('href', 'https://x.com/ZazaryXS');
        }),
        (state.els.hero = $('#hero')),
        (state.els.bg = $('#parallaxBg')),
        (state.els.heroId = $('#heroIdentity')),
        (state.els.vidBack = $('.video-layer-1')),
        (state.els.vidMid = $('.video-layer-2')),
        (state.els.vidFront = $('.video-layer-3')),
        initFxPrompt(),
        initMobileNav(),
        initPortfolio(),
        initReveal(),
        initKeyHandlers(),
        initAnchors());
    const t = $('.skip-link');
    (t &&
        t.addEventListener('click', () => {
            const e = $('#main');
            e && setTimeout(() => e.focus({ preventScroll: !0 }), 0);
        }),
        initMobileHeroVideo(),
        initCardGlow(),
        initPortfolioImages(),
        tuneVideoPlayback(),
        initPreloader(),
        initHeroVideoSources(),
        syncFeaturedAspect(),
        syncHeroCtaGhost(),
        bindExperienceCollapse(),
        bindExperienceSort(),
        bindFaqCollapse(),
        bindPriceCurrency(),
        initWorkDeepLink(),
        initWechatModal(),
        initEmailModal(),
        initBriefDialog(),
        ensureInitialI18n());
    const o = $('#langSwitch'),
        a = document.querySelector('.lang-toggle');
    (a && a.setAttribute('data-pos', state.lang),
        a &&
            $$('.lang-label', a).forEach((e) => {
                e.addEventListener('click', (t) => {
                    t.preventDefault();
                    const o = e.dataset.langLabel;
                    o && o !== state.lang && (a.setAttribute('data-pos', o), setLanguage(o));
                });
            }),
        o &&
            ((o.checked = !1),
            o.addEventListener('change', () => {
                setLanguage({ en: 'ru', ru: 'ja', ja: 'zh', zh: 'en' }[state.lang] || 'en');
            })),
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                try {
                    state.sakura = new Sakura($('#sakuraContainer'));
                } catch (e) {}
            })
        ),
        initSpyMetrics());
    let i = 0;
    const n = () => {
        i ||
            (i = requestAnimationFrame(() => {
                ((i = 0),
                    (state.scrollY = window.scrollY || window.pageYOffset || 0),
                    updateChrome(),
                    spy(),
                    updateParallax(state.scrollY));
            }));
    };
    (window.addEventListener(
        'scroll',
        () => {
            (n(), clearTimeout(scrollSettleTimer), (scrollSettleTimer = setTimeout(n, 80)));
        },
        { passive: !0 }
    ),
        window.addEventListener('scrollend', n, { passive: !0 }),
        document.addEventListener('visibilitychange', () => {
            ((state.hidden = document.hidden),
                state.hidden
                    ? (cancelAnimationFrame(state.raf),
                      $$('.bg-video').forEach((e) => e.pause()),
                      $('#heroMobileVideo')?.pause())
                    : (playVideos(),
                      playMobileHeroVideo().then((e) => {
                          e && document.body.classList.add('hero-mobile-video-ready');
                      }),
                      scheduleMotionFrame()));
        }),
        ['click', 'touchstart', 'keydown'].forEach((e) => window.addEventListener(e, playVideos, { passive: !0 })));
}
'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', boot) : boot();
