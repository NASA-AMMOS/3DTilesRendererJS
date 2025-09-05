import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default ( { mode } ) => {

	process.env = { ...process.env, ...loadEnv( mode, process.cwd() ) };

	const entry = {
		'index': './src/index.js',
		'index.plugins': './src/plugins.js',
		'index.core': './src/core/renderer/index.js',
		'index.three': './src/three/renderer/index.js',
		'index.r3f': './src/r3f/index.jsx',
		'index.core-plugins': './src/core/plugins/index.js',
		'index.three-plugins': './src/three/plugins/index.js'
	};

	return {
		root: './',
		envDir: '.',
		base: '',
		build: {
			sourcemap: true,
			outDir: './build/',
			minify: true,
			rollupOptions: {
				external: ( p ) => {

					return ! /^[./\\]/.test( p ) && ! /^3d-tiles-renderer/.test( p );

				},
			},
			lib: {
				entry,
				formats: [ 'es' ],
			},
		},
		plugins: [ react() ],
	};

};
