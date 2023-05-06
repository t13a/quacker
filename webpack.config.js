const path = require("path");
const webpack = require("webpack");

module.exports = {
  devtool: "source-map",
  mode: "development",
  entry: {
    chat: "./public/js/chat.js",
  },
  output: {
    filename: "[name].bundle.js",
    path: path.join(__dirname, "public/js"),
    publicPath: "/js/",
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
};
