// Compile this helper only after building the application; it is test-only.
const path = require('path');
const config = require('../../webpack.config');
config.entry = {surfacingTest: './test/webos/surfacing-compare-entry.js'};
config.module.rules[0].include.push(path.resolve(__dirname, '..'));
config.output.uniqueName = 'CodiSurfacingTest';
config.output.chunkLoadingGlobal = 'webpackChunkCodiSurfacingTest';
config.output.chunkFilename = 'test-[name].bundle.js';
config.devtool = false;
module.exports = config;
