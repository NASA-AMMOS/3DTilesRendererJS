import { searchForWorkspaceRoot, loadEnv } from 'vite';
import fs from 'fs';
import react from '@vitejs/plugin-react';

export default ( { mode } ) => {

	process.env = { ...process.env, ...loadEnv( mode, process.cwd() ) };

	return {

		root: './example/',
		envDir: '.',
		base: '',
		build: {
			sourcemap: true,
			outDir: './bundle/',
			rollupOptions: {
				input: [
					...fs.readdirSync( './example/' ),
					...fs.readdirSync( './example/r3f/' ).map( name => 'r3f/' + name ),
				]
					.filter( p => /\.html$/.test( p ) )
					.map( p => `./example/${ p }` ),
			},
		},
		server: {
			fs: {
				allow: [
					// search up for workspace root
					searchForWorkspaceRoot( process.cwd() ),
				],
			},
		},
		plugins: [ react() ],
	};

};
