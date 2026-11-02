const path=require('path'),config=require('../../webpack.config');
config.entry={numericSolverProbe:'./test/webos/numeric-solver-entry.js'};
config.module.rules[0].include.push(path.resolve(__dirname,'..'));
config.devtool=false;
module.exports=config;
