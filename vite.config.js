import { searchForWorkspaceRoot } from 'vite';
import fs from 'fs';
import react from '@vitejs/plugin-react';

export default {

	root: './example/',
	base: '',
	build: {
		minify: false,
		outDir: './bundle/',
		rollupOptions: {
			input: fs
				.readdirSync( './example/' )
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
	plugins: [
		react( {
			jsxRuntime: 'automatic',
		} )
	]

};
