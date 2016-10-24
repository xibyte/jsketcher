const path = require('path');
const webpack = require('webpack');

module.exports = {
  devtool: 'source-map',
  entry: {
    index: ['./web/app/index', 'webpack-dev-server/client?http://localhost:3000', 'webpack/hot/only-dev-server' ],
    sketcher: ['./web/app/sketcher', 'webpack-dev-server/client?http://localhost:3000', 'webpack/hot/only-dev-server' ]
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].bundle.js',
    chunkFilename: '[id].bundle.js',
    publicPath: '/static/'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
  ],
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: ['babel'],
      include: path.join(__dirname, 'web/app')
    }, {
      test: /\.css$/,
      loader: 'style!css'
    },
    {
      test: /\.less$/,
      loader: "style!css?-url!less"
    },
    {
      test: /\.html$/,
      loader: 'mustache'
    }]
  }
};
