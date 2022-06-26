var webpack = require("webpack"),
    path = require("path"),
    fileSystem = require("fs"),
    env = require("./utils/env"),
    Dotenv = require('dotenv-webpack'),
    CleanWebpackPlugin = require("clean-webpack-plugin").CleanWebpackPlugin,
    CopyWebpackPlugin = require("copy-webpack-plugin"),
    HtmlWebpackPlugin = require("html-webpack-plugin"),
    TerserPlugin = require('terser-webpack-plugin');

require('dotenv').config({ path: env.BUILD_ENV === 'production' ? '.env' : `.env.${env.BUILD_ENV}` });

const ASSET_PATH = process.env.ASSET_PATH || '/';
const BUILD_FOLDER = env.BUILD_ENV === 'production' ? 'build' : `build-${env.BUILD_ENV}`;

var alias = {};

var secretsPath = path.join(__dirname, ("secrets." + env.NODE_ENV + ".js"));

var fileExtensions = ["jpg", "jpeg", "png", "gif", "eot", "otf", "svg", "ttf", "woff", "woff2"];

if (fileSystem.existsSync(secretsPath)) {
  alias["secrets"] = secretsPath;
}

var options = {
  mode: process.env.NODE_ENV || "development",
  entry: {
    popup: path.join(__dirname, "src", "js", "popup.js"),
    options: path.join(__dirname, "src", "js", "options.js"),
    background: path.join(__dirname, "src", "js", "background.js"),
    reminder: path.join(__dirname, "src", "js", "reminder.js"),
    /* contentScript: path.join(__dirname, "src", "js", "content_scripts", "contentScript.js"), */
  },
  chromeExtensionBoilerplate: {
    /* notHotReload: ["contentScript"], */
  },
  output: {
    path: path.resolve(__dirname, BUILD_FOLDER),
    filename: '[name].bundle.js',
    publicPath: ASSET_PATH,
  },
  module: {
    rules: [
      {
        // look for .css or .scss files
        test: /\.(css|scss)$/,
        // in the `src` directory
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: new RegExp('.(' + fileExtensions.join('|') + ')$'),
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
        },
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: 'source-map-loader',
          },
          {
            loader: 'babel-loader',
          },
        ],
        exclude: /node_modules/,
      }
    ]
  },
  resolve: {
    alias: alias,
    extensions: fileExtensions
      .map((extension) => '.' + extension)
      .concat(['.js', '.css']),
  },
  plugins: [
    new webpack.ProgressPlugin(),
    // clean the build folder
    new CleanWebpackPlugin({
      verbose: true,
      cleanStaleWebpackAssets: true,
    }),
    new Dotenv({
      path: env.BUILD_ENV === 'production' ? '.env' : `.env.${env.BUILD_ENV}`,
      safe: true, // load '.env.example' to verify the '.env' variables are all set. Can also be a string to a different file.
      allowEmptyValues: false, // allow empty variables (e.g. `FOO=`) (treat it as empty string, rather than missing)
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/img/icon-128.png',
          to: path.join(__dirname, BUILD_FOLDER),
        },
        /* {
          from: 'src/css/content_scripts/contentScript.css',
          to: path.join(__dirname, BUILD_FOLDER),
        }, */
        {
          from: 'src/manifest.json',
          to: path.join(__dirname, BUILD_FOLDER),
          force: true,
          transform: function (content, path) {
            const manifest = JSON.parse(content.toString());
            // generates the manifest file using the package.json informations

            manifest.description = process.env.npm_package_description;
            manifest.version = process.env.npm_package_version;

            if (env.BUILD_ENV !== 'production') manifest.name = `${manifest.name} - ${env.BUILD_ENV}`;

            return Buffer.from( JSON.stringify(manifest) );
          },
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "popup.html"),
      filename: "popup.html",
      chunks: ["popup"],
      cache: false,
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "options.html"),
      filename: "options.html",
      chunks: ["options"],
      cache: false,
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "reminder.html"),
      filename: "reminder.html",
      chunks: ["reminder"],
      cache: false,
    }),
  ],
  infrastructureLogging: {
    level: 'info',
  },
};

if (env.NODE_ENV === "development") {
  options.devtool = false;
} else {
  options.optimization = {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          compress: {
            // drop_console: true, // would remove ALL console outputs, so use pure_funcs instead
            // https://github.com/terser/terser#compress-options
            pure_funcs: [ 'console.log', 'console.debug', 'console.warn' ],
          }
        },
      }),
    ],
  };
}

module.exports = options;
