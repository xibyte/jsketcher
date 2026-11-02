// Bundles the actual importer for Node; the viewer and browser UI are not exercised.
const webpack = require('webpack');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '../..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'jsketcher-dxf-test-'));
const deps = process.env.DXF_TEST_DEPENDENCIES;
const config = {
  mode: 'development', target: 'node', devtool: false, context: root,
  entry: path.join(__dirname, 'dxf-import.test.js'),
  output: {path: output, filename: 'test.cjs'},
  resolve: {extensions: ['.ts', '.tsx', '.js', '.jsx'], modules: [path.join(root, 'modules'), path.join(root, 'web/app'), ...(deps ? [deps] : []), path.join(root, 'node_modules')]},
  module: {rules: [{test: /\.[jt]sx?$/, exclude: /node_modules/, use: 'babel-loader'}, {test: /\.(svg|less|css)$/, type: 'asset/source'}]},
};
webpack(config, (error, stats) => {
  try {
    if (error || stats.hasErrors()) { console.error(error || stats.toString({all: false, errors: true})); process.exitCode = 1; return; }
    const bootstrap = 'global.window=global; window.location={search:""}; window.addEventListener=()=>{}; window.removeEventListener=()=>{}; global.verb={eval:{Analyze:{rationalSurfaceClosestParam(){throw new Error("unexpected NURBS call")}}}}; require(process.argv[1]);';
    const run = spawnSync(process.execPath, ['-e', bootstrap, path.join(output, 'test.cjs')], {stdio: 'inherit'});
    if (run.error) console.error(run.error);
    process.exitCode = run.status === null ? 1 : run.status;
  } finally { fs.rmSync(output, {recursive: true, force: true}); }
});
