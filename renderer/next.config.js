module.exports = {
	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.target = 'electron-renderer';
		}

		global.__dirname = __dirname;

		return config;
	}
};
