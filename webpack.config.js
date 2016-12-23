const path = require('path');
const webpack = require('webpack');

module.exports = {
  devtool: 'source-map',
  entry: {
    index: ['./web/app/index'],
    sketcher: ['./web/app/sketcher']
  },
  output: {
    path: path.join(__dirname, 'dist/static'),
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
      include: [path.join(__dirname, 'web/app'), path.join(__dirname, 'web/test')]
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
      loader: 'handlebars?helperDirs[]=' + __dirname + '/web/app/ui/helpers'
    }]
  }
};
