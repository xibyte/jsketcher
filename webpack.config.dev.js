const config = require('./webpack.config.js');

config.entry.test_runner = ['./web/test/runner'];
module.exports = config;
