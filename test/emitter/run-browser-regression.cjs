// Run after npm ci and a production-shaped build. A temporary browser-target
// bundle shares the real webpack resolver; no test output enters the app.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const webpack = require('webpack');
const config = require('../../webpack.config');
const root = path.resolve(__dirname, '../..');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const digest = 'd2e2f52d26bf98e8fe2e5bbe1d367b7a8da61397a670c8a24a380447463159ce';
assert.equal(sha(path.join(root, 'node_modules/emitter-component/index.js')), digest);
assert.equal(sha(path.join(root, 'node_modules/component-emitter/index.js')), digest);
assert.equal(sha(path.join(root, 'node_modules/component-emitter/LICENSE')), '0f0b408b8b871d983e767528c6dc51e0ad7efaa022890c449fe2b2e1ee24dbb7');
function checkBundle(file) {
  const data = fs.readFileSync(file, 'utf8');
  assert.match(data, /node_modules\/component-emitter\/index\.js/);
  assert.doesNotMatch(data, /node_modules\/emitter-component\/index\.js/);
  assert.match(data, /node_modules\/stream\/index\.js/);
  assert.match(data, /node_modules\/sax\/lib\/sax\.js/);
}
checkBundle(path.join(root, 'dist/static/index.bundle.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codi-emitter-test-'));
webpack({mode:'development', target:'web', entry:path.join(__dirname,'browser-entry.cjs'),
  output:{path:dir,filename:'browser.js'}, resolve:config.resolve}, (error, stats) => {
  try {
    if (error) throw error;
    if (stats.hasErrors()) throw Error(stats.toString({all:false,errors:true,errorDetails:true}));
    const file = path.join(dir, 'browser.js');
    checkBundle(file);
    require(file);
    console.log('PASS byte-identical licensed emitter, production bundle resolution, SAX stream events and XML parsing');
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
