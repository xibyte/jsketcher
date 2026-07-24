/* eslint-env node */
/**
 * Theme system tests — validates that the dark and light theme .less files
 * are structurally consistent, that theme switching is wired correctly,
 * and that all variables have matching LESS @ aliases.
 *
 * Run:  node test/theme.test.js   (or:  npm run test:theme)
 *
 * Exits 0 on success, 1 on any failure.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const themeDarkPath = path.join(__dirname, '..', 'modules', 'ui', 'styles', 'theme.less');
const themeLightPath = path.join(__dirname, '..', 'modules', 'ui', 'styles', 'theme-light.less');

const themeDarkSrc = fs.readFileSync(themeDarkPath, 'utf8');
const themeLightSrc = fs.readFileSync(themeLightPath, 'utf8');

let failures = 0;
let passes = 0;

function assert(cond, msg) {
  if (cond) {
    passes++;
  } else {
    failures++;
    console.error('  FAIL: ' + msg);
  }
}

/**
 * Extract CSS custom property declarations from a block of LESS source.
 * Returns a Map of varName -> raw value string.
 */
function extractCssVars(src) {
  const vars = new Map();
  // Match:  --some-var: <value>;
  const re = /^\s*(--[a-z0-9-]+)\s*:\s*(.+?);\s*$/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    vars.set(m[1], m[2].trim());
  }
  return vars;
}

/**
 * Extract LESS @ alias declarations from source.
 * Returns a Set of CSS var names that have a matching alias.
 * Matches:  @some-alias: var(--some-var);
 */
function extractLessAliases(src) {
  const aliases = new Set();
  const re = /@([a-z0-9-]+)\s*:\s*var\((--[a-z0-9-]+)\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    aliases.add(m[2]);
  }
  return aliases;
}

// ---------------------------------------------------------------------------
// 1. Both files parse and contain CSS variables
// ---------------------------------------------------------------------------
console.log('\n[1] Both theme files contain CSS custom properties');

const darkVars = extractCssVars(themeDarkSrc);
const lightVars = extractCssVars(themeLightSrc);

assert(darkVars.size > 50, `dark theme should define >50 CSS vars, found ${darkVars.size}`);
assert(lightVars.size > 50, `light theme should define >50 CSS vars, found ${lightVars.size}`);

// ---------------------------------------------------------------------------
// 2. Dark and light themes define the same set of variable names
// ---------------------------------------------------------------------------
console.log('\n[2] Dark and light themes define the same variable names');

const darkOnly = [...darkVars.keys()].filter(k => !lightVars.has(k));
const lightOnly = [...lightVars.keys()].filter(k => !darkVars.has(k));

assert(darkOnly.length === 0, `vars only in dark theme (missing from light): ${darkOnly.join(', ')}`);
assert(lightOnly.length === 0, `vars only in light theme (missing from dark): ${lightOnly.join(', ')}`);

// ---------------------------------------------------------------------------
// 3. Key variables differ between dark and light (proves switching works)
// ---------------------------------------------------------------------------
console.log('\n[3] Key variables differ between dark and light theme');

const keysThatMustDiffer = [
  '--bg-color-0',
  '--bg-color-1',
  '--bg-color-5',
  '--font-color',
  '--font-color-empph',
  '--border-color',
  '--work-area-color',
  '--widget-color',
  '--button-bg',
  '--button-color',
  '--menu-hover-bg',
  '--explorer-hover-bg',
  '--color-danger',
  '--color-accent',
];

for (const key of keysThatMustDiffer) {
  const d = darkVars.get(key);
  const l = lightVars.get(key);
  assert(d && l, `${key} should exist in both themes`);
  // Skip vars that reference other vars (e.g. var(--bg-color-6)) — their
  // resolved value differs transitively even though the raw string is the same.
  const isRef = v => v && v.startsWith('var(');
  if (!isRef(d) && !isRef(l)) {
    assert(d !== l, `${key} should differ between dark (${d}) and light (${l})`);
  }
}

// ---------------------------------------------------------------------------
// 4. Light theme uses body.theme-light selector (switching mechanism)
// ---------------------------------------------------------------------------
console.log('\n[4] Light theme uses body.theme-light selector');

assert(/body\.theme-light\s*\{/.test(themeLightSrc),
  'theme-light.less must contain a body.theme-light { ... } block');
assert(/^\s*:root\s*\{/m.test(themeDarkSrc),
  'theme.less must contain a :root { ... } block (dark defaults)');

// ---------------------------------------------------------------------------
// 5. No invalid hsl() syntax (hsl(0, 0, X%) without the % on the second arg)
// ---------------------------------------------------------------------------
console.log('\n[5] All hsl() values use valid syntax with % on lightness');

const allSrc = themeDarkSrc + '\n' + themeLightSrc;
// hsl(H, S, L) where S is a bare number without % is invalid
// Valid: hsl(0, 0%, 90%)  Invalid: hsl(0, 0, 90%)
const invalidHsl = allSrc.match(/hsl\([^,]+,\s*\d+(?![\d.])\s*,/gi);
assert(invalidHsl === null,
  `found invalid hsl() syntax (saturation missing %): ${invalidHsl ? invalidHsl.join(', ') : ''}`);

// ---------------------------------------------------------------------------
// 6. Every CSS var in :root has a matching LESS @ alias
// ---------------------------------------------------------------------------
console.log('\n[6] Every CSS variable has a matching LESS @ alias');

const aliases = extractLessAliases(themeDarkSrc);
const unaliased = [...darkVars.keys()].filter(k => !aliases.has(k));
assert(unaliased.length === 0,
  `${unaliased.length} CSS var(s) without LESS @ alias: ${unaliased.join(', ')}`);

// ---------------------------------------------------------------------------
// 7. Contrast variables exist in both themes
// ---------------------------------------------------------------------------
console.log('\n[7] Contrast variables exist in both themes');

assert(darkVars.has('--contrast-on-color'), 'dark theme has --contrast-on-color');
assert(darkVars.has('--contrast-on-light'), 'dark theme has --contrast-on-light');
assert(lightVars.has('--contrast-on-color'), 'light theme has --contrast-on-color');
assert(lightVars.has('--contrast-on-light'), 'light theme has --contrast-on-light');
assert(darkVars.get('--contrast-on-color') === '#fff',
  `dark --contrast-on-color should be #fff, got ${darkVars.get('--contrast-on-color')}`);
assert(lightVars.get('--contrast-on-color') === '#fff',
  `light --contrast-on-color should be #fff, got ${lightVars.get('--contrast-on-color')}`);

// ---------------------------------------------------------------------------
// 8. Theme switching code references body.theme-light
// ---------------------------------------------------------------------------
console.log('\n[8] Theme switching code references body.theme-light');

const coreActionsPath = path.join(__dirname, '..', 'web', 'app', 'cad', 'actions', 'coreActions.js');
const webAppPath = path.join(__dirname, '..', 'web', 'app', 'cad', 'dom', 'components', 'WebApplication.jsx');

const coreActionsSrc = fs.readFileSync(coreActionsPath, 'utf8');
const webAppSrc = fs.readFileSync(webAppPath, 'utf8');

assert(/classList\.toggle\(['"]theme-light['"]\)/.test(coreActionsSrc),
  'coreActions.js should toggle theme-light class on body');
assert(/localStorage\.setItem\(['"]jsketcher\.theme['"]/.test(coreActionsSrc),
  'coreActions.js should persist theme choice to localStorage');
assert(/classList\.add\(['"]theme-light['"]\)/.test(webAppSrc),
  'WebApplication.jsx should add theme-light class on load if saved');
assert(/localStorage\.getItem\(['"]jsketcher\.theme['"]\)/.test(webAppSrc),
  'WebApplication.jsx should read theme from localStorage on load');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n----------------------------------------`);
console.log(`Theme tests: ${passes} passed, ${failures} failed`);
console.log(`----------------------------------------`);

if (failures > 0) {
  process.exit(1);
} else {
  console.log('All theme tests passed.');
  process.exit(0);
}
