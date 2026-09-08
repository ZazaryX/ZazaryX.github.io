/* zazary site - main bundle
   ========================================================================
   single file, no framework, no build step. runs as ES module in the
   browser. structure (top-down):

     1. constants        - lang/fx/config stuff
     2. state           - mutable in-memory state (lang, modals, sort, ...)
     3. helpers         - DOM, i18n, throttle, escape
     4. i18n load/apply - fetches data/i18n.<lang>.json and writes to DOM
     5. renders         - one fn per section: skills, about, value, uses,
                          timeline, faq, price, contact grid, hw
     6. UI bindings     - mobile drawer, lang switch, price currency,
                          email/wechat modals, sort toggle, preloader
     7. reveal & FX     - safe scroll entrances, smooth shadows, sakura, parallax
     8. boot            - async entry: load i18n, render, hook up listeners

   rule of thumb: if you add a feature, put it in the matching section and
   keep the file flat. no classes, no reactive system - just functions that
   touch the DOM and read/write `state`.
   ======================================================================== */

const I18N_BASE = 'data/i18n.';
const LANGS = ['en', 'ru', 'ja', 'zh'];
const LANG_CUR = { en: 'USD', ru: 'RUB', ja: 'JPY', zh: 'CNY' };
const LANG_LABEL = { en: 'EN', ru: 'RU', ja: '日', zh: '中' };
/* Fixed FX rates (no API) - manually maintained, last updated 2026 */
const FX_RATES = {
    USD: 1,        // base
    RUB: 85,       // 1 USD = 85 RUB
    JPY: 150,      // 1 USD = 150 JPY
    CNY: 7.3       // 1 USD = 7.3 CNY
};

// shortcut helpers
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const safeText = (v) => (v == null ? '' : String(v));

// safe dom builder. no innerHTML for any user data, only known-safe text.
// attrs: { class, text, html, dataset, on*, ... } + true for boolean attrs
function el(tag, attrs = null, children = []) {
    const node = document.createElement(tag);
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            if (v == null || v === false) continue;
            if (k === 'class') node.className = v;
            else if (k === 'text') node.textContent = v;
            else if (k === 'html' && typeof v === 'string') {
                /* Only for trusted internal HTML (i18n bundle from same origin) */
                node.innerHTML = v;
            }
            else if (k.startsWith('on') && typeof v === 'function') {
                node.addEventListener(k.slice(2).toLowerCase(), v);
            }
            else if (k === 'dataset' && typeof v === 'object') {
                for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
            }
            else if (v === true) node.setAttribute(k, '');
            else node.setAttribute(k, v);
        }
    }
    for (const child of [].concat(children)) {
        if (child == null) continue;
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
}

/* deep-get by dotted path; returns fallback if any segment missing */
function iconEl(className = '') {
    const wrapper = el('i', { class: className, 'aria-hidden': 'true' });
    const iconName = String(className).split(/\s+/)
        .find((name) => name.startsWith('fa-') && name !== 'fa-solid' && name !== 'fa-brands');
    if (!iconName) return wrapper;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'fa-icon-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `images/icons.svg#icon-${iconName.slice(3)}`);
    svg.appendChild(use);
    wrapper.appendChild(svg);
    return wrapper;
}

function getPath(obj, path, fallback) {
    if (!obj || !path) return fallback;
    const parts = String(path).split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur == null) return fallback;
        cur = cur[p];
    }
    return cur == null ? fallback : cur;
}


/* ---------- experienceHtml fallback (inlined for resilience) ---------- */
/* If data/i18n.*.json on disk is stale or missing experienceHtml, these
   inlined bodies are used as a fallback so the experience timeline
   always renders. Keep in sync with data/i18n.{en,ru}.json. */
const EXPERIENCE_HTML_EN = {
  "noxyrium": `<p>serving as technical director of <strong>noxyrium</strong> - an atmospheric minecraft server currently in active development. responsible for the full technical vision of the project: server architecture design, performance optimisation, custom plugin development, and infrastructure management. coordinating the technical team and ensuring the stability and scalability of core systems as the project grows toward release.</p>`,
  "animation": `<p>producing original animation content across both 2d and 3d pipelines. in blender, working with full character and object rigging, keyframe animation, and cinematic rendering. in after effects, specialising in layer separation and compositing - animating individual elements to produce clean motion graphics, gfx packages, and video intros. currently learning live2d, 3d animation, fx, and montage alongside that pipeline.</p>`,
  "website": `<p>designing and developing this portfolio site from scratch using vanilla html, css, and javascript - no frameworks. implementing parallax video layers, language switching, sakura, a custom cursor, and an effects toggle. the project is both a live portfolio and a lab for pure front-end.</p>`,
  "design": `<p>developing a comprehensive design practice spanning visual identity, ui composition, typography, and branding. creating avatars, gfx assets, thumbnails, and promotional materials using photoshop, after effects, and blender. experimenting with motion and animation to produce dynamic visual content that communicates brand personality and aesthetic vision.</p>`,
  "opengl": `<p>building a low-level 3d rendering engine using modern opengl, glfw, glad, and glm. developing custom vertex and fragment shaders in glsl, implementing mvp transformation pipelines, lighting models, and geometry rendering systems. this work sits alongside training as a technical artist; hlsl is next - custom shaders for real-time lookdev, without hiding behind high-level abstractions.</p>`,
  "drawing": `<p>learning to draw in <strong>anime style</strong> - anatomy, gesture, perspective, stylization, and colour theory. daily practice in clip studio paint: character sheets, gesture sketches, and finished illustrations. this is the path to making my own character IP instead of relying on reference artists.</p>`,
  "northmine": `<p>developed and maintained core functionality for the <a href="https://northmine.ru" target="_blank" rel="noopener noreferrer">northmine.ru</a> minecraft server - an atmospheric project with unique gameplay mechanics. responsible for server architecture, custom plugin development, performance profiling, and deployment. gained hands-on experience in live production server management and game-logic systems.</p>`,
  "reverse": `<p>dedicated study of reverse engineering methodologies - static analysis with ida pro, dynamic analysis with cheat engine, low-level nasm assembly, and windows api internals. analysed compiled executables, deconstructed game engine logic, and developed custom tools for memory manipulation and process injection. this period established a strong foundation in binary analysis and security-adjacent programming.</p>`,
  "cpp": `<p>deep dive into c++ - moving beyond syntax to master memory management, pointer arithmetic, object-oriented design patterns, and low-level windows api programming. wrote system utilities, process managers, and performance-critical tools. this period shaped a rigorous, efficiency-first approach to software development that continues to inform all technical work.</p>`,
  "blender": `<p>first serious engagement with 3d - learning blender for modelling, uv unwrapping, texturing, rigging, and animating assets for use in game engines. worked on complete asset pipelines from concept to export, building foundational knowledge of 3d space, topology, and the visual principles that underpin all subsequent creative and technical 3d work.</p>`,
  "unity": `<p>developed multiple game prototypes in unity - learning physics systems, collider interactions, scene management, and c# scripting within the unity ecosystem. this was the transition from pure programming to interactive experiences, and established the connection between code and real-time visual output that drives much of the current work.</p>`,
  "csharp": `<p>the starting point - first full-scale project written in c#, studying object-oriented programming, class design, and software architecture fundamentals. this was the moment that crystallised a serious interest in programming as a craft, setting the direction for everything that followed.</p>`,
  "ta": `<p>technical artist role at <strong>goo engineering</strong> - building render pipelines, character shaders, and asset workflows for the studio. focus on blender, after effects, and shader authoring; close collaboration with modellers and riggers to ship assets that are clean, optimised, and production-ready.</p>`,
  "maya": `<p>currently learning <strong>autodesk maya</strong> as a third 3d package alongside blender and after effects. focus on industry-standard rigging, character animation, and studio pipelines - so portfolio work in 3d can ship in a professional workflow.</p>`,
  "live2d": `<p>studying <strong>live2d</strong> for character rig and animation - the format used in vtuber and gacha workflows. building a portfolio piece around the toji character (see <em>toji 2d</em> in the portfolio section).</p>`,
};

const EXPERIENCE_HTML_RU = {
  "noxyrium": `<p>Технический директор <strong>Noxyrium</strong> - атмосферного Minecraft-сервера в активной разработке. Отвечаю за всё техническое видение проекта: архитектуру серверов, оптимизацию производительности, разработку плагинов и управление инфраструктурой. Координирую техническую команду и слежу за стабильностью и масштабируемостью ядра по мере движения к релизу.</p>`,
  "animation": `<p>Создаю оригинальный анимационный контент в двух пайплайнах. В Blender - полный риг персонажей и объектов, кейфреймовая анимация и кинематографический рендер. В After Effects - разделение слоёв и композитинг: анимирую отдельные элементы, собираю чистую моушн-графику, GFX-пакеты и видеоинтро. Сейчас параллельно учусь Live2D, 3D-анимации, FX и монтажу.</p>`,
  "website": `<p>Проектирую и разрабатываю этот портфолио-сайт с нуля на ванильных HTML, CSS и JavaScript - без фреймворков. Реализовал параллакс видеослоёв, переключение языков, сакуру, свой курсор и переключатель эффектов. Проект - и живое портфолио, и лаборатория чистого фронтенда.</p>`,
  "design": `<p>Развиваю практику в визуальной идентичности, UI-композиции, типографике и брендинге. Делаю аватары, GFX-ассеты, обложки и промо-материалы в Photoshop, After Effects и Blender. Экспериментирую с движением, чтобы визуальный язык передавал характер и эстетику.</p>`,
  "opengl": `<p>Собираю низкоуровневый 3D-рендерер на современном OpenGL, GLFW, GLAD и GLM. Пишу собственные вершинные и фрагментные шейдеры на GLSL, реализую MVP-трансформации, модели освещения и системы вывода геометрии. Эта работа идёт рука об руку с учёбой на Technical Artist; следующий язык на пути - HLSL: собственные шейдеры для lookdev в реальном времени, без высокоуровневых абстракций.</p>`,
  "drawing": `<p>учусь рисовать в <strong>аниме-стиле</strong> - анатомия, жест, перспектива, стилизация и теория цвета. ежедневная практика в clip studio paint: персонажные листы, жестовые наброски и готовые иллюстрации. это путь к тому, чтобы делать собственный IP, а не зависеть от художников на референсе.</p>`,
  "northmine": `<p>Разрабатывал и поддерживал ключевой функционал Minecraft-сервера <a href="https://northmine.ru" target="_blank" rel="noopener noreferrer">northmine.ru</a> - атмосферного проекта с собственной механикой. Отвечал за архитектуру сервера, разработку плагинов, профилирование производительности и деплой. Получил живой опыт сопровождения продакшен-сервера и игровой логики.</p>`,
  "reverse": `<p>Целенаправленно изучал методики реверс-инжиниринга: статический анализ в IDA Pro, динамический - в Cheat Engine, низкоуровневый ассемблер NASM и внутренности Windows API. Разбирал скомпилированные исполняемые файлы, логику игровых движков и писал собственные инструменты для работы с памятью и инъекций. Этот период заложил фундамент в анализе бинарников и смежном с безопасностью программировании.</p>`,
  "cpp": `<p>Глубокое погружение в C++ - не синтаксис, а управление памятью, арифметика указателей, паттерны ООП и низкоуровневый Windows API. Писал системные утилиты, менеджеры процессов и критичные к производительности инструменты. Тогда сложился жёсткий, «сначала эффективность» подход, который до сих пор определяет техническую работу.</p>`,
  "blender": `<p>Первое серьёзное знакомство с 3D - Blender: моделирование, UV-развёртка, текстурирование, риггинг и анимация ассетов для игровых движков. Собирал пайплайн от концепта до экспорта и заложил понимание 3D-пространства, топологии и визуальных принципов, на которых держится вся последующая 3D-работа.</p>`,
  "unity": `<p>Собрал несколько игровых прототипов в Unity: физика, коллайдеры, управление сценами и скриптинг на C#. Это был переход от чистого программирования к интерактивному опыту - и связь кода с картинкой в реальном времени, которая до сих пор ведёт большую часть работы.</p>`,
  "csharp": `<p>Точка отсчёта - первый полноценный проект на C#: объектно-ориентированное программирование, проектирование классов и основы архитектуры. Тогда программирование стало ремеслом, а не хобби, и задало направление всему, что было дальше.</p>`,
  "ta": `<p>technical artist в <strong>goo engineering</strong> - собираю рендер-пайплайны, шейдеры персонажей и рабочие процессы для ассетов студии. основной стек - blender, after effects и написание шейдеров; плотная работа с моделлерами и риггерами, чтобы ассеты выходили чистыми, оптимизированными и готовыми к продакшену.</p>`,
  "maya": `<p>сейчас изучаю <strong>autodesk maya</strong> как третий 3D-пакет рядом с blender и after effects. фокус - индустриальный риггинг, анимация персонажей и студийные пайплайны, чтобы портфолио в 3D можно было вести в профессиональном workflow.</p>`,
  "live2d": `<p>изучаю <strong>live2d</strong> - риг и анимация персонажей в формате, который используют вайтуберы и гача-проекты. портфолио строится вокруг персонажа toji (смотри <em>toji 2d</em> в разделе портфолио).</p>`,
};

/* ---------- state ---------- */

/* Email address is built at runtime — never as a literal `mailto:` or
   plain `@example.com` substring in static HTML, so Cloudflare's
   email-obfuscation script (which auto-replaces both patterns) cannot
   rewrite the page. The pieces are joined at click time. */
const EMAIL_USER = ['zazaryxs'].join('');
const EMAIL_DOMAIN = ['gmail.com'].join('');
const buildEmail = () => `${EMAIL_USER}@${EMAIL_DOMAIN}`;
const buildMailto = () => 'ma' + 'ilt' + 'o:' + buildEmail();

const state = {
    lang: LANGS.includes(localStorage.getItem('zazary.lang')) ? localStorage.getItem('zazary.lang') : 'en',
    optimized: false,
    fxAuto: false,
    scrollY: 0,
    raf: 0,
    hidden: false,
    i18n: null,
    sakura: null,
    els: {},
    lastFocus: null,
    currency: localStorage.getItem('zazary.cur') || 'RUB',  // RUB or USD or JPY or CNY
    experienceSort: localStorage.getItem('zazary.experienceSort') === 'desc' ? 'desc' : 'asc', // 'asc' = oldest first, 'desc' = newest first
    portfolioFilter: 'all',
    portfolioTransition: null,
    heroHeight: Math.max(480, screen.height || 900),
    viewportHeight: Math.max(480, screen.height || 900),
    heroReady: null,
    heroVideoReady: false,
    heroVideoPromise: null
};

// Per-element motion belongs in WeakMaps rather than persistent user state.
// Entries disappear with re-rendered FAQ nodes and cannot leak stale animation
// handles into the next language render.
const detailsMotion = new WeakMap();
let revealObserver = null;
let scrollSettleTimer = 0;

/* Convert a price string like "from 1 500 rub" to a different currency.
   Uses fixed rates from FX_RATES (no API). Strips spaces inside numbers,
   parses, converts, formats with no float drift. */
/* Split "from 1 500 ₽" / "from $18" into { num: "1500", sym: "₽" } for separate styling.
   Number may have spaces (1 500) and may be preceded by $ (e.g. "from $18") */
function splitPrice(priceStr) {
    if (!priceStr) return { num: '', sym: '' };
    // strip "from " prefix
    const stripped = priceStr.replace(/^from\s+/i, '');
    // try leading symbol: $, ₽, ¥, ￥
    const symMatch = stripped.match(/^([\$₽¥￥])\s*(.+)$/);
    if (symMatch) {
        return { num: symMatch[2].trim(), sym: symMatch[1] };
    }
    // else trailing symbol
    const m = stripped.match(/^([\d\s]+?)\s*([\$₽¥￥])$/);
    if (m) return { num: m[1].trim(), sym: m[2] };
    return { num: stripped.trim(), sym: '' };
}

/* Round to a "natural" step for each currency so prices look clean:
     RUB: step 50  (500, 1500, 4000)   no 480 or 2647
     USD: step 1   (6, 18, 47)
     JPY: step 10  (880, 2650, 7060)
     CNY: step 1   (43, 129, 344) */
/* Round to a clean step per currency so prices look uniform and natural:
     RUB: step 50   (500 / 1500 / 4000)
     USD: step 5    (5 / 20 / 45)        no 6, 18, 47
     JPY: step 50   (900 / 2650 / 7050)  no 880, 2647, 7059
     CNY: step 5    (45 / 130 / 345)     no 43, 129, 344 */
function roundFor(cur, value) {
    const step = { RUB: 50, USD: 5, JPY: 50, CNY: 5 }[cur] || 50;
    return Math.round(value / step) * step;
}

/* Normalise a price string to { num, srcCur } regardless of source language.
   Supports "from 1 500 rub", "от 1 500 ₽", "1 500 руб", "1500₽", etc. */
function normalisePrice(priceStr) {
    if (!priceStr || typeof priceStr !== 'string') return null;
    const noPrefix = priceStr.replace(/^(from|от)\s+/i, '');
    const numMatch = noPrefix.match(/(\d[\d\s]*)/);
    if (!numMatch) return null;
    const num = parseInt(numMatch[1].replace(/\s+/g, ''), 10);
    if (!num) return null;
    const lower = noPrefix.toLowerCase();
    let srcCur;
    if (/₽|руб|rub/.test(lower)) srcCur = 'RUB';
    else if (/\$|usd/.test(lower)) srcCur = 'USD';
    else if (/¥|jpy/.test(lower)) srcCur = 'JPY';
    else if (/￥|cny/.test(lower)) srcCur = 'CNY';
    else srcCur = 'RUB';
    return { num, srcCur };
}

function convertPrice(priceStr, targetCur) {
    if (!priceStr || typeof priceStr !== 'string') return priceStr;
    const norm = normalisePrice(priceStr);
    if (!norm) return priceStr;
    const { num, srcCur } = norm;
    const curSym = { RUB: '₽', USD: '$', JPY: '¥', CNY: '￥' };
    const inUsd = num / FX_RATES[srcCur];
    const out = roundFor(targetCur, inUsd * FX_RATES[targetCur]);
    const formatted = out.toLocaleString('ru-RU').replace(/,/g, ' ');
    return 'from ' + formatted + ' ' + curSym[targetCur];
}

/* ---------- i18n: load & apply ----------
   We bundle translations in `data/i18n.<lang>.json` and fetch on boot.
   The `?v=N` cache buster is bumped every time we edit the JSONs - the
   browser will keep serving the cached file otherwise. The fetch uses
   `cache: 'reload'` to bypass HTTP cache and force a fresh copy, which
   is what we want for development. In prod you could drop that.

   `applyI18n` runs AFTER every render: it walks the DOM and replaces
   text in [data-i18n] and [data-i18n-aria] nodes. So most copy changes
   in the JSON files take effect without touching this file at all -
   just bump the `v` and refresh.
*/
async function loadI18n(lang) {
    if (!LANGS.includes(lang)) lang = 'en';
    const v = '17';
    const res = await fetch(I18N_BASE + lang + '.json?v=' + v);
    if (!res.ok) throw new Error('i18n fetch failed: ' + res.status);
    return res.json();
}

function applyStaticI18n(t) {
    /* textContent for all data-i18n nodes */
    $$('[data-i18n]').forEach((node) => {
        const v = getPath(t, node.dataset.i18n, null);
        if (v != null) node.textContent = v;
    });
    /* aria-label for nodes marked with data-i18n-aria */
    $$('[data-i18n-aria]').forEach((node) => {
        const v = getPath(t, node.dataset.i18nAria, null);
        if (v != null) node.setAttribute('aria-label', v);
    });
    document.documentElement.lang = t.htmlLang || state.lang;
    document.body.classList.toggle('lang-en', state.lang === 'en');
    document.body.classList.toggle('lang-ru', state.lang === 'ru');
}

function renderValueGrid(t) {
    const root = $('#valueGrid');
    if (!root) return;
    root.replaceChildren();
    (t.value.items || []).forEach((v) => {
        const headChildren = [];
        if (v.icon) headChildren.push(iconEl(v.icon));
        headChildren.push(el('h3', { text: v.t }));
        root.appendChild(el('article', { class: 'value-card reveal' }, [
            el('div', { class: 'value-card-head' }, headChildren),
            el('p', { text: v.b })
        ]));
    });
}

function renderUses(t) {
    const root = $('#useGrid');
    if (!root) return;
    root.replaceChildren();
    Object.entries(t.uses).forEach(([key, group]) => {
        if (key === 'lead') return;
        const itemIcons = group.icons || {};
        const ul = el('ul', null, (group.items || []).map((itemName) => {
            const iconCls = itemIcons[itemName];
            if (iconCls) {
                return el('li', null, [
                    iconEl(iconCls),
                    el('span', { text: itemName })
                ]);
            }
            return el('li', { text: itemName });
        }));
        const headerChildren = [];
        if (group.icon) headerChildren.push(iconEl(group.icon));
        headerChildren.push(el('h3', { text: group.h }));
        root.appendChild(el('article', { class: 'use-group reveal' }, [
            el('div', { class: 'use-group-head' }, headerChildren),
            ul
        ]));
    });
}

function renderSkills(t) {
    const root = $('#skillGroups');
    if (!root) return;
    root.replaceChildren();
    // Skill groups - what i actually work in, organised by domain.
    // Each entry: { skill: i18n key, icon: FA class, name: visible label }.
    // The short description under the name comes from i18n.skillCopy.<skill>.
    // If a key is missing, we fall back to a literal "no description" string.
    const map = {
        languages: [
            { skill: 'cpp',    icon: 'fa-solid fa-memory',                  name: 'C++' },
            { skill: 'csharp', icon: 'fa-brands fa-microsoft',              name: 'C#' },
            { skill: 'python', icon: 'fa-brands fa-python',                 name: 'Python' },
            { skill: 'asm',    icon: 'fa-solid fa-terminal',                name: 'NASM / Assembly' },
            { skill: 'html',   icon: 'fa-solid fa-layer-group',             name: 'HTML / JS' }
        ],
        systems: [
            { skill: 'winapi',       icon: 'fa-solid fa-window-maximize',         name: 'WinAPI' },
            { skill: 'ida',          icon: 'fa-solid fa-magnifying-glass-chart',  name: 'IDA Pro' },
            { skill: 'cheatengine',  icon: 'fa-solid fa-wrench',                  name: 'Cheat Engine' },
            { skill: 'imgui',        icon: 'fa-solid fa-robot',                   name: 'imgui / Selenium' }
        ],
        realtime: [
            { skill: 'opengl', icon: 'fa-solid fa-cubes',                    name: 'OpenGL / GLSL' },
            { skill: 'unity',  icon: 'fa-brands fa-unity',                   name: 'Unity' }
        ],
        image: [
            { skill: 'photoshop',  icon: 'fa-solid fa-image',       name: 'Photoshop' },
            { skill: 'clipstudio', icon: 'fa-solid fa-palette',     name: 'Clip Studio Paint' },
            { skill: 'design',     icon: 'fa-solid fa-pen-nib',     name: 'Design & GFX' }
        ],
        motion: [
            { skill: 'blender',       icon: 'fas fa-shapes',          name: 'Blender / Goo Engine' },
            { skill: 'aftereffects',  icon: 'fa-solid fa-photo-film', name: 'After Effects' },
            { skill: 'animation',     icon: 'fa-solid fa-film',       name: '2D, 3D & Live2D' }
        ]
    };
    for (const [key, items] of Object.entries(map)) {
        const title = el('h3', { class: 'skill-group-title', text: t.skillGroups[key] || key });
        const cards = el('div', { class: 'skills' }, items.map((it) => {
            return el('article', { class: 'skill-card reveal', 'data-skill': it.skill }, [
                iconEl(it.icon),
                el('h3', { text: it.name }),
                el('p', { text: getPath(t, ['skillCopy', it.skill], '') })
            ]);
        }));
        root.appendChild(el('div', { class: 'skill-group' }, [title, cards]));
    }
}

function renderTimeline(t) {
    const root = $('#timeline');
    if (!root) return;
    root.replaceChildren();
    // Chronological source order (oldest first). Render order respects
    // state.experienceSort: 'asc' = as-is (oldest first, top of timeline),
    // 'desc' = reversed (newest first, top of timeline).
    const srcOrder = ['csharp','unity','blender','cpp','reverse','opengl','design','animation','drawing','website','northmine','live2d','maya','ta','noxyrium'];
    const order = state.experienceSort === 'desc' ? srcOrder.slice().reverse() : srcOrder.slice();
    let rendered = 0;
    const fallback = (state.lang === 'ru' ? EXPERIENCE_HTML_RU : EXPERIENCE_HTML_EN) || {};
    order.forEach((key) => {
        const rec = t.experience[key];
        let body = getPath(t, ['experienceHtml', key], '');
        if (!body && fallback[key]) body = fallback[key];
        if (!rec || !body) return;
        const item = el('article', { class: 'timeline-item', 'data-exp': key }, [
            el('div', { class: 'timeline-date', text: rec.date }),
            el('h3',   { class: 'timeline-title', text: rec.title }),
            el('div',  { class: 'timeline-content', html: body })
        ]);
        root.appendChild(item);
        rendered++;
    });
    // Update summary meta - year range + expand/collapse label
    updateExperienceMeta(t, rendered);
}

function updateExperienceMeta(t, count) {
    // The summary header shows two pills: a year-range pill (2020 — 2026)
    // and an action pill (tap to expand / collapse). Both are re-derived
    // from the i18n data on every render and on <details> toggle so the
    // range always reflects the currently rendered order. We extract all
    // 4-digit years from the experience dates and clamp to a sane range.
    const range = $('#expSummaryRange');
    const meta  = $('#expSummaryMeta');
    const details = $('#experienceCollapse');
    if (!range && !meta) return;
    const t2 = state.i18n || t;
    const order = ['csharp','unity','blender','cpp','reverse','opengl','design','animation','drawing','website','northmine','live2d','maya','ta','noxyrium'];
    const years = order
        .map((k) => t.experience[k]?.date || '')
        .flatMap((s) => s.match(/\d{4}/g) || [])
        .map(Number)
        .filter((y) => y > 1990 && y < 2100);
    if (range) {
        range.textContent = years.length ? (Math.min(...years) + ' — ' + Math.max(...years)) : '';
    }
    if (meta && details) {
        const isOpen = details.open;
        const label = isOpen ? (t2.experienceExpanded || 'collapse') : (t2.experienceCollapsed || 'tap to expand');
        meta.textContent = label;
    }
}

function bindCollapseChromeRefresh(panel) {
    if (!panel || panel.dataset.chromeRefreshBound) return;
    panel.dataset.chromeRefreshBound = '1';
    const refresh = (event) => {
        if (event.target === panel) updateChrome();
    };
    panel.addEventListener('transitionend', refresh);
    panel.addEventListener('transitioncancel', refresh);
    panel.addEventListener('animationend', refresh);
    panel.addEventListener('animationcancel', refresh);
}

function measureClosedDetailsHeight(details, summary) {
    const style = getComputedStyle(details);
    const borders = (parseFloat(style.borderTopWidth) || 0) +
        (parseFloat(style.borderBottomWidth) || 0);
    return summary.getBoundingClientRect().height + borders;
}

function animateDetailsHeight(details, summary, shouldOpen, settings) {
    let motion = detailsMotion.get(details);
    if (!motion) {
        motion = { animation: null, targetOpen: null, timer: 0, run: 0 };
        detailsMotion.set(details, motion);
    }

    // Capture the currently painted height before cancelling an older run.
    // Repeated and rapid clicks therefore reverse from the visible frame.
    const startHeight = details.getBoundingClientRect().height;
    const run = ++motion.run;
    clearTimeout(motion.timer);
    if (motion.animation) {
        motion.animation.onfinish = null;
        motion.animation.cancel();
    }
    motion.animation = null;

    if (shouldOpen) details.open = true;
    details.classList.toggle('is-opening', shouldOpen);
    details.classList.toggle('is-closing', !shouldOpen);
    details.style.removeProperty('height');
    details.style.removeProperty('overflow');

    const endHeight = shouldOpen
        ? details.getBoundingClientRect().height
        : measureClosedDetailsHeight(details, summary);
    const duration = shouldOpen ? settings.openDuration : settings.closeDuration;

    details.style.height = `${startHeight}px`;
    details.style.overflow = 'hidden';
    details.dataset.animating = shouldOpen ? 'opening' : 'closing';
    motion.targetOpen = shouldOpen;

    const settle = (animation) => {
        if (motion.run !== run || motion.animation !== animation) return;
        clearTimeout(motion.timer);
        if (!shouldOpen) details.open = false;
        details.classList.remove('is-opening', 'is-closing');
        details.style.removeProperty('height');
        details.style.removeProperty('overflow');
        delete details.dataset.animating;
        motion.animation = null;
        motion.targetOpen = null;
        animation.onfinish = null;
        // `forwards` only bridges the finish callback; the native open/closed
        // layout becomes authoritative again immediately afterwards.
        animation.cancel();
        settings.onSettled?.(shouldOpen);
        updateChrome();
    };

    if (Math.abs(endHeight - startHeight) < 1) {
        // Defensive path for an empty/missing body. Normal FAQ and Experience
        // panels always have a measurable height difference.
        if (!shouldOpen) details.open = false;
        details.classList.remove('is-opening', 'is-closing');
        details.style.removeProperty('height');
        details.style.removeProperty('overflow');
        delete details.dataset.animating;
        motion.targetOpen = null;
        settings.onSettled?.(shouldOpen);
        return;
    }

    const animation = details.animate([
        { height: `${startHeight}px` },
        { height: `${endHeight}px` }
    ], {
        duration,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'forwards'
    });
    animation.id = settings.id;
    motion.animation = animation;
    animation.onfinish = () => settle(animation);
    // A backgrounded tab can pause its document timeline. This guard cleans up
    // the inline height when it resumes instead of leaving future clicks stale.
    motion.timer = setTimeout(() => settle(animation), duration + 600);
}

function bindExperienceCollapse() {
    const details = $('#experienceCollapse');
    if (!details || details.dataset.collapseBound) return;
    const summary = $('.experience-summary', details);
    if (!summary) return;
    details.dataset.collapseBound = '1';
    bindCollapseChromeRefresh($('.experience-container', details));

    summary.addEventListener('click', (event) => {
        // The sort button lives inside <summary> and owns its own click. Do not
        // turn a sort action into an accidental collapse action as it bubbles.
        if (event.defaultPrevented || event.target.closest('#expSortBtn')) return;
        if (reducedMotion() || state.optimized || typeof details.animate !== 'function') return;
        event.preventDefault();
        const motion = detailsMotion.get(details);
        const targetOpen = motion?.targetOpen == null ? details.open : motion.targetOpen;
        animateDetailsHeight(details, summary, !targetOpen, {
            id: 'experience-collapse',
            openDuration: 520,
            closeDuration: 440,
            onSettled: () => {
                if (state.i18n) updateExperienceMeta(state.i18n, $$('#timeline .timeline-item').length);
            }
        });
    });

    details.addEventListener('toggle', () => {
        if (state.i18n) updateExperienceMeta(state.i18n, $$('#timeline .timeline-item').length);
        updateChrome();
    });
}

function bindFaqCollapse() {
    $$('#faqList .faq-item').forEach((item) => {
        if (item.dataset.collapseBound) return;
        const summary = $('summary', item);
        if (!summary) return;
        item.dataset.collapseBound = '1';
        bindCollapseChromeRefresh($('.faq-answer', item));

        summary.addEventListener('click', (event) => {
            if (reducedMotion() || state.optimized || typeof item.animate !== 'function') return;
            event.preventDefault();
            const motion = detailsMotion.get(item);
            const targetOpen = motion?.targetOpen == null ? item.open : motion.targetOpen;
            // FAQ uses the same single measured animation in reverse, so hiding
            // an answer is just as smooth as revealing it and never runs twice.
            animateDetailsHeight(item, summary, !targetOpen, {
                id: 'faq-collapse',
                openDuration: 380,
                closeDuration: 320
            });
        });
        item.addEventListener('toggle', updateChrome);
    });
}

function bindExperienceSort() {
    // Sort toggle button: flips state.experienceSort between 'asc' (oldest
    // first, default) and 'desc' (newest first), persists the choice in
    // localStorage, and re-renders the timeline. The button is INSIDE a
    // <summary> so we have to stopPropagation + preventDefault to keep
    // it from also toggling the <details> open/close.
    //
    // Idempotent: we only attach the click handler once. The aria-label /
    // aria-pressed sync runs every time (cheap) so localisation is
    // reflected after `applyI18n` finishes on boot.
    const btn = $('#expSortBtn');
    if (!btn) return;
    if (!btn.dataset.sortBound) {
        btn.dataset.sortBound = '1';
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (state.experienceSort === 'asc') {
                state.experienceSort = 'desc';
            } else {
                state.experienceSort = 'asc';
            }
            localStorage.setItem('zazary.experienceSort', state.experienceSort);
            syncExperienceSortUi();
            if (state.i18n) {
                renderTimeline(state.i18n);
                initReveal();
            }
        });
    }
    syncExperienceSortUi();
}

function syncExperienceSortUi() {
    // Reflect state.experienceSort onto the button's ARIA attributes.
    // aria-pressed=true when the timeline is currently newest-first.
    // aria-label = what the button will do on next click ("oldest first"
    // when we're already in newest-first mode, and vice versa).
    const btn = $('#expSortBtn');
    if (!btn) return;
    btn.setAttribute('aria-pressed', state.experienceSort === 'desc' ? 'true' : 'false');
    if (state.i18n) {
        const t = state.i18n;
        const nextLabel = state.experienceSort === 'desc' ? (t.sortAsc || 'oldest first') : (t.sortDesc || 'newest first');
        btn.title = t.experienceSortLabel || 'Toggle order';
        btn.setAttribute('aria-label', nextLabel);
    }
}

function renderFaq(t) {
    const root = $('#faqList');
    if (!root) return;
    root.replaceChildren();
    (t.faq.items || []).forEach((item) => {
        // The answer wrapper supplies one repeatable 0fr <-> 1fr CSS
        // transition. The summary's "+" rotates into a close icon.
        const details = el('details', { class: 'faq-item', 'data-faq': '' }, [
            el('summary', { text: item.q }),
            el('div', { class: 'faq-answer' }, [
                el('p', { text: item.a })
            ])
        ]);
        root.appendChild(details);
    });
}

function renderPrice(t) {
    const root = $('#priceGrid');
    if (!root) return;
    const p = t.faq && t.faq.price;
    if (!p) return;
    root.replaceChildren();
    const sections = [
        { key: 'design',  klass: 'price-design' },
        { key: 'threeD',  klass: 'price-3d' },
        { key: 'dev',     klass: 'price-dev' },
        { key: 'reverse', klass: 'price-reverse' }
    ];
    sections.forEach((s) => {
        const data = p[s.key];
        if (!data) return;
        const card = el('article', { class: 'price-card reveal', 'data-kanji': data.kanji || '' }, [
            el('div', { class: 'price-head' }, [
                data.kanji ? el('span', { class: 'price-kanji', 'aria-hidden': 'true', text: data.kanji }) : null,
                el('h3', { class: 'price-title', text: data.title })
            ]),
            data.note ? el('p', { class: 'price-note', text: data.note }) : null,
            el('ul', { class: 'price-list' }, (data.items || []).map((it) => {
                const { num, sym } = splitPrice(convertPrice(it.price, state.currency));
                return el('li', { class: 'price-item' }, [
                    el('span', { class: 'price-bullet', 'aria-hidden': 'true', text: '✦' }),
                    el('span', { class: 'price-name', text: it.name }),
                    el('span', { class: 'price-sep', 'aria-hidden': 'true' }),
                    el('span', { class: 'price-value' }, [
                        el('span', { class: 'price-from', text: 'from ' }),
                        el('span', { class: 'price-num', text: num }),
                        el('span', { class: 'price-cur', text: ' ' + sym })
                    ])
                ]);
            }))
        ]);
        root.appendChild(card);
    });
}

function bindPriceCurrency() {
    const root = $('#priceCurrency');
    if (!root) return;
    // initial: current lang's currency (overrides saved)
    const cur = LANG_CUR[state.lang] || state.currency || 'USD';
    state.currency = cur;
    localStorage.setItem('zazary.cur', cur);
    $$('.price-cur-btn', root).forEach((b) => {
        const on = b.dataset.cur === cur;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    root.addEventListener('click', (e) => {
        const btn = e.target.closest('.price-cur-btn');
        if (!btn) return;
        const newCur = btn.dataset.cur;
        if (!newCur || newCur === state.currency) return;
        state.currency = newCur;
        localStorage.setItem('zazary.cur', newCur);
        $$('.price-cur-btn', root).forEach((b) => {
            const on = b.dataset.cur === newCur;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        if (state.i18n) {
            renderPrice(state.i18n);
            $$('#priceGrid .price-card').forEach((c) => c.classList.add('is-in'));
        }
    });
}

function renderHw(t) {
    const root = $('#hwGrid');
    if (!root) return;
    root.replaceChildren();
    (t.hw.items || []).forEach((hw) => {
        root.appendChild(el('article', { class: 'hw-card reveal' }, [
            el('span', { text: hw.k }),
            el('strong', { text: hw.v })
        ]));
    });
}

function renderAbout(t) {
    const root = $('#aboutText');
    if (root) {
        // about markup is hardcoded in our json, same origin, ok to innerHTML
        root.innerHTML = t.aboutText;
    }
}

let i18nRenderRun = 0;
const yieldToMain = () => {
    if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
    return new Promise((resolve) => setTimeout(resolve, 0));
};

async function applyI18n(t) {
    // Rebuild below-the-fold sections in separate cooperative tasks. The old
    // one-shot render could become a 140–170 ms mobile long task; yielding
    // between independent sections keeps interaction latency at zero without
    // changing any resulting markup.
    const runId = ++i18nRenderRun;
    state.i18n = t;
    const stillCurrent = () => runId === i18nRenderRun;
    try {
        applyStaticI18n(t);
        await yieldToMain();
        const renderers = [
            renderAbout,
            renderValueGrid,
            renderSkills,
            renderTimeline,
            renderUses,
            renderHw,
            renderFaq,
            renderPrice
        ];
        for (const render of renderers) {
            if (!stillCurrent()) return;
            render(t);
            await yieldToMain();
        }
        if (!stillCurrent()) return;
        bindFaqCollapse();
        initReveal();
    } catch (e) {
        console.error('applyI18n failed:', e);
    }
    if (!stillCurrent()) return;

    /* Newly created cards stay visible on language/currency switches. Process
       them in small batches too, avoiding one large style invalidation task. */
    const nodes = $$('#priceGrid .price-card, #valueGrid .value-card, #useGrid .use-group, #skillGroups .skill-card, #timeline .timeline-item, #faqList .faq-item, #hwGrid .hw-card, .folio-block:not(.is-empty) .portfolio-card, .folio-block:not(.is-empty)');
    for (let i = 0; i < nodes.length; i += 16) {
        if (!stillCurrent()) return;
        nodes.slice(i, i + 16).forEach((node) => {
            node.classList.add('is-in');
            node.classList.add('was-in');
        });
        await yieldToMain();
    }
    // All wrappers are already committed to their final visible state; no
    // observer callback is allowed to gate their rendering.
    if (!stillCurrent()) return;
    paintFxPrompt();
    syncHeroCtaGhost();
}

let initialI18nPromise = null;
async function ensureInitialI18n() {
    if (state.i18n) return state.i18n;
    if (!initialI18nPromise) {
        const requestedLang = state.lang;
        initialI18nPromise = (async () => {
            const t = await loadI18n(requestedLang);
            // A language button may have been used while this fetch was in
            // flight; never let the stale initial response overwrite it.
            if (state.lang !== requestedLang) return state.i18n;
            await applyI18n(t);
            bindExperienceSort();
            return t;
        })().catch(() => {
            initialI18nPromise = null;
            return null;
        });
    }
    return initialI18nPromise;
}

async function setLanguage(lang) {
    if (!LANGS.includes(lang)) lang = 'en';
    state.lang = lang;
    localStorage.setItem('zazary.lang', lang);
    // auto-pick currency for this language
    if (LANG_CUR[lang]) {
        state.currency = LANG_CUR[lang];
        localStorage.setItem('zazary.cur', state.currency);
    }
    const t = await loadI18n(lang);
    await applyI18n(t);
    /* Update lang switch UI - now 4 positions */
    const sw = $('#langSwitch');
    const toggle = document.querySelector('.lang-toggle');
    if (sw) sw.checked = false;  // checkbox no longer controls position
    if (toggle) toggle.setAttribute('data-pos', lang);
    /* Update price currency buttons to match the new lang */
    const curRoot = $('#priceCurrency');
    if (curRoot && LANG_CUR[lang]) {
        state.currency = LANG_CUR[lang];
        localStorage.setItem('zazary.cur', state.currency);
        $$('.price-cur-btn', curRoot).forEach((b) => {
            const on = b.dataset.cur === state.currency;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }
    document.dispatchEvent(new CustomEvent('zazary:lang'));
}

/* ---------- Sakura ---------- */
class Sakura {
    constructor(root) {
        if (!root) throw new Error('Sakura root is missing');
        this.root = root;
        this.petals = [];
        this.template = $('#petalTemplate');
        this.resize();
        window.addEventListener('resize', () => this.resize(), { passive: true });
    }
    count() {
        if (state.optimized || reducedMotion() || matchMedia('(max-width: 767px)').matches) return 0;
        return matchMedia('(max-width: 1099px)').matches ? 4 : 6;
    }
    resize() {
        const count = this.count();
        while (this.petals.length > count) this.petals.pop().remove();
        while (this.petals.length < count) this.petals.push(this.spawn());
    }
    spawn() {
        const node = this.template.content.firstElementChild.cloneNode(true);
        const start = Math.round(Math.random() * 100);
        const sway = Math.round(18 + Math.random() * 38);
        const scale = (0.5 + Math.random() * 0.75).toFixed(2);
        const duration = (9 + Math.random() * 9).toFixed(2);
        node.style.setProperty('--petal-x', `${start}vw`);
        node.style.setProperty('--petal-sway', `${sway}px`);
        node.style.setProperty('--petal-scale', scale);
        node.style.setProperty('--petal-rotation', `${Math.round(180 + Math.random() * 540)}deg`);
        node.style.setProperty('--petal-duration', `${duration}s`);
        node.style.setProperty('--petal-delay', `${(-Math.random() * Number(duration)).toFixed(2)}s`);
        this.root.appendChild(node);
        return node;
    }
    stop() { this.root.classList.add('is-paused'); }
    start() { this.root.classList.remove('is-paused'); this.resize(); }
}

/* ---------- FX prompt (effects toggle, no banner) ---------- */
// Strategy:
//   1. If user saved a choice, honour it.
//   2. Respect reduced-motion and data-saver preferences.
//   3. Otherwise preserve the full visual mode on every device.
// Continuous startup FPS sampling was removed: it kept requestAnimationFrame
// busy through first paint and could destabilize WebKit's compositor. The old
// "Do you want to optimize?" banner is gone; the FX button remains available.

function paintFxPrompt() {
    const opt = state.optimized;
    const open = $('#fxOpen');
    if (!open) return;
    open.setAttribute('aria-pressed', opt ? 'true' : 'false');
    open.classList.toggle('is-off', opt);
    open.classList.toggle('is-auto', !!state.fxAuto);
    const dot = $('#fxDot');
    if (dot) dot.classList.toggle('is-on', !!state.fxAuto || opt);
}

function setOptimized(on) {
    // Toggle "low-FX" mode. The body gets `fast-af` class which the CSS
    // uses to disable animations / reduce transitions. Persists the
    // choice in localStorage so the next visit keeps the setting.
    //
    // On enable: stop sakura, pause every hero layer and keep the static still
    // visible. On disable: restart the lightweight effects and resume motion.
    state.optimized = !!on;
    document.body.classList.toggle('fast-af', state.optimized);
    localStorage.setItem('zazary.fx', state.optimized ? 'off' : 'on');
    if (state.optimized) {
        $$('.reveal').forEach((el) => el.classList.add('is-in', 'was-in'));
        if (state.sakura) state.sakura.stop();
        $$('.bg-video').forEach((video) => video.pause());
        document.body.classList.remove('hero-video-ready');
    } else {
        if (state.sakura) state.sakura.start();
        if (state.heroVideoReady) document.body.classList.add('hero-video-ready');
        playVideos();
    }
    paintFxPrompt();
    /* notify listeners (mobile settings drawer sync) */
    document.dispatchEvent(new CustomEvent('zazary:fx'));
}

function autoTuneFx() {
    const saved = localStorage.getItem('zazary.fx');
    if (saved) { setOptimized(saved === 'off'); return; }
    const conserve = reducedMotion() || navigator.connection?.saveData;
    state.fxAuto = conserve;
    setOptimized(conserve);
}

function initFxPrompt() {
    paintFxPrompt();
    // FX button now toggles effects directly (no banner).
    $('#fxOpen')?.addEventListener('click', () => {
        state.fxAuto = false;  // user took manual control
        setOptimized(!state.optimized);
        if (!state.optimized) activateHeroVideos();
    });
    // Apply saved/accessibility/device policy without a startup frame sampler.
    autoTuneFx();
}

/* ---------- Hero CTA - copy label into ghost layer for the glitch effect ---------- */
function syncHeroCtaGhost() {
    const cta = $('[data-ctaworks]');
    if (!cta) return;
    const text = cta.querySelector('.hero-cta-text');
    const ghost = cta.querySelector('.hero-cta-ghost');
    if (!text || !ghost) return;
    ghost.setAttribute('data-text', text.textContent || '');
}

/* ---------- Portfolio modal ---------- */
let lastFocused = null;

function openProject(id) {
    const t = state.i18n;
    if (!t || !t.projects) {
        // Portfolio cards are usable even before deferred below-fold data has
        // hydrated; replay the requested open as soon as the local JSON lands.
        ensureInitialI18n().then(() => {
            if (state.i18n?.projects?.[id]) openProject(id);
        });
        return;
    }
    const rec = t.projects[id];
    const modal = $('#folioModal');
    const card  = $('#folioModalCard');
    if (!rec || !modal || !card) return;

    lastFocused = document.activeElement;

    $('#folioModalTag').textContent   = rec.tag || '';
    $('#folioModalTitle').textContent = rec.title || id;
    $('#folioModalDesc').textContent  = rec.desc || '';

    const vid = $('#folioModalVideo');
    const img = $('#folioModalImg');
    const hideMedia = () => {
        if (vid) { try { vid.pause(); } catch (_) {} vid.removeAttribute('src'); try { vid.load(); } catch (_) {} vid.hidden = true; }
        if (img) { img.hidden = true; img.removeAttribute('src'); img.removeAttribute('alt'); }
    };
    hideMedia();

    if (rec.video) {
        card.classList.add('has-video');
        if (img) { img.hidden = true; img.removeAttribute('src'); }
        if (vid) {
            vid.hidden = false;
            if (vid.getAttribute('src') !== rec.video) vid.src = rec.video;
            const setAr = () => {
                if (vid.videoWidth) card.style.setProperty('--ar', `${vid.videoWidth} / ${vid.videoHeight}`);
            };
            if (vid.videoWidth) setAr();
            else vid.addEventListener('loadedmetadata', setAr, { once: true });
            vid.play().catch(() => {});
        }
    } else if (rec.image) {
        if (vid) { try { vid.pause(); } catch (_) {} vid.removeAttribute('src'); vid.hidden = true; }
        if (img) {
            img.hidden = false;
            img.src = rec.image;
            img.alt = rec.title || id;
            const setImgAr = () => {
                if (img.naturalWidth) card.style.setProperty('--ar', `${img.naturalWidth} / ${img.naturalHeight}`);
            };
            if (img.complete && img.naturalWidth) setImgAr();
            else img.addEventListener('load', setImgAr, { once: true });
        }
    }

    /* Workflow */
    const wf = $('#folioWorkflow');
    if (wf) {
        if (rec.task && Array.isArray(rec.steps) && rec.steps.length) {
            wf.hidden = false;
            $('#fwTask').textContent = rec.task;
            const ol = $('#fwSteps');
            ol.replaceChildren();
            rec.steps.forEach((s) => ol.appendChild(el('li', { text: s })));
            const L = t.modal;
            $('#fwLessons').replaceChildren(
                el('p', null, [
                    el('strong', { text: L.fwProblem + '. ' }),
                    document.createTextNode(rec.problem || '')
                ]),
                el('p', null, [
                    el('strong', { text: L.fwTakeaway + '. ' }),
                    document.createTextNode(rec.takeaway || '')
                ])
            );
        } else {
            wf.hidden = true;
            $('#fwSteps').replaceChildren();
            $('#fwLessons').replaceChildren();
            $('#fwTask').textContent = '';
        }
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    /* focus management */
    requestAnimationFrame(() => {
        const close = $('#folioClose');
        if (close) close.focus({ preventScroll: true });
        trapFocus(modal);
    });
}

function closeModal() {
    const modal = $('#folioModal');
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    const vid = $('#folioModalVideo');
    if (vid) try { vid.pause(); } catch (_) {}
    const z = $('#folioZoom');
    if (z) z.hidden = true;
    releaseFocusTrap();
    if (lastFocused && typeof lastFocused.focus === 'function') {
        try { lastFocused.focus({ preventScroll: true }); } catch (_) {}
    }
}

function openZoom(src, alt) {
    const z = $('#folioZoom');
    const zi = $('#folioZoomImg');
    if (!z || !zi) return;
    zi.src = src;
    zi.alt = alt || '';
    z.hidden = false;
    lastFocused = document.activeElement;
    requestAnimationFrame(() => z.focus({ preventScroll: true }));
    trapFocus(z);
}
function closeZoom() {
    const z = $('#folioZoom');
    if (!z) return;
    z.hidden = true;
    const zi = $('#folioZoomImg');
    if (zi) zi.removeAttribute('src');
    releaseFocusTrap();
}

/* Focus trap */
let trapHandler = null;
let trapContainer = null;
function trapFocus(container) {
    releaseFocusTrap();
    trapContainer = container;
    trapHandler = (e) => {
        if (e.key !== 'Tab') return;
        const focusable = $$('a, button, input, [tabindex]:not([tabindex="-1"])', container)
            .filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container.addEventListener('keydown', trapHandler);
}
function releaseFocusTrap() {
    if (trapHandler && trapContainer) {
        trapContainer.removeEventListener('keydown', trapHandler);
    }
    trapHandler = null;
    trapContainer = null;
}

/* ---------- Portfolio grid / filters ---------- */
let portfolioFilterRun = 0;
let portfolioRequestedFilter = 'all';
let portfolioFallbackAnimations = [];

function ensurePortfolioWrappers() {
    // Hover motion lives on the card, while reveal/filter movement lives on
    // this stable wrapper. Keeping those transforms on different elements
    // prevents them from overwriting one another.
    const usedTransitionNames = new Set();
    return $$('.portfolio-card').map((card, index) => {
        let wrap = card.parentElement;
        if (!wrap || !wrap.classList.contains('portfolio-card-wrap')) {
            wrap = el('div', { class: 'portfolio-card-wrap' });
            card.parentNode.insertBefore(wrap, card);
            wrap.appendChild(card);
        }

        const project = card.dataset.project || `item-${index + 1}`;
        wrap.dataset.project = project;
        wrap.dataset.cat = card.dataset.cat || '';
        wrap.classList.toggle('is-featured', card.classList.contains('is-featured'));

        // View-transition names must be unique on the rendered page. The old
        // CSS assigned the same name ("card") to every wrapper, which makes
        // the browser skip/abort the transition when several cards are shown.
        let transitionName = `folio-${project}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        if (usedTransitionNames.has(transitionName)) transitionName += `-${index + 1}`;
        usedTransitionNames.add(transitionName);
        wrap.style.viewTransitionName = transitionName;
        return wrap;
    });
}

function portfolioMatches(card, filter) {
    if (!card || filter === 'all') return true;
    return (card.dataset.cat || '').split(/\s+/).includes(filter);
}

function setPortfolioFilterControls(filter) {
    $$('#portfolioFilters .filter-btn').forEach((button) => {
        const on = button.dataset.filter === filter;
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

function applyPortfolioFilter(filter) {
    const nextFilter = filter || 'all';
    const wrappers = ensurePortfolioWrappers();
    state.portfolioFilter = nextFilter;

    wrappers.forEach((wrap) => {
        const card = wrap.querySelector('.portfolio-card');
        const hidden = !portfolioMatches(card, nextFilter);

        // IMPORTANT: hide the GRID ITEM (wrapper), not only its child card.
        // A display:none child inside a visible wrapper still leaves an empty
        // grid cell. That was the source of the large holes/right-aligned
        // Quest card shown in the supplied screenshot.
        wrap.classList.toggle('is-hidden', hidden);
        card?.classList.toggle('is-hidden', hidden);
        if (hidden) wrap.setAttribute('aria-hidden', 'true');
        else wrap.removeAttribute('aria-hidden');

        const hit = card?.querySelector('.folio-hit');
        if (hit) {
            if (hidden) hit.setAttribute('tabindex', '-1');
            else hit.removeAttribute('tabindex');
        }
    });

    $$('.folio-block').forEach((block) => {
        const visible = $$('.portfolio-card-wrap', block)
            .some((wrap) => !wrap.classList.contains('is-hidden'));
        block.classList.toggle('is-empty', !visible);
    });
}

function stopPortfolioFallbackAnimations() {
    portfolioFallbackAnimations.forEach((animation) => {
        try { animation.cancel(); } catch (_) {}
    });
    portfolioFallbackAnimations = [];
}

async function fallbackPortfolioFilter(filter, runId) {
    const wrappers = ensurePortfolioWrappers();
    const firstRects = new Map();
    const outgoing = [];

    wrappers.forEach((wrap) => {
        if (wrap.classList.contains('is-hidden')) return;
        const rect = wrap.getBoundingClientRect();
        if (rect.width && rect.height) firstRects.set(wrap, rect);
        const card = wrap.querySelector('.portfolio-card');
        if (!portfolioMatches(card, filter)) outgoing.push(wrap);
    });

    if (typeof Element.prototype.animate !== 'function' || reducedMotion() || state.optimized) {
        applyPortfolioFilter(filter);
        return;
    }

    // First soften cards that are about to leave. Their grid slots remain in
    // place for this short phase, then the actual reflow happens once.
    const exits = outgoing.map((wrap) => {
        const animation = wrap.animate([
            { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
            { opacity: 0, transform: 'translate3d(0, 8px, 0) scale(.975)' }
        ], {
            duration: 150,
            easing: 'cubic-bezier(.4, 0, 1, 1)',
            fill: 'none'
        });
        portfolioFallbackAnimations.push(animation);
        return animation.finished.catch(() => {});
    });
    if (exits.length) await Promise.all(exits);
    if (runId !== portfolioFilterRun) return;

    applyPortfolioFilter(filter);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (runId !== portfolioFilterRun) return;

    // FLIP the cards that stayed visible; newly entering cards get a small
    // rise/fade. The child card is free to keep its independent hover tilt.
    ensurePortfolioWrappers().forEach((wrap) => {
        if (wrap.classList.contains('is-hidden')) return;
        const last = wrap.getBoundingClientRect();
        const first = firstRects.get(wrap);
        let keyframes;
        if (first) {
            const dx = first.left - last.left;
            const dy = first.top - last.top;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
            keyframes = [
                { transform: `translate3d(${dx}px, ${dy}px, 0)` },
                { transform: 'translate3d(0, 0, 0)' }
            ];
        } else {
            keyframes = [
                { opacity: 0, transform: 'translate3d(0, 16px, 0) scale(.985)' },
                { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
            ];
        }
        const animation = wrap.animate(keyframes, {
            duration: first ? 520 : 420,
            easing: 'cubic-bezier(.22, 1, .36, 1)',
            fill: 'none'
        });
        portfolioFallbackAnimations.push(animation);
    });
}

function changePortfolioFilter(filter) {
    const nextFilter = filter || 'all';
    if (nextFilter === portfolioRequestedFilter) return;

    portfolioRequestedFilter = nextFilter;
    const runId = ++portfolioFilterRun;
    setPortfolioFilterControls(nextFilter);
    stopPortfolioFallbackAnimations();
    if (state.portfolioTransition?.skipTransition) {
        try { state.portfolioTransition.skipTransition(); } catch (_) {}
    }

    const canUseViewTransition =
        typeof document.startViewTransition === 'function' &&
        !reducedMotion() &&
        !state.optimized;

    if (canUseViewTransition) {
        try {
            document.documentElement.classList.add('portfolio-filter-transition');
            const transition = document.startViewTransition(() => applyPortfolioFilter(nextFilter));
            state.portfolioTransition = transition;
            transition.finished.catch(() => {}).finally(() => {
                if (runId !== portfolioFilterRun) return;
                state.portfolioTransition = null;
                document.documentElement.classList.remove('portfolio-filter-transition');
            });
            return;
        } catch (_) {
            state.portfolioTransition = null;
            document.documentElement.classList.remove('portfolio-filter-transition');
        }
    }

    fallbackPortfolioFilter(nextFilter, runId).catch(() => {
        if (runId === portfolioFilterRun) applyPortfolioFilter(nextFilter);
    });
}

function initPortfolio() {
    // Portfolio section wiring: filter buttons, reflow animation and modal.
    ensurePortfolioWrappers();
    portfolioRequestedFilter = state.portfolioFilter;
    applyPortfolioFilter(state.portfolioFilter);
    setPortfolioFilterControls(state.portfolioFilter);

    const filters = $('#portfolioFilters');
    if (filters && !filters.dataset.filterBound) {
        filters.dataset.filterBound = '1';
        filters.addEventListener('click', (event) => {
            const button = event.target.closest('.filter-btn');
            if (!button) return;
            changePortfolioFilter(button.dataset.filter);
        });

        // Arrow/Home/End navigation makes the filter group behave like one
        // coherent control without changing its button semantics.
        filters.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const buttons = $$('.filter-btn', filters);
            const current = Math.max(0, buttons.indexOf(document.activeElement));
            let next = current;
            if (event.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
            if (event.key === 'ArrowRight') next = (current + 1) % buttons.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = buttons.length - 1;
            event.preventDefault();
            buttons[next]?.focus();
            changePortfolioFilter(buttons[next]?.dataset.filter);
        });
    }

    /* Open via .folio-hit button OR click on card body (except meta) */
    document.addEventListener('click', (e) => {
        const hit = e.target.closest('.folio-hit');
        if (hit) { e.preventDefault(); openProject(hit.dataset.open); return; }
        const card = e.target.closest('.portfolio-card.is-live');
        if (!card) return;
        /* Avoid double-trigger if user clicked inner control */
        if (e.target.closest('.portfolio-meta a, .portfolio-meta button')) return;
        e.preventDefault();
        openProject(card.dataset.project);
    });

    /* Keyboard activation on .folio-hit is automatic (button); for card: Enter/Space */
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.classList && e.target.classList.contains('folio-hit')) {
            e.preventDefault();
            openProject(e.target.dataset.open);
        }
    });

    /* Modal close + zoom */
    $('#folioClose')?.addEventListener('click', closeModal);
    $('#folioModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    $('#folioModalImg')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const img = e.currentTarget;
        if (img.hidden || !img.src) return;
        openZoom(img.src, img.alt);
    });
    $('#folioZoom')?.addEventListener('click', closeZoom);
}

/* ---------- Reveal on scroll ---------- */
function playSafeReveal(node) {
    if (!node || node.dataset.revealEntered) return;
    node.dataset.revealEntered = '1';
    node.classList.add('has-entered');

    if (reducedMotion() || state.optimized || typeof node.animate !== 'function') return;

    const finalStyle = getComputedStyle(node);
    const finalTransform = finalStyle.transform;
    const shadowOnly = node.matches('.panel');
    // Portfolio movement belongs to its grid wrapper, while the actual shadow
    // belongs to the child card. Other blocks use themselves for both jobs.
    const shadowTarget = node.matches('.portfolio-card-wrap')
        ? $('.portfolio-card', node)
        : node;
    const shadowStyle = shadowTarget ? getComputedStyle(shadowTarget) : finalStyle;
    const hasShadow = shadowStyle.boxShadow && shadowStyle.boxShadow !== 'none';
    const first = {};
    const last = {};

    // Panels already contain moving children, so only their large outer shadow
    // fades in. Cards and headings get a small vertical settle as well. Opacity
    // never changes: even a one-frame desktop scroll jump leaves readable text.
    if (!shadowOnly) {
        first.transform = finalTransform === 'none'
            ? 'translate3d(0, 12px, 0)'
            : `translate3d(0, 12px, 0) ${finalTransform}`;
        last.transform = finalTransform;
    }
    if (hasShadow && shadowTarget === node) {
        first.boxShadow = 'none';
        last.boxShadow = shadowStyle.boxShadow;
    }
    if (!Object.keys(first).length) return;

    const timing = {
        duration: shadowOnly ? 640 : 520,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'none'
    };
    const animation = node.animate([first, last], timing);
    animation.id = 'safe-reveal';
    animation.finished.catch(() => {}).finally(() => node.classList.add('reveal-finished'));

    if (hasShadow && shadowTarget !== node) {
        const shadowAnimation = shadowTarget.animate([
            { boxShadow: 'none' },
            { boxShadow: shadowStyle.boxShadow }
        ], timing);
        shadowAnimation.id = 'safe-shadow';
    }
}

function getRevealObserver() {
    if (revealObserver || !('IntersectionObserver' in window)) return revealObserver;
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            // `top < root top` covers a block crossed in one fast wheel/touch
            // jump. It may animate off-screen, but it can never stay pending.
            const crossedAbove = entry.boundingClientRect.top < (entry.rootBounds?.top || 0);
            if (!entry.isIntersecting && !crossedAbove) return;
            revealObserver.unobserve(entry.target);
            playSafeReveal(entry.target);
        });
    }, { rootMargin: '80px 0px', threshold: 0.01 });
    return revealObserver;
}

function initReveal() {
    // Visibility is committed before observation. The observer only adds a
    // transform/shadow flourish; it is never allowed to gate actual content.
    // This is why fast scrolling is safe on both desktop and mobile.
    const nodes = $$('.panel, .value-card, .skill-card, .use-group, .hw-card, .faq-item, .experience-collapse, .contact-card, .price-card, #aboutText, .subhead, .section-lead');
    const candidates = nodes.concat(ensurePortfolioWrappers());
    const observer = getRevealObserver();
    candidates.forEach((node) => {
        node.classList.add('reveal', 'is-in', 'was-in');
        if (node.dataset.revealObserved) return;
        node.dataset.revealObserved = '1';
        if (observer) observer.observe(node);
        else playSafeReveal(node);
    });
}

/* ---------- Preloader ---------- */
function waitForDecodedHeroImage(image, onDone) {
    return new Promise((resolve) => {
        if (!image) {
            onDone(false);
            resolve(false);
            return;
        }
        let settled = false;
        const finish = async (ok) => {
            if (settled) return;
            settled = true;
            image.removeEventListener('load', onLoad);
            image.removeEventListener('error', onError);
            if (ok && typeof image.decode === 'function') {
                try { await image.decode(); } catch (_) {
                    ok = image.complete && image.naturalWidth > 0;
                }
            }
            onDone(ok);
            resolve(ok);
        };
        const onLoad = () => finish(true);
        const onError = () => finish(false);
        image.addEventListener('load', onLoad, { once: true });
        image.addEventListener('error', onError, { once: true });
        if (image.complete) queueMicrotask(() => finish(image.naturalWidth > 0));
    });
}

function initPreloader() {
    // Release the page only after the actual responsive hero image and full
    // stylesheet are decoded/ready. This is a real visual-readiness gate: on a
    // slow connection the loader stays up instead of exposing a black hero.
    // Video files are deliberately outside this gate.
    const preloaderEl = $('#preloader');
    if (!preloaderEl) {
        state.heroReady = Promise.resolve(true);
        return state.heroReady;
    }

    const started = performance.now();
    const progress = $('#preloaderProgress');
    const status = $('#preloaderStatus');
    const statusBase = status?.textContent?.trim() || 'loading';
    // The responsive <picture> is independent from deferred videos, so mobile
    // browsers cannot postpone or omit its first paint. currentSrc resolves to
    // the actually selected portrait/landscape file.
    const posterImage = $('#heroPosterImage');
    const posterCount = posterImage ? 1 : 0;
    let completed = 0;
    const paintProgress = () => {
        const ratio = posterCount ? completed / posterCount : 1;
        if (progress) progress.style.width = `${Math.round(ratio * 100)}%`;
        if (status) status.textContent = `${statusBase} · ${completed}/${posterCount}`;
    };
    paintProgress();

    const postersReady = waitForDecodedHeroImage(posterImage, () => {
        completed = posterCount;
        paintProgress();
    });

    const cssLink = $('link[href*="style.min.css"]');
    const cssReady = new Promise((resolve) => {
        const applied = () => Array.from(document.styleSheets)
            .some((sheet) => sheet.href?.includes('style.min.css'));
        if (!cssLink || applied()) return resolve(true);
        cssLink.addEventListener('load', () => requestAnimationFrame(() => resolve(true)), { once: true });
        cssLink.addEventListener('error', () => resolve(false), { once: true });
    });

    const assetsReady = Promise.all([postersReady, cssReady])
        .then(([postersOk, cssOk]) => postersOk && cssOk);

    state.heroReady = assetsReady
        .catch(() => false)
        .then(async (ready) => {
            const minimum = matchMedia('(max-width: 640px)').matches ? 450 : 700;
            const remaining = Math.max(0, minimum - (performance.now() - started));
            if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            completed = posterCount;
            paintProgress();
            document.body.classList.toggle('hero-poster-fallback', !ready);
            // The async stylesheet has settled and the responsive still has
            // decoded. Expose the already-laid-out page in the same frame
            // that begins fading the opaque loader; no hidden layout can leak
            // into CLS and no black intermediate hero is shown.
            document.body.classList.add('hero-ready');
            preloaderEl.classList.add('is-done');
            preloaderEl.setAttribute('aria-busy', 'false');
            setTimeout(() => preloaderEl.remove(), 360);
            return ready;
        });
    return state.heroReady;
}

/* ---------- Wechat modal ---------- */
let wechatLastFocus = null;
function openWechatModal() {
    const modal = $('#wechatModal');
    if (!modal) return;
    wechatLastFocus = document.activeElement;
    const qr = $('#wechatQr');
    if (qr?.dataset.src && !qr.currentSrc) {
        qr.src = qr.dataset.src;
        qr.removeAttribute('data-src');
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
        const close = $('#wechatClose');
        if (close) close.focus({ preventScroll: true });
        trapFocus(modal);
    });
}
function closeWechatModal() {
    const modal = $('#wechatModal');
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    releaseFocusTrap();
    if (wechatLastFocus && typeof wechatLastFocus.focus === 'function') {
        try { wechatLastFocus.focus({ preventScroll: true }); } catch (_) {}
    }
}

/* Generic text-to-clipboard helper.
   Returns a promise that resolves to true on success, false on failure. */
async function copyText(value) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (_) { /* fall through */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
    } catch (_) {
        return false;
    }
}

/* Visual "copied!" feedback on a button:
   adds .is-copied, swaps the label / icon, restores after `ms`. */
function flashCopied(btn, label, ms = 1400) {
    if (!btn) return;
    const original = btn.getAttribute('aria-label') || '';
    btn.classList.add('is-copied');
    if (label) btn.setAttribute('aria-label', label);
    setTimeout(() => {
        // If the button was removed from the DOM in the meantime,
        // .classList on a detached node is fine but .setAttribute could
        // be a no-op - either way, skip silently.
        if (!btn.isConnected) return;
        btn.classList.remove('is-copied');
        btn.setAttribute('aria-label', original);
    }, ms);
}

function initWechatModal() {
    const card = $('#wechatCard');
    if (!card) return;
    card.addEventListener('click', openWechatModal);
    $('#wechatClose')?.addEventListener('click', closeWechatModal);
    /* click on backdrop (the .wechat-modal itself) closes */
    $('#wechatModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeWechatModal();
    });
    /* copy Wechat ID to clipboard */
    $('#wechatCopy')?.addEventListener('click', async () => {
        const value = $('#wechatIdValue')?.textContent?.trim() || 'ZazaryXS';
        const ok = await copyText(value);
        if (ok) {
            const t = state.i18n;
            const label = (t && t.contact && t.contact.wechatCopied) || 'copied';
            flashCopied($('#wechatCopy'), label);
        }
    });
}

/* ---------- Email modal ---------- */
let emailLastFocus = null;
function openEmailModal() {
    const modal = $('#emailModal');
    if (!modal) return;
    emailLastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
        const close = $('#emailClose');
        if (close) close.focus({ preventScroll: true });
        trapFocus(modal);
    });
}
function closeEmailModal() {
    const modal = $('#emailModal');
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    releaseFocusTrap();
    if (emailLastFocus && typeof emailLastFocus.focus === 'function') {
        try { emailLastFocus.focus({ preventScroll: true }); } catch (_) {}
    }
}
function initEmailModal() {
    const card = $('#emailCard');
    if (!card) return;
    card.addEventListener('click', openEmailModal);
    $('#emailClose')?.addEventListener('click', closeEmailModal);
    $('#emailModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeEmailModal();
    });
    /* copy email address to clipboard */
    $('#emailCopy')?.addEventListener('click', async () => {
        const value = $('#emailIdValue')?.textContent?.trim() || buildEmail();
        const ok = await copyText(value);
        if (ok) {
            const t = state.i18n;
            const label = (t && t.contact && t.contact.emailCopied) || 'copied!';
            flashCopied($('#emailCopy'), label);
        }
    });
    /* "open in mail app" — build mailto URL at click-time so Cloudflare's
       email-obfuscation never sees the literal address in static HTML. */
    $('#emailMailto')?.addEventListener('click', () => {
        const addr = ($('#emailIdValue')?.textContent || '').trim() || buildEmail();
        window.location.href = buildMailto();
    });
    /* footer email button → same modal */
    $('#footerEmail')?.addEventListener('click', openEmailModal);
}

/* ---------- Mobile navigation ---------- */
let mobileNavLastFocused = null;
let mobileNavScrollY = 0;
let mobileNavScrollLocked = false;

function setMobileScrollLock(locked) {
    if (locked === mobileNavScrollLocked) return;
    mobileNavScrollLocked = locked;

    if (locked) {
        mobileNavScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.top = `-${mobileNavScrollY}px`;
        document.body.classList.add('drawer-open');
        return;
    }

    document.body.classList.remove('drawer-open');
    document.body.style.removeProperty('top');
    const root = document.documentElement;
    const oldBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, mobileNavScrollY);
    requestAnimationFrame(() => { root.style.scrollBehavior = oldBehavior; });
}

function syncDrawerState() {
    const navOpen = !!$('#mobileNavDrawer')?.classList.contains('is-open');
    const backdrop = $('#mobileDrawerBackdrop');
    if (backdrop) {
        backdrop.classList.toggle('is-open', navOpen);
        backdrop.setAttribute('aria-hidden', navOpen ? 'false' : 'true');
    }
    setMobileScrollLock(navOpen);
}

function closeMobile({ restoreFocus = true } = {}) {
    const drawer = $('#mobileNavDrawer');
    const btn = $('#mobileNavToggle');
    const wasOpen = !!drawer?.classList.contains('is-open');

    if (drawer) {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
        drawer.setAttribute('inert', '');
        if (trapContainer === drawer) releaseFocusTrap();
    }
    btn?.setAttribute('aria-expanded', 'false');
    syncDrawerState();

    if (wasOpen && restoreFocus) {
        const target = mobileNavLastFocused?.isConnected ? mobileNavLastFocused : btn;
        requestAnimationFrame(() => target?.focus?.({ preventScroll: true }));
    }
    mobileNavLastFocused = null;
}

function initMobileNav() {
    const btn = $('#mobileNavToggle');
    const drawer = $('#mobileNavDrawer');
    const close = $('#mobileNavClose');
    const fxBtn = $('#mnpFx');
    const langBtns = $$('.mnp-lang-btn');
    if (!btn || !drawer) return;

    drawer.setAttribute('inert', '');
    syncDrawerState();

    /* Open only after removing inert, then focus and trap within the sheet. */
    btn.addEventListener('click', () => {
        if (drawer.classList.contains('is-open')) {
            closeMobile();
            return;
        }
        mobileNavLastFocused = btn;
        drawer.removeAttribute('inert');
        drawer.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        btn.setAttribute('aria-expanded', 'true');
        syncDrawerState();
        requestAnimationFrame(() => {
            if (!drawer.classList.contains('is-open')) return;
            close?.focus({ preventScroll: true });
            trapFocus(drawer);
        });
    });
    close?.addEventListener('click', () => closeMobile());
    /* Closing links return focus to the opener before smooth navigation. */
    $$('#mobileNavDrawer a').forEach((a) => a.addEventListener('click', () => closeMobile()));
    $('#mobileDrawerBackdrop')?.addEventListener('click', () => closeMobile());

    /* FX toggle inside drawer */
    const syncFx = () => {
        if (!fxBtn) return;
        const on = !!state.optimized;
        fxBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    };
    syncFx();
    document.addEventListener('zazary:fx', syncFx);
    fxBtn?.addEventListener('click', () => {
        state.fxAuto = false;
        setOptimized(!state.optimized);
        if (!state.optimized) activateHeroVideos();
        document.dispatchEvent(new CustomEvent('zazary:fx'));
    });

    /* language buttons */
    const syncLang = () => {
        langBtns.forEach((b) => {
            const on = b.dataset.lang === state.lang;
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    };
    syncLang();
    document.addEventListener('zazary:lang', syncLang);
    langBtns.forEach((b) => {
        b.addEventListener('click', () => {
            const target = b.dataset.lang;
            if (!target || target === state.lang) return;
            setLanguage(target).then(() => {
                document.dispatchEvent(new CustomEvent('zazary:lang'));
                syncLang();
            });
        });
    });

    /* Esc closes the sheet; Tab remains contained by trapFocus(). */
    drawer.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            closeMobile();
        }
    });

    /* Do not leave an invisible, scroll-locking drawer after rotation or
       resizing from the mobile layout to the desktop navigation. */
    const desktopNav = window.matchMedia('(min-width: 769px)');
    const closeAtDesktop = (event) => {
        if (event.matches) closeMobile({ restoreFocus: false });
    };
    if (desktopNav.addEventListener) desktopNav.addEventListener('change', closeAtDesktop);
    else desktopNav.addListener(closeAtDesktop);
}

/* ---------- Smooth scroll (with reduced-motion respect) ---------- */
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function scrollToId(id) {
    const target = id === 'hero' ? 0
        : ($('#' + id) ? $('#' + id).getBoundingClientRect().top + window.pageYOffset - 88 : 0);
    if (reducedMotion()) { window.scrollTo(0, target); return; }
    const start = window.pageYOffset;
    const dist = target - start;
    const dur = Math.min(1100, Math.max(480, Math.abs(dist) * 0.42));
    let t0 = null;
    const step = (now) => {
        if (!t0) t0 = now;
        const p = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, start + dist * easeInOutCubic(p));
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

/* ---------- Scroll chrome (progress / nav state) ---------- */
function updateChrome() {
    const y = state.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, y / max));
    const sp = $('#scrollProgress');
    if (sp) sp.style.transform = `scaleX(${progress})`;
    document.documentElement.style.setProperty('--rail-progress', `${progress * 100}%`);
    document.body.classList.toggle('is-scrolled', y > 80);
    const ind = $('#scrollIndicator');
    if (ind) ind.classList.toggle('is-hidden', y > 100);
    const nav = $('#mainNav');
    if (nav) nav.classList.toggle('scrolled', y > 80);
    const railsVisible = y > 80;
    $$('.side-rail').forEach((r) => r.classList.toggle('is-visible', railsVisible));
}

function updateParallax(scrollY = window.scrollY || window.pageYOffset || 0) {
    if (state.optimized || reducedMotion()) return;
    const y = Math.max(0, scrollY);
    const heroH = Math.max(1, state.heroHeight || state.viewportHeight);
    const heroY = Math.min(y, heroH);

    // Use the current scroll position directly. The previous extra RAF made a
    // fast wheel/touch jump paint one frame with old transforms, which looked
    // as if the parallax could not catch up while returning toward the top.
    const backY = heroY * 0.35;
    const midY = heroY * 0.18;
    if (state.els.vidBack) state.els.vidBack.style.transform = `translate3d(-50%, calc(-50% + ${backY}px), 0)`;
    if (state.els.vidMid)  state.els.vidMid.style.transform  = `translate3d(-50%, calc(-50% + ${midY}px), 0)`;
    if (state.els.vidFront) state.els.vidFront.style.transform = 'translate3d(-50%, -50%, 0)';

    // The fixed ambient layer used to travel thousands of pixels on a long
    // page. Clamp it to a small visual range so a large reverse scroll has no
    // distance to chase and cannot expose an empty-looking background.
    const ambientY = Math.min(y * 0.12, state.viewportHeight * 0.22);
    if (state.els.bg) state.els.bg.style.transform = `translate3d(0, ${ambientY}px, 0)`;
    if (state.els.heroId) {
        const o = Math.max(0, 1 - heroY / (state.viewportHeight * 0.58));
        state.els.heroId.style.opacity = String(o);
        state.els.heroId.style.transform = `translate3d(0, ${heroY * 0.18}px, 0)`;
    }
}

let spyPoints = [];
let spyCurrent = '';
function measureSpy() {
    const ids = ['hero', 'portfolio', 'about', 'faq', 'pricing', 'contact'];
    spyPoints = ids
        .map((id) => ({ id, top: $('#' + id)?.offsetTop }))
        .filter((point) => Number.isFinite(point.top));
}
function spy() {
    // Section offsets are cached after layout changes. The scroll path does
    // no geometry reads, so class writes in updateChrome cannot force layout.
    let current = spyPoints[0]?.id || 'hero';
    const mark = state.scrollY + state.viewportHeight * 0.32;
    for (const point of spyPoints) {
        if (point.top <= mark) current = point.id;
        else break;
    }
    if (current === spyCurrent) return;
    spyCurrent = current;
    $$('.nav-item').forEach((a) => {
        const href = a.getAttribute('href') || '';
        a.classList.toggle('is-active', href === '#' + current);
    });
}
function initSpyMetrics() {
    const refresh = () => {
        state.viewportHeight = Math.max(1, window.visualViewport?.height || window.innerHeight);
        state.heroHeight = Math.max(1, state.els.hero?.offsetHeight || state.viewportHeight);
        state.scrollY = window.scrollY || window.pageYOffset || 0;
        measureSpy();
        updateChrome();
        spy();
        updateParallax(state.scrollY);
    };
    requestAnimationFrame(refresh);
    window.addEventListener('resize', refresh, { passive: true });
    window.visualViewport?.addEventListener('resize', refresh, { passive: true });
    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(() => requestAnimationFrame(refresh));
        observer.observe($('main') || document.body);
    }
}

function loop() {
    state.raf = 0;
    if (!state.hidden) updateParallax();
}
function scheduleMotionFrame() {
    if (!state.hidden && !state.raf) state.raf = requestAnimationFrame(loop);
}

function heroOverlayHasAlpha(video) {
    // Metadata alone is not proof that an engine decoded the VP9 alpha plane.
    // Sample the actual first frame before exposing the stack; if an older
    // browser flattened an overlay to black, keep the complete static hero.
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 72;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparent = 0;
        let visible = 0;
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] < 245) transparent += 1;
            if (pixels[i] > 10) visible += 1;
        }
        const count = pixels.length / 4;
        return transparent > count * 0.1 && visible > 4;
    } catch (_) {
        return false;
    }
}

function prepareHeroVideo(video) {
    return new Promise((resolve) => {
        if (!video) return resolve(false);
        const source = video.querySelector('source');
        if (!source) return resolve(false);
        let settled = false;
        let timer = 0;
        const done = (ok) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('error', onError);
            resolve(ok);
        };
        const onReady = () => done(true);
        const onError = () => done(false);
        video.addEventListener('loadeddata', onReady, { once: true });
        video.addEventListener('error', onError, { once: true });
        timer = setTimeout(() => done(false), 20000);
        if (source.dataset.src) {
            source.src = source.dataset.src;
            source.removeAttribute('data-src');
            video.load();
        }
        if (video.readyState >= 2) queueMicrotask(onReady);
    });
}

function activateHeroVideos() {
    if (reducedMotion() || navigator.connection?.saveData || state.optimized || state.hidden) {
        return Promise.resolve(false);
    }
    if (state.heroVideoReady) {
        document.body.classList.add('hero-video-ready');
        playVideos();
        return Promise.resolve(true);
    }
    if (state.heroVideoPromise) return state.heroVideoPromise;

    const videos = [state.els.vidBack, state.els.vidMid, state.els.vidFront].filter(Boolean);
    state.heroVideoPromise = Promise.resolve(state.heroReady).then(async () => {
        if (state.optimized || state.hidden || videos.length !== 3) return false;
        // Setting all three sources in the same task preserves parallel
        // loading. The independent still remains visible throughout.
        const ready = await Promise.all(videos.map(prepareHeroVideo));
        if (!ready.every(Boolean) || state.optimized || state.hidden) return false;
        if (!heroOverlayHasAlpha(state.els.vidMid) || !heroOverlayHasAlpha(state.els.vidFront)) {
            videos.forEach((video) => video.pause());
            return false;
        }

        videos.forEach((video) => {
            video.pause();
            try { video.currentTime = 0; } catch (_) {}
        });
        const playing = await Promise.all(videos.map((video) => video.play()
            .then(() => true)
            .catch(() => false)));
        if (!playing.every(Boolean)) return false;

        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        state.heroVideoReady = true;
        document.body.classList.add('hero-video-ready');
        return true;
    }).then((ok) => {
        if (!ok) state.heroVideoPromise = null;
        return ok;
    }).catch(() => {
        state.heroVideoPromise = null;
        return false;
    });
    return state.heroVideoPromise;
}

function initHeroVideoSources() {
    // A complete static <picture> is shown first. Motion is revealed only when
    // all three transparent WebM layers have decoded, so mobile never flashes
    // a black or partially assembled hero.
    if (reducedMotion() || navigator.connection?.saveData) return;
    const startAll = () => { activateHeroVideos(); };
    window.addEventListener('pointerdown', startAll, { once: true, passive: true });
    window.addEventListener('keydown', startAll, { once: true });
    Promise.resolve(state.heroReady).then(() => setTimeout(startAll, 3200));
}

function playVideos() {
    if (!state.heroVideoReady || state.optimized || state.hidden) return;
    $$('.bg-video').forEach((video) => {
        if (video.querySelector('source[src]') && video.paused) video.play().catch(() => {});
    });
}

/* ---------- Portfolio pointer motion ---------- */
function initCardGlow() {
    // Fine pointers get a small, frame-rate-independent tilt/parallax. The
    // values are eased in requestAnimationFrame instead of writing raw
    // mousemove coordinates directly, so slow and fast pointer movement both
    // feel stable. Touch and reduced-motion users keep a static card.
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!finePointer.matches || reducedMotion()) return;

    const allStates = [];
    const activeStates = new Set();
    let raf = 0;
    let lastTime = 0;
    const lerp = (from, to, amount) => from + (to - from) * amount;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const write = (motion) => {
        const { card, current } = motion;
        card.style.setProperty('--tilt-x', `${current.tiltX.toFixed(3)}deg`);
        card.style.setProperty('--tilt-y', `${current.tiltY.toFixed(3)}deg`);
        card.style.setProperty('--card-lift', `${current.lift.toFixed(3)}px`);
        card.style.setProperty('--card-scale', current.scale.toFixed(5));
        card.style.setProperty('--media-x', `${current.mediaX.toFixed(3)}px`);
        card.style.setProperty('--media-y', `${current.mediaY.toFixed(3)}px`);
        card.style.setProperty('--media-scale', current.mediaScale.toFixed(5));
        card.style.setProperty('--mx', `${current.mx.toFixed(2)}%`);
        card.style.setProperty('--my', `${current.my.toFixed(2)}%`);
    };

    const rest = (motion) => {
        const focusLift = motion.focused && !state.optimized;
        Object.assign(motion.target, {
            tiltX: 0,
            tiltY: 0,
            lift: focusLift ? -6 : 0,
            scale: focusLift ? 1.006 : 1,
            mediaX: 0,
            mediaY: 0,
            mediaScale: focusLift ? 1.018 : 1,
            mx: 50,
            my: 30
        });
    };

    const wake = (motion) => {
        activeStates.add(motion);
        if (raf) return;
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
    };

    const tick = (now) => {
        raf = 0;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        // Roughly the same response at 60/120/144 Hz.
        const amount = 1 - Math.exp(-13 * dt);
        let needsAnotherFrame = false;

        activeStates.forEach((motion) => {
            if (state.optimized) {
                motion.inside = false;
                rest(motion);
            }

            let maxDelta = 0;
            Object.keys(motion.current).forEach((key) => {
                const before = motion.current[key];
                const after = lerp(before, motion.target[key], amount);
                motion.current[key] = after;
                maxDelta = Math.max(maxDelta, Math.abs(motion.target[key] - after));
            });
            write(motion);

            if (maxDelta > 0.015) {
                needsAnotherFrame = true;
                return;
            }

            // Snap the final sub-pixel values and stop the RAF until the next
            // pointer/focus event. This avoids an always-running animation.
            Object.assign(motion.current, motion.target);
            write(motion);
            activeStates.delete(motion);
            if (!motion.inside && !motion.focused) {
                motion.card.classList.remove('is-pointer-active');
            }
        });

        if (needsAnotherFrame || activeStates.size) raf = requestAnimationFrame(tick);
    };

    const pointCard = (motion, event) => {
        if (state.optimized) return;
        const rect = motion.card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
        const nx = px * 2 - 1;
        const ny = py * 2 - 1;
        Object.assign(motion.target, {
            tiltX: -ny * 2.8,
            tiltY: nx * 3.4,
            lift: -9,
            scale: 1.01,
            mediaX: -nx * 3.5,
            mediaY: -ny * 3.5,
            mediaScale: 1.035,
            mx: px * 100,
            my: py * 100
        });
        wake(motion);
    };

    $$('.portfolio-card').forEach((card) => {
        if (card.dataset.pointerMotionBound) return;
        card.dataset.pointerMotionBound = '1';
        card.classList.add('has-pointer-motion');

        const initial = {
            tiltX: 0,
            tiltY: 0,
            lift: 0,
            scale: 1,
            mediaX: 0,
            mediaY: 0,
            mediaScale: 1,
            mx: 50,
            my: 30
        };
        const motion = {
            card,
            current: { ...initial },
            target: { ...initial },
            inside: false,
            focused: false
        };
        allStates.push(motion);
        write(motion);

        card.addEventListener('pointerenter', (event) => {
            if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
            motion.inside = true;
            card.classList.add('is-pointer-active');
            pointCard(motion, event);
        }, { passive: true });
        card.addEventListener('pointermove', (event) => {
            if (!motion.inside) return;
            pointCard(motion, event);
        }, { passive: true });
        const leave = () => {
            motion.inside = false;
            rest(motion);
            wake(motion);
        };
        card.addEventListener('pointerleave', leave, { passive: true });
        card.addEventListener('pointercancel', leave, { passive: true });

        card.addEventListener('focusin', () => {
            motion.focused = true;
            card.classList.add('is-pointer-active');
            if (!motion.inside) rest(motion);
            wake(motion);
        });
        card.addEventListener('focusout', (event) => {
            if (card.contains(event.relatedTarget)) return;
            motion.focused = false;
            if (!motion.inside) rest(motion);
            wake(motion);
        });
    });

    document.addEventListener('zazary:fx', () => {
        if (!state.optimized) return;
        allStates.forEach((motion) => {
            motion.inside = false;
            rest(motion);
            wake(motion);
        });
    });
}

/* ---------- Hero video aspect ratio for featured card ---------- */
function syncFeaturedAspect() {
    const card = $('#card-flourite');
    const vid = card?.querySelector('video.folio-video');
    if (!card || !vid) return;
    const apply = (w, h) => { if (w && h) card.style.setProperty('--ar', `${w} / ${h}`); };
    if (vid.videoWidth) apply(vid.videoWidth, vid.videoHeight);
    vid.addEventListener('loadedmetadata', () => apply(vid.videoWidth, vid.videoHeight), { once: true });
}

/* ---------- Lazy portfolio media ---------- */
function initPortfolioImages() {
    const images = $$('.folio-photo[data-src]');
    const activate = (image) => {
        if (!image.dataset.src) return;
        if (image.dataset.sizes) image.sizes = image.dataset.sizes;
        if (image.dataset.srcset) image.srcset = image.dataset.srcset;
        image.src = image.dataset.src;
        image.removeAttribute('data-src');
        image.removeAttribute('data-srcset');
        image.removeAttribute('data-sizes');
    };
    if (!('IntersectionObserver' in window)) {
        images.forEach(activate);
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            activate(entry.target);
            observer.unobserve(entry.target);
        }
    }, { rootMargin: '480px 0px', threshold: 0.01 });
    images.forEach((image) => observer.observe(image));
}

function tuneVideoPlayback() {
    // Portfolio poster and WebM URLs live in data attributes so neither is
    // fetched with the critical hero. Posters appear just before the card;
    // desktop then starts motion, while mobile/data-saver/reduced-motion
    // retain the representative still frame.
    const videos = $$('.folio-video');
    const narrow = window.matchMedia('(max-width: 640px)').matches;
    const saveData = navigator.connection?.saveData;
    const mayAnimate = !narrow && !saveData && !reducedMotion();

    const activate = (video) => {
        if (video.dataset.poster) {
            video.poster = video.dataset.poster;
            video.removeAttribute('data-poster');
        }
        if (!mayAnimate) return;
        const source = $('source[data-src]', video);
        if (!source) return;
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
        video.load();
    };

    videos.forEach((video) => {
        video.preload = 'none';
        video.removeAttribute('autoplay');
        if (!mayAnimate) video.pause();
    });

    if (!('IntersectionObserver' in window)) {
        videos.forEach((video) => {
            activate(video);
            if (mayAnimate) video.play().catch(() => {});
        });
        return;
    }
    const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const video = entry.target;
            if (entry.isIntersecting) {
                activate(video);
                if (mayAnimate) video.play().catch(() => {});
            } else {
                video.pause();
            }
        }
    }, { rootMargin: '320px 0px', threshold: 0.01 });
    videos.forEach((video) => io.observe(video));
}

/* ---------- Global key handling ---------- */
function initKeyHandlers() {
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const z = $('#folioZoom');
        if (z && !z.hidden) { closeZoom(); return; }
        if ($('#emailModal')?.classList.contains('is-open')) { closeEmailModal(); return; }
        if ($('#wechatModal')?.classList.contains('is-open')) { closeWechatModal(); return; }
        if ($('#folioModal')?.classList.contains('is-open')) { closeModal(); return; }
        if ($('#mobileNavDrawer')?.classList.contains('is-open')) { closeMobile(); return; }
    });
}

/* ---------- Anchor click handler ---------- */
function initAnchors() {
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href').slice(1);
        if (!id || !document.getElementById(id)) return;
        e.preventDefault();
        scrollToId(id);
        closeMobile();
        playVideos();
    });
}

/* ---------- Boot ---------- */
async function boot() {
    // Entry point. Runs once when the module loads. Order matters here:
    //   1. flip no-js -> ready so the preloader knows JS is alive
    //   2. inject runtime-only strings (email, discord URL) into the DOM
    //   3. cache element refs into `state.els` so we don't re-query
    //   4. wire all UI listeners (mobile nav, modals, sort, preloader, ...)
    //   5. await loadI18n -> applyI18n populates every section
    //
    // Some listeners are bound BEFORE i18n finishes (so the page is
    // interactive as soon as possible) and then re-bound AFTER so any
    // ARIA labels / titles that depend on translations get refreshed.
    // See `bindExperienceSort` for an example of this idempotent pattern.
    document.body.classList.remove('no-js');
    document.body.dataset.state = 'ready';

    /* Inject email address into [data-email-here] placeholders. The
       address is never a literal substring in the static HTML, so
       Cloudflare's email-obfuscation script won't touch the page. */
    const emailStr = buildEmail();
    $$('[data-email-here]').forEach((el) => { el.textContent = emailStr; });

    /* Same trick for the Discord profile URL — `discord.com/users/zazaryxs`
       looks like `zazaryxs@discord.com` to Cloudflare's regex, so it
       gets obfuscated. Build the URL at runtime. */
    const discordUrl = 'https://discord.com/users/' + EMAIL_USER;
    $$('[data-discord-href]').forEach((el) => { el.setAttribute('href', discordUrl); });

    /* Cache element refs */
    state.els.hero    = $('#hero');
    state.els.bg      = $('#parallaxBg');
    state.els.heroId  = $('#heroIdentity');
    state.els.vidBack = $('.video-layer-1');
    state.els.vidMid  = $('.video-layer-2');
    state.els.vidFront = $('.video-layer-3');

    initFxPrompt();
    initMobileNav();
    initPortfolio();
    initReveal(); // static portfolio must stay visible even if i18n fetch fails
    initKeyHandlers();
    initAnchors();
    initPreloader();
    initHeroVideoSources();
    initCardGlow();
    initPortfolioImages();
    tuneVideoPlayback();
    syncFeaturedAspect();
    syncHeroCtaGhost();
    bindExperienceCollapse();
    bindExperienceSort();
    bindFaqCollapse();
    bindPriceCurrency();
    initWechatModal();
    initEmailModal();

    /* English hero/portfolio copy is already in the HTML. Hydrate the large
       below-fold data grids only when they approach, on first interaction,
       or after a quiet five-second fallback. Returning non-English visitors
       start their locale request immediately. */
    let hydrationTimer = 0;
    let hydrationObserver = null;
    const hydrate = () => {
        if (hydrationTimer) clearTimeout(hydrationTimer);
        hydrationObserver?.disconnect();
        ensureInitialI18n();
    };
    if (state.lang === 'en') {
        hydrationTimer = setTimeout(hydrate, 5000);
        if ('IntersectionObserver' in window) {
            hydrationObserver = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) hydrate();
            }, { rootMargin: '2500px 0px', threshold: 0 });
            hydrationObserver.observe($('#about'));
        }
        window.addEventListener('pointerdown', hydrate, { once: true, passive: true });
        window.addEventListener('keydown', hydrate, { once: true });
    } else {
        hydrate();
    }

    /* Lang switch */
    const sw = $('#langSwitch');
    const toggle = document.querySelector('.lang-toggle');
    if (toggle) toggle.setAttribute('data-pos', state.lang);
    /* Click on a label = direct switch to that lang (not cycling) */
    if (toggle) {
        $$('.lang-label', toggle).forEach((label) => {
            label.addEventListener('click', (e) => {
                e.preventDefault();
                const target = label.dataset.langLabel;
                if (target && target !== state.lang) setLanguage(target);
            });
        });
    }
    if (sw) {
        sw.checked = false;
        sw.addEventListener('change', () => {
            const next = { en: 'ru', ru: 'ja', ja: 'zh', zh: 'en' };
            setLanguage(next[state.lang] || 'en');
        });
    }

    /* Sakura: initialize one frame after geometry caches are populated, so
       adding petals cannot invalidate a same-frame layout read. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
        try { state.sakura = new Sakura($('#sakuraContainer')); } catch (_) {}
    }));

    /* Scroll / visibility. Transform-only parallax writes happen in the scroll
       event itself, before the next paint, instead of trailing by another RAF. */
    initSpyMetrics();
    const syncScrollEffects = () => {
        state.scrollY = window.scrollY || window.pageYOffset || 0;
        updateChrome();
        spy();
        updateParallax(state.scrollY);
    };
    window.addEventListener('scroll', () => {
        syncScrollEffects();
        clearTimeout(scrollSettleTimer);
        // `scrollend` is not universal yet; this small fallback guarantees the
        // exact final transform after a large fling or an instant return home.
        scrollSettleTimer = setTimeout(syncScrollEffects, 80);
    }, { passive: true });
    window.addEventListener('scrollend', syncScrollEffects, { passive: true });

    document.addEventListener('visibilitychange', () => {
        state.hidden = document.hidden;
        if (state.hidden) {
            cancelAnimationFrame(state.raf);
            $$('.bg-video').forEach((v) => v.pause());
        } else {
            playVideos();
            scheduleMotionFrame();
        }
    });

    ['click', 'touchstart', 'keydown'].forEach((ev) =>
        window.addEventListener(ev, playVideos, { passive: true }));

    // The top-of-page HTML/CSS already represents the zero-scroll state.
    // Avoid a final geometry read after the large i18n DOM-write batch; the
    // first real scroll/resize event updates chrome and motion as needed.
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
