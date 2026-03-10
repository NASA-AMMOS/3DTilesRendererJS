import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TurndownService from 'turndown';

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );
const rootDir = path.resolve( __dirname, '../..' );
const docsDir = path.join( rootDir, 'docs' );

// Setup Turndown for HTML to Markdown conversion
const turndown = new TurndownService( {
	headingStyle: 'atx',
	codeBlockStyle: 'fenced'
} );

// Code blocks - assume JavaScript
turndown.addRule( 'codeBlocks', {
	filter: [ 'pre' ],
	replacement: function ( content ) {

		return '\n```js\n' + content.trim() + '\n```\n';

	}
} );

// Simplify member/method headings
turndown.addRule( 'memberHeadings', {
	filter: function ( node ) {

		return node.tagName === 'H3' || node.tagName === 'H4';

	},
	replacement: function ( content, node ) {

		const level = node.tagName === 'H3' ? '###' : '####';
		let text = node.textContent.trim();
		text = text.replace( /\s+/g, ' ' );
		return '\n' + level + ' ' + text + '\n';

	}
} );

// Check if docs directory exists
if ( ! fs.existsSync( docsDir ) ) {

	console.log( 'docs directory does not exist, please run jsdoc first' );
	process.exit( 1 );

}

const pagesDir = path.join( docsDir, 'pages' );

// Find all HTML files in pages directory
function findHtmlFiles( dir ) {

	if ( ! fs.existsSync( dir ) ) {

		return [];

	}

	const files = [];
	const entries = fs.readdirSync( dir, { withFileTypes: true } );

	for ( const entry of entries ) {

		const fullPath = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {

			files.push( ...findHtmlFiles( fullPath ) );

		} else if ( entry.name.endsWith( '.html' ) && entry.name !== 'index.html' ) {

			files.push( fullPath );

		}

	}

	return files;

}

const htmlFiles = findHtmlFiles( pagesDir );
console.log( `Found ${htmlFiles.length} HTML files to convert` );

const mdFiles = [];

for ( const htmlPath of htmlFiles ) {

	const html = fs.readFileSync( htmlPath, 'utf8' );

	// Extract just the body content
	const bodyMatch = html.match( /<body[^>]*>([\s\S]*)<\/body>/i );
	if ( ! bodyMatch ) {

		console.log( `Skipping ${htmlPath}: no body found` );
		continue;

	}

	// Remove script and style tags
	let bodyHtml = bodyMatch[ 1 ];
	bodyHtml = bodyHtml.replace( /<script[\s\S]*?<\/script>/gi, '' );
	bodyHtml = bodyHtml.replace( /<style[\s\S]*?<\/style>/gi, '' );
	bodyHtml = bodyHtml.replace( /<nav[\s\S]*?<\/nav>/gi, '' );
	bodyHtml = bodyHtml.replace( /<footer[\s\S]*?<\/footer>/gi, '' );

	const markdown = turndown.turndown( bodyHtml );

	// Write .md file alongside HTML
	const mdPath = htmlPath + '.md';
	fs.writeFileSync( mdPath, markdown );

	const relativePath = path.relative( docsDir, mdPath );
	mdFiles.push( relativePath );
	console.log( `Generated: ${relativePath}` );

}

// Generate llms.txt index
const llmsContent = `# 3DTilesRendererJS Documentation

> A JavaScript library for rendering 3D Tiles.

## API Documentation

${mdFiles.map( f => `- [${path.basename( f, '.html.md' )}](pages/${f})` ).join( '\n' )}
`;

fs.writeFileSync( path.join( docsDir, 'llms.txt' ), llmsContent );
console.log( '\nGenerated llms.txt' );
console.log( `Total: ${mdFiles.length} markdown files generated` );
