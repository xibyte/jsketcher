const path = require('path');
const webpack = require('webpack');

const WEB_APP = path.join(__dirname, 'web/app');
const MODULES = path.join(__dirname, 'modules');
const INTEGRATION_TESTS = path.join(__dirname, 'web/test'); 

module.exports = {
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
    extensions: ['.js', '.jsx'],
    modules: [MODULES, "node_modules"]
  },
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      loader: 'babel-loader',
      include: [MODULES, WEB_APP, INTEGRATION_TESTS],
      options: {
        plugins: [
          ['local-styles-transformer', {include: WEB_APP}]
        ]
      }
    }, {
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
      ]    
    },
    {
      test: /\.less$/,
      use: [
        'style-loader',
        'css-loader?-url',
        'less-loader'
      ]    
    },
    {
      test: /\.html$/,
      use: 'handlebars-loader?helperDirs[]=' + __dirname + '/web/app/ui/helpers'
    },
    {
      test: /\.json$/,
      use: 'json-loader'      
    }]
  },
  devServer: {
    hot: false,
    inline: false,
  }
};
