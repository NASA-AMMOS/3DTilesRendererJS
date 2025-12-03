import { defineConfig } from 'vitest/config';

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
		alias: {
			'3d-tiles-renderer/r3f': '/src/r3f/index.jsx',
			'3d-tiles-renderer/core': '/src/core/renderer/index.js',
			'3d-tiles-renderer/three': '/src/three/renderer/index.js',
			'3d-tiles-renderer/core/plugins': '/src/core/plugins/index.js',
			'3d-tiles-renderer/three/plugins': '/src/three/plugins/index.js',
			'3d-tiles-renderer/plugins': '/src/plugins.js',
			'3d-tiles-renderer': '/src/index.js',
		},
	},
} );
