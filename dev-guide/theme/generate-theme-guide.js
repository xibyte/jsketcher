/* eslint-env node */
/**
 * generate-theme-guide.js
 *
 * Reads the real CSS custom properties from:
 *   modules/ui/styles/theme.less        (:root block — dark defaults)
 *   modules/ui/styles/theme-light.less   (body.theme-light block — light overrides)
 *
 * and injects them into dev-guide/theme/theme-guide.html between the
 * AUTO-GENERATED markers, replacing the previously embedded copy.
 *
 * Usage:  node dev-guide/theme/generate-theme-guide.js
 *
 * Run this whenever the theme .less files change to keep the visual
 * guide in sync.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const themeLessPath = path.join(repoRoot, 'modules', 'ui', 'styles', 'theme.less');
const themeLightLessPath = path.join(repoRoot, 'modules', 'ui', 'styles', 'theme-light.less');
const htmlPath = path.join(__dirname, 'theme-guide.html');

// --- Extract a CSS rule block from a .less file ---------------------------
// Returns the full text including the selector and braces, e.g.
//   ":root {\n  --foo: bar;\n}"
function extractBlock(filePath, selector) {
  const src = fs.readFileSync(filePath, 'utf8');
  // Match the selector followed by { ... } (non-greedy, brace-matched-ish)
  // We use a simple approach: find the selector, then walk braces.
  const selIdx = src.indexOf(selector);
  if (selIdx === -1) {
    throw new Error(`Selector "${selector}" not found in ${filePath}`);
  }
  const braceOpen = src.indexOf('{', selIdx);
  if (braceOpen === -1) {
    throw new Error(`No opening brace after "${selector}" in ${filePath}`);
  }
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) {
    throw new Error(`Unbalanced braces after "${selector}" in ${filePath}`);
  }
  return src.slice(selIdx, i).trimEnd();
}

// --- Main -----------------------------------------------------------------
function main() {
  const darkBlock = extractBlock(themeLessPath, ':root');
  const lightBlock = extractBlock(themeLightLessPath, 'body.theme-light');

  // The .less file uses "body.theme-light" as the selector, but in the
  // standalone HTML guide the light theme is applied to a <div class="theme-light">
  // inside the light column, not to <body>. Rewrite the selector so it matches.
  const lightBlockForDiv = lightBlock.replace(
    'body.theme-light {',
    '.theme-light {'
  );

  // Build the replacement text
  const generated = [
    '/* BEGIN AUTO-GENERATED THEME VARS — do not edit; run generate-theme-guide.js */',
    '/* --- Dark theme (default :root) --- */',
    darkBlock,
    '',
    '/* --- Light theme --- */',
    lightBlockForDiv,
    '/* END AUTO-GENERATED THEME VARS */',
  ].join('\n');

  // Read the HTML and replace between markers
  let html = fs.readFileSync(htmlPath, 'utf8');
  const beginMarker = '/* BEGIN AUTO-GENERATED THEME VARS';
  const endMarker = '/* END AUTO-GENERATED THEME VARS */';
  const beginIdx = html.indexOf(beginMarker);
  const endIdx = html.indexOf(endMarker);

  if (beginIdx === -1 || endIdx === -1) {
    throw new Error(
      `Could not find auto-generated markers in ${htmlPath}.\n` +
      `Make sure the HTML contains "${beginMarker}" and "${endMarker}".`
    );
  }

  // Replace from the start of the begin marker to the end of the end marker
  const before = html.slice(0, beginIdx);
  const after = html.slice(endIdx + endMarker.length);
  html = before + generated + after;

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('theme-guide.html regenerated from theme.less + theme-light.less');
}

main();
