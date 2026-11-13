#!/usr/bin/env node
/*
 * build.mjs - keeps the shipped bundles in sync with the sources.
 *
 *   node tools/build.mjs           rebuild js/main.min.js + js/i18n.bundle.min.js
 *   node tools/build.mjs --check   verify only (exit 1 when something is stale)
 *
 * Sources of truth:
 *   js/main.js              -> js/main.min.js        (terser)
 *   data/i18n.<lang>.json   -> js/i18n.bundle.min.js (globalThis.ZAZARY_I18N)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const rp = (p) => path.join(root, p);
const log = (...a) => console.log(...a);

const LANGS = ['en', 'ru', 'ja', 'zh'];

async function minifyJs(src, out) {
    let terser;
    try {
        terser = await import('terser');
    } catch {
        throw new Error('terser is not installed - run: npm install');
    }
    const code = await readFile(src, 'utf8');
    const res = await terser.minify(code, {
        compress: { passes: 2 },
        mangle: true,
        format: { comments: /^!/ }
    });
    if (res.error) throw res.error;
    const prev = existsSync(out) ? await readFile(out, 'utf8') : '';
    const changed = prev !== res.code;
    if (!checkOnly && changed) await writeFile(out, res.code);
    return { changed, bytes: Buffer.byteLength(res.code), prevBytes: Buffer.byteLength(prev) };
}

async function bundleI18n() {
    // keep the language order used by the shipped bundle
    const bundlePath = rp('js/i18n.bundle.min.js');
    const order = existsSync(bundlePath)
        ? Object.keys(JSON.parse((await readFile(bundlePath, 'utf8'))
              .replace(/^globalThis\.ZAZARY_I18N=/, '').replace(/;\s*$/, '')))
        : LANGS;
    const data = {};
    for (const lang of order) {
        data[lang] = JSON.parse(await readFile(rp(`data/i18n.${lang}.json`), 'utf8'));
    }
    const code = 'globalThis.ZAZARY_I18N=' + JSON.stringify(data) + ';';
    const prev = existsSync(bundlePath) ? await readFile(bundlePath, 'utf8') : '';
    const changed = prev !== code;
    if (!checkOnly && changed) await writeFile(bundlePath, code);
    return { changed, bytes: Buffer.byteLength(code), prevBytes: Buffer.byteLength(prev) };
}

function sha256(text) {
    return 'sha256-' + createHash('sha256').update(text, 'utf8').digest('base64');
}

async function checkCsp() {
    const html = await readFile(rp('index.html'), 'utf8');
    const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] || '';
    const quoted = new Set((csp.match(/'sha256-[^']+'/g) || []).map((s) => s.slice(1, -1)));
    const problems = [];

    for (const [, attrs, body] of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
        if (attrs.includes('ld+json') || !body.trim()) continue;
        const h = sha256(body);
        if (!quoted.has(h)) problems.push(`inline <script> at line ${html.slice(0, html.indexOf(body)).split('\n').length} -> ${h} not in CSP`);
    }
    for (const [, value] of html.matchAll(/\son[a-z]+\s*=\s*"([^"]*)"/g)) {
        const h = sha256(value);
        if (!quoted.has(h)) problems.push(`inline handler "${value}" -> ${h} not in CSP`);
    }
    for (const [, body] of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
        const h = sha256(body);
        if (!quoted.has(h) && !csp.includes("style-src 'self' 'unsafe-inline'")) {
            problems.push(`inline <style> -> ${h} not in CSP (style-src)`);
        }
    }
    return problems;
}

const report = [];
const js = await minifyJs(rp('js/main.js'), rp('js/main.min.js'));
report.push(`js/main.min.js        ${js.changed ? 'rebuilt' : 'up to date'}  ${(js.bytes / 1024).toFixed(1)} kB`);

const i18n = await bundleI18n();
report.push(`js/i18n.bundle.min.js ${i18n.changed ? 'rebuilt' : 'up to date'}  ${(i18n.bytes / 1024).toFixed(1)} kB`);

const cspProblems = await checkCsp();
report.push(cspProblems.length ? `csp: ${cspProblems.length} problem(s)` : 'csp: inline script/style hashes match');

log(report.join('\n'));
if (cspProblems.length) {
    log('\nCSP problems:');
    cspProblems.forEach((p) => log(' - ' + p));
}

const stale = js.changed || i18n.changed;
if (checkOnly) {
    if (stale) log('\nstale: run `npm run build` and commit the result');
    process.exit(stale || cspProblems.length ? 1 : 0);
}
if (cspProblems.length) process.exit(1);
log('\ndone. bump ?v= in index.html when shipping assets that changed.');
