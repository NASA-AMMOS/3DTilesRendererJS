import { loadEnv } from 'vite';
import fs from 'fs';
import react from '@vitejs/plugin-react';

export default ( { mode } ) => {

	process.env = { ...process.env, ...loadEnv( mode, process.cwd() ) };

	const pkg = JSON.parse( fs.readFileSync( './package.json', 'utf8' ) );
	const exports = pkg.exports;
	const paths = Object
		.entries( exports )
		.filter( en => /\.jsx?$/.test( en[ 1 ] ) )
		.map( en => {

			let name = en[ 0 ].replace( /^\.\/?/, '' ).replace( /\//g, '-' );
			if ( name === '' ) {

				name = 'index';

			} else {

				name = 'index.' + name;

			}

			return [ name, en[ 1 ] ];

		} );

	const entry = {};
	paths.forEach( ( [ key, value ] ) => ( entry[ key ] = value ) );

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
		plugins: [ react() ],
	};

};
