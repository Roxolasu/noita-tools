const path = require('path');
const util = require('util');
const fs = require('fs');

const { addBeforeLoader, loaderByName } = require('@craco/craco');
const getCacheIdentifier = require('react-dev-utils/getCacheIdentifier');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
	.BundleAnalyzerPlugin;

const setUpWorker = config => {
	// Legacy worker-loader code
	const isEnvProduction = config.mode === 'production';
	const isEnvDevelopment = !isEnvProduction;
	// get something that has setted appSrc and fill here
	const appSrc = config.module.rules[1].include;
	// https://github.com/webpack/webpack/issues/6642#issuecomment-371087342
	config.output.globalObject = 'this';
	// find the rule with 'oneOf'
	const loaderListRule = config.module.rules.find(ruleObj =>
		Array.isArray(ruleObj.oneOf)
	);
	if (!loaderListRule) {
		throw new Error('No found loader config list');
	}

	loaderListRule.oneOf.unshift({
		test: /\.worker\.(js|mjs|ts)$/,
		include: appSrc,
		use: [
			require.resolve('worker-loader'),
			{
				loader: require.resolve('babel-loader'),
				options: {
					customize: require.resolve(
						'babel-preset-react-app/webpack-overrides'
					),
					babelrc: false,
					configFile: false,
					// get preset setting from loader that matches normal js file and fill here
					presets: [require.resolve('babel-preset-react-app')],
					// Make sure we have a unique cache identifier, erring on the
					// side of caution.
					// We remove this when the user ejects because the default
					// is sane and uses Babel options. Instead of options, we use
					// the react-scripts and babel-preset-react-app versions.
					cacheIdentifier: getCacheIdentifier(
						isEnvProduction ? 'production' : isEnvDevelopment && 'development',
						[
							'babel-plugin-named-asset-import',
							'babel-preset-react-app',
							'react-dev-utils',
							'react-scripts'
						]
					),
					plugins: [...loaderListRule.oneOf[2].options.plugins],
					// This is a feature of `babel-loader` for webpack (not Babel itself).
					// It enables caching results in ./node_modules/.cache/babel-loader/
					// directory for faster rebuilds.
					cacheDirectory: true,
					cacheCompression: false,
					compact: isEnvProduction
				}
			}
		]
	});
};

module.exports = {
	webpack: {
		configure: config => {
			// setUpWorker(config);
			// https://stackoverflow.com/questions/65922329/babel-cant-resolve-imports-in-it-its-own-source-code
			config.module.rules.push({
				test: /\.m?js/,
				resolve: {
					fullySpecified: false
				}
			});

			return config;
		},
		plugins: [
			new BundleAnalyzerPlugin({
				analyzerMode: process.env.STATS || 'disabled'
			})
		],
		// stats: 'errors-only',
		asyncWebAssembly: true,
		syncWebAssembly: true
	}
	// style: {
	//   postcss: {
	//     plugins: [
	//       require("tailwindcss")("./tailwind.config.js"),
	//       require('autoprefixer'),
	//     ],
	//   },
	// },
};
