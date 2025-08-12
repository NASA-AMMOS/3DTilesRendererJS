import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// helper to copy .d.ts declaration files to build/types folder
function copyTypesDeclarationFiles( srcDir, destDir ) {

	const entries = fs.readdirSync( srcDir, { withFileTypes: true } );
	for ( const entry of entries ) {

		const srcPath = path.join( srcDir, entry.name );
		const destPath = path.join( destDir, entry.name );
		if ( entry.isDirectory() ) {

			copyTypesDeclarationFiles( srcPath, destPath );

		} else if ( entry.name.endsWith( '.d.ts' ) ) {

			fs.mkdirSync( path.dirname( destPath ), { recursive: true } );
			fs.copyFileSync( srcPath, destPath );

		}

	}

}

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

					return ! /^[./\\]/.test( p );

				},
			},
			lib: {
				entry,
				formats: [ 'es' ],
			},
		},
		plugins: [
			react(),
			{
				name: 'copy-dts-files',
				closeBundle() {

					copyTypesDeclarationFiles( path.resolve( './src' ), path.resolve( './build/types' ) );

				}
			}
		],
	};

};
