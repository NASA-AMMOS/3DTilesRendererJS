import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );
const rootDir = path.resolve( __dirname, '../..' );
const docsDir = path.join( rootDir, 'docs' );
const pagesDir = path.join( docsDir, 'pages' );

// Create pages directory if it doesn't exist
if ( ! fs.existsSync( pagesDir ) ) {

	fs.mkdirSync( pagesDir, { recursive: true } );
	console.log( 'Created docs/pages/ directory' );

}

// Move API HTML files to pages directory (exclude index.html)
const apiHtmlFiles = fs.readdirSync( docsDir ).filter( f =>
	f.endsWith( '.html' ) && f !== 'index.html'
);

for ( const file of apiHtmlFiles ) {

	const srcPath = path.join( docsDir, file );
	const destPath = path.join( pagesDir, file );
	fs.renameSync( srcPath, destPath );
	console.log( `Moved ${file} to pages/` );

}

// Update pages/*.html - fix relative paths for CSS/JS (add ../)
const pagesHtmlFiles = fs.readdirSync( pagesDir ).filter( f => f.endsWith( '.html' ) );

for ( const file of pagesHtmlFiles ) {

	const filePath = path.join( pagesDir, file );
	let html = fs.readFileSync( filePath, 'utf8' );

	// Update relative paths: styles/ -> ../styles/, scripts/ -> ../scripts/, fonts/ -> ../fonts/
	html = html.replace( /href="styles\//g, 'href="../styles/' );
	html = html.replace( /src="scripts\//g, 'src="../scripts/' );
	html = html.replace( /url\('\.\.\/fonts\//g, 'url(\'../../fonts/' );

	// Update links to other HTML files in pages/
	html = html.replace( /href="([^"]+\.html)"/g, ( match, filename ) => {

		if ( filename.startsWith( '../' ) || filename.startsWith( 'http' ) || filename.startsWith( 'pages/' ) ) {

			return match;

		}

		// Keep same directory links as-is (they're already in pages/)
		return match;

	} );

	// Update link to index.html (Home) - should go up one level
	html = html.replace( /href="index\.html"/g, 'href="../index.html"' );

	fs.writeFileSync( filePath, html );
	console.log( `Fixed paths in pages/${file}` );

}

// Update index.html links to point to pages/ directory
const indexPath = path.join( docsDir, 'index.html' );
if ( fs.existsSync( indexPath ) ) {

	let indexHtml = fs.readFileSync( indexPath, 'utf8' );
	// Update links: href="ClassName.html" -> href="pages/ClassName.html"
	indexHtml = indexHtml.replace( /href="([^"]+\.html)"/g, ( match, filename ) => {

		if ( filename === 'index.html' || filename.startsWith( 'pages/' ) || filename.startsWith( 'http' ) ) {

			return match;

		}

		return `href="pages/${filename}"`;

	} );
	fs.writeFileSync( indexPath, indexHtml );
	console.log( 'Updated index.html links to point to pages/' );

}

// Copy custom CSS to replace JSDoc's default
const customCssPath = path.join( __dirname, 'custom-styles.css' );
const targetCssPath = path.join( docsDir, 'styles', 'jsdoc-default.css' );

if ( fs.existsSync( customCssPath ) ) {

	fs.copyFileSync( customCssPath, targetCssPath );
	console.log( 'Copied custom CSS to docs/styles/jsdoc-default.css' );

}

const themeToggleScript = `
<button id="theme-toggle" title="Toggle dark mode">🌙</button>
<script>
(function() {
    const toggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateIcon(savedTheme);
    
    toggle.addEventListener('click', function() {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });
    
    function updateIcon(theme) {
        toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
})();
</script>
`;

// Find all HTML files recursively
function findHtmlFiles( dir ) {

	const files = [];
	const entries = fs.readdirSync( dir, { withFileTypes: true } );

	for ( const entry of entries ) {

		const fullPath = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {

			files.push( ...findHtmlFiles( fullPath ) );

		} else if ( entry.name.endsWith( '.html' ) ) {

			files.push( fullPath );

		}

	}

	return files;

}

// Inject theme toggle into all HTML files
const allHtmlFiles = findHtmlFiles( docsDir );
console.log( `Found ${allHtmlFiles.length} HTML files to process for theme toggle` );

for ( const htmlPath of allHtmlFiles ) {

	let html = fs.readFileSync( htmlPath, 'utf8' );

	// Skip if already processed
	if ( html.includes( 'theme-toggle' ) ) {

		console.log( `Skipping (already has theme toggle): ${path.relative( docsDir, htmlPath )}` );
		continue;

	}

	// Inject theme toggle before </body>
	html = html.replace( '</body>', themeToggleScript + '</body>' );

	fs.writeFileSync( htmlPath, html );
	console.log( `Injected theme toggle: ${path.relative( docsDir, htmlPath )}` );

}

console.log( '\nPost-processing complete!' );
