const path = require("path");
const webpack = require("webpack");

module.exports = {
  devtool: "source-map",
  mode: "development",
  entry: {
    chat: "./public/ts/chat.ts",
    login: "./public/ts/login.ts",
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
        test: /\.m?js$/i,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.s[ac]ss$/i,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /public\/.*\.ts$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "public/tsconfig.json",
          },
        },
      },
    ],
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
};
