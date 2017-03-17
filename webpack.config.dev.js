const config = require('./webpack.config.js');

config.entry.test_runner = ['babel-polyfill', './web/test/runner'];
module.exports = config;
