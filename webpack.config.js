const path = require('path');
const webpack = require('webpack');
const fs = require('fs');
const generateCSSScopedName = require('./build/cssScoopeGenerator')();
const libAssets = require('./build/libAssets');

const WEB_APP = path.join(__dirname, 'web/app');
const MODULES = path.join(__dirname, 'modules');
const NODE_MODULES = path.join(__dirname, 'node_modules');
const INTEGRATION_TESTS = path.join(__dirname, 'web/test');

const GLOBAL_CSS = path.join(__dirname, 'web/css');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    index: ['babel-polyfill', './web/app/index'],
    sketcher: ['babel-polyfill', './web/app/sketcher']
  },
  output: {
    path: path.join(__dirname, 'dist/static'),
    filename: '[name].bundle.js',
    chunkFilename: '[id].bundle.js',
    // Infer the directory from the loaded bundle so nested deployments work.
    publicPath: 'auto'
  },
  externals: {
    'verb-nurbs': 'verb'
  },
  resolve: {
    alias: {
      // stream's browser mapping asks for the old emitter-component name.
      // Use the separately licensed, byte-identical 1.1.3 distribution.
      'emitter-component$': require.resolve('component-emitter'),
      ...(process.env.CODI_EMBED_NUMERIC === '1' ? {'numeric': path.join(__dirname, 'node_modules/.cache/codi-numeric/precompiled.js')} : {}),
      ...(process.env.CODI_EMBED_MANIFOLD === '1' ? {
        'manifold-3d$': path.join(__dirname, 'node_modules/.cache/codi-manifold/manifold.js'),
        'manifold-3d/manifold.wasm$': path.join(__dirname, 'node_modules/.cache/codi-manifold/manifold.wasm'),
      } : {}),
    },
    extensions: ['.js', '.jsx', ".ts", ".tsx"],
    modules: [MODULES, "node_modules", WEB_APP],
  },
  devServer: {
    hot: false,
    liveReload: false,
    client: false,
    static: [
      path.join(__dirname, 'web'),
    ],
    setupMiddlewares(middlewares, devServer) {
      libAssets.forEach(asset => {
        devServer.app.get(`/lib-assets/${asset}`, function (req, res) {
          res.sendFile(path.join(NODE_MODULES, asset))
        })
      });
      devServer.app.get('/manifold.wasm', function (req, res) {
        res.sendFile(path.join(NODE_MODULES, 'manifold-3d/manifold.wasm'))
      });
      return middlewares;
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        loader: 'babel-loader',
        include: [MODULES, WEB_APP, INTEGRATION_TESTS]
      },
      {
        test: /\.(less|css)$/,
        include: [GLOBAL_CSS, INTEGRATION_TESTS],
        use: [
          'style-loader',
          'css-loader?-url',
          'less-loader',
        ]
      },
      {
        test: /\.(css)$/,
        include: [NODE_MODULES],
        use: [
          'style-loader',
          'css-loader',
        ]
      },
      {
        oneOf: [
          {
            test: /\.(less|css)$/,
            include: [path.resolve(MODULES, 'ui/styles/global')],
            use: [
              'style-loader',
              'css-loader',
              'less-loader'
            ]
          },
          {
            test: /\.(less|css)$/,
            include: [MODULES, WEB_APP],
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: {
                  modules: {
                    mode: 'local',
                    getLocalIdent: (context, localIdentName, localName) => generateCSSScopedName(localName, context.resourcePath),
                  },
                  url: false
                }
              },
              'less-loader'
            ]
          }
        ],
      },
      {
        test: /\.wasm$/,
        type: "javascript/auto",
        loader: "file-loader",
        options: {name: '[sha256:hash:hex:20].[ext]'}
      },
      {
        test: /\.svg$/,
        loader: 'raw-loader'
      },
      {
        test: /\.(png|jpg|gif)$/i,
        use: [
          {
            loader: 'url-loader'
          },
        ],
      },
    ]
  },
  plugins: [new webpack.NormalModuleReplacementPlugin(/^node:module$/, path.join(__dirname, 'modules/brep/operations/mesh/browserNodeModuleStub.js'))],
  node: {
    __dirname: true
  }
};
