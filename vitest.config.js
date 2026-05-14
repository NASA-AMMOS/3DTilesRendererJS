import { defineConfig } from 'vitest/config';
import { packageAliases } from './vite.config.js';

export default defineConfig( {
	test: {
		environment: 'node',
		globals: true,
		setupFiles: [ './vitest.setup.js' ],
		exclude: [
			'**/node_modules/**',
			'**/*.tsx',
		],
	},
	resolve: {
		alias: packageAliases,
	},
} );
