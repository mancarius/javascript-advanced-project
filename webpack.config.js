const webpack = require('webpack');
const path = require('path');
const {
    CleanWebpackPlugin
} = require('clean-webpack-plugin');
const dotenv = require('dotenv');
const fs = require('fs'); // to check if the file exists

const config = {
    mode: 'development',
    entry: './src/js/index.js',
    output: {
        path: path.resolve(__dirname, 'src', 'dist'),
        filename: '[name].bundle.js',
    },
    devtool: 'eval-source-map',
    plugins: [
        new CleanWebpackPlugin({
            cleanStaleWebpackAssets: false
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
            _: 'lodash'
        }),
    ],
    optimization: {
        runtimeChunk: 'single',
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                }
            }
        }
    },
    resolve: {
        extensions: ['.js', '.jsx', '.json'],
    },
    module: {
        rules: [],
    },
};


module.exports = (env) => {
    // Get the root path (assuming your webpack config is in the root of your project!)
    const currentPath = path.join(__dirname);

    // Create the fallback path (the production .env)
    const basePath = currentPath + '/.env';

    // We're concatenating the environment name to our filename to specify the correct env file!
    const envPath = basePath + '.' + env.ENVIRONMENT;

    // Check if the file exists, otherwise fall back to the production .env
    const finalPath = fs.existsSync(envPath) ? envPath : basePath;
    // call dotenv and it will return an Object with a parsed key 
    const fileEnv = dotenv.config({
        path: finalPath
    }).parsed;

    // reduce it to a nice object, the same as before
    const envKeys = Object.keys(fileEnv).reduce((prev, next) => {
        prev[`process.env.${next}`] = JSON.stringify(fileEnv[next]);
        return prev;
    }, {});

    config.plugins.push(new webpack.DefinePlugin(envKeys));

    return config;
}