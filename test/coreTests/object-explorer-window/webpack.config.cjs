// Set OBJECT_EXPLORER_TEST_OUT to an external disposable directory.
const path = require('path');
const config = require('../../../webpack.config');
config.entry = {explorerTest:'./test/coreTests/object-explorer-window/harness.jsx'};
config.output.path = process.env.OBJECT_EXPLORER_TEST_OUT || '/tmp/jsketcher-explorer-test';
config.resolve.symlinks = false;
config.module.rules[0].include.push(path.resolve(__dirname));
config.devtool = false;
module.exports = config;
