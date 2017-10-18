const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: {
    getServerDispatchMiddleware: path.join(__dirname, './lib/client/getServerDispatchMiddleware.js'),
    Redbone: path.join(__dirname, './lib/client/Redbone.js'),
  },
  output: {
    path: path.join(__dirname, './client'),
    filename: '[name].js',
    library: 'redbone/client/getServerDispatchMiddleware',
    libraryTarget: 'commonjs-module'
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        drop_console: true
      }
    })
  ],
  module: {
    rules: [
      {
        use: 'babel-loader',
        test: /\.js$/
      }
    ]
  }
}
