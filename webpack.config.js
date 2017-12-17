const path = require('path');
const webpack = require('webpack');

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
    extensions: ['.js', '.jsx']
  },
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      use: ['babel-loader'],
      include: [path.join(__dirname, 'web/app'), path.join(__dirname, 'web/test')]
    }, {
      test: /\.css$/,
      use: [
        "style-loader",
        "css-loader",
      ]    
    },
    {
      test: /\.less$/,
      use: [
        "style-loader",
        "css-loader?-url",
        "less-loader"
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
  }
};
