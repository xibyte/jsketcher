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
    publicPath: '/static/'
  },
  externals: {
    'verb-nurbs': 'verb'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
  ],
  resolve: {
    extensions: ['.js', '.jsx', ".ts", ".tsx"],
    modules: [MODULES, "node_modules", WEB_APP]
  },
  devServer: {
    hot: false,
    inline: false,
    contentBase: [
      path.join(__dirname, 'web'),
    ],
    before(app) {
      libAssets.forEach(asset => {
        app.get(`/lib-assets/${asset}`, function (req, res) {
          res.sendFile(path.join(NODE_MODULES, asset))
        })
      });
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
        //Temporary until dxf-writer library publishes browser friendly bundle
        test: /\.js$/,
        include: [`${NODE_MODULES}/dxf-writer`],
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: [
            "@babel/proposal-class-properties"
          ]
        }
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
        loader: "file-loader"
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
  node: {
    __dirname: true
  }
};
