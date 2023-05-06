const path = require("path");
const webpack = require("webpack");

module.exports = {
  devtool: "source-map",
  mode: "development",
  entry: {
    chat: "./public/js/chat.js",
    login: "./public/js/login.js",
  },
  output: {
    filename: "[name].bundle.js",
    path: path.join(__dirname, "public/js"),
    publicPath: "/js/",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.s[ac]ss$/i,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
    ],
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
};
