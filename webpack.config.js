const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: {
    getServerDispatchMidddleware: path.resolve(__dirname, './lib/client/getServerDispatchMidddleware.js')
  },
  output: {
    path: path.resolve(__dirname, './client'),
    filename: '[name].js'
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
