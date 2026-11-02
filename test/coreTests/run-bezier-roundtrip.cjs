// Exercise the real TypeScript module with the project's installed bundler.
const webpack = require('webpack');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '../..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'jsketcher-bezier-test-'));
const config = {
  mode: 'development', target: 'node', devtool: false, context: root,
  entry: path.join(__dirname, 'bezier-roundtrip.test.ts'),
  output: {path: output, filename: 'test.cjs'},
  resolve: {extensions: ['.ts', '.tsx', '.js', '.jsx'], modules: [path.join(root, 'modules'), path.join(root, 'web/app'), path.join(root, 'node_modules')]},
  module: {rules: [{test: /\.[jt]sx?$/, exclude: /node_modules/, use: 'babel-loader'}, {test: /\.svg$/, type: 'asset/source'}]},
};
webpack(config, (error, stats) => {
  try {
    if (error || stats.hasErrors()) {
      console.error(error || stats.toString({all: false, errors: true, errorDetails: true}));
      process.exitCode = 1;
      return;
    }
    const bootstrap = 'global.verb = {eval:{Analyze:{rationalSurfaceClosestParam() { throw new Error("Unexpected NURBS call"); }}}}; require(process.argv[1]);';
    const run = spawnSync(process.execPath, ['-e', bootstrap, path.join(output, 'test.cjs')], {stdio: 'inherit'});
    if (run.error) { console.error(run.error); process.exitCode = 1; }
    else process.exitCode = run.status === null ? 1 : run.status;
  } finally { fs.rmSync(output, {recursive: true, force: true}); }
});
