const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './src/main.js',
  target: 'web',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Math Quiz',
      template: "./static/MathQuiz.html"
    }),
    new CleanWebpackPlugin(),
    new Dotenv({
      systemvars: true,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          // options: {
          //   presets: ['@babel/preset-env']
          // }
        },
        exclude: /node_modules/
      },
      {
        test: /\.(png|svg|jpg|gif|obj)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
            },
          },
        ],
      },
      {
        test: /\.html$/,
        loader: 'html-loader'
      },
      // {
      //   test: /\.css$/,
      //   use: [
      //     'style-loader',
      //     'css-loader',
      //   ],
      // },
    ],
  },
  // resolve: {
  //   extensions: [ '.js' ],
  // },
  output: {
    globalObject: 'this',
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};