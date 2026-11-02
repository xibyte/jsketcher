// Build only the browser-test helper after the normal application build.
const path = require('path');
const config = require('../../webpack.config');
config.entry = {webosTest: './test/webos/helper-entry.js'};
config.module.rules[0].include.push(path.resolve(__dirname, '..'));
config.devtool = false;
module.exports = config;
