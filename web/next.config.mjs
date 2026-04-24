/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false,
	typescript: {
		ignoreBuildErrors: false,
	},
	turbopack: {
		resolveAlias: {
			fs: { browser: './empty-module.js' },
			net: { browser: './empty-module.js' },
			tls: { browser: './empty-module.js' },
		},
	},
	webpack: (config) => {
		config.resolve.fallback = {
			...config.resolve.fallback,
			fs: false,
			net: false,
			tls: false,
		};
		return config;
	},
};

export default nextConfig;
