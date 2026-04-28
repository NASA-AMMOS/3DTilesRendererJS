import { ZipArchiveReader } from './loaders/ZipArchiveReader.js';

// Matches a URL that points to a file path inside a .3tz archive, e.g.
// "https://example.com/foo.3tz/content/0/0.glb". Group 1 is the archive URL
// (including the ".3tz" extension), group 2 is the path inside the archive.
const ARCHIVE_PATH_RE = /^(.+?\.3tz)\/([^?#]+)(\?[^#]*)?(#.*)?$/i;

// Matches a URL whose pathname ends in ".3tz" (possibly with a query or hash).
const ARCHIVE_ROOT_RE = /^(.+?\.3tz)(\?[^#]*)?(#.*)?$/i;

/**
 * Plugin that teaches the renderer how to load 3D Tiles packaged as a single
 * ".3tz" archive. The plugin intercepts fetches for URLs that point at a
 * ".3tz" file (or any path inside one) and serves the bytes from the archive
 * via HTTP range requests, so callers do not need to unpack the archive
 * server-side.
 *
 * The 3tz spec is a ZIP archive with a root-level "tileset.json"; see
 * https://github.com/erikdahlstrom/3tz-specification.
 */
export class TZ3Plugin {

	constructor( options = {} ) {

		this.name = 'TZ3_PLUGIN';
		this.priority = - 100;
		this.tiles = null;
		this.fetchOptions = options.fetchOptions || null;
		this._archives = new Map();

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	preprocessURL( url, tile ) {

		// Only rewrite the root tileset URL — inner references already carry
		// a path inside the archive because base-path derivation uses the
		// rewritten URL as a prefix.
		if ( tile !== null ) return url;

		const str = String( url );
		const match = str.match( ARCHIVE_ROOT_RE );
		if ( ! match ) return url;

		// If the URL already points into the archive, leave it alone.
		if ( ARCHIVE_PATH_RE.test( str ) ) return url;

		const [ , archive, query = '', hash = '' ] = match;
		return `${ archive }/tileset.json${ query }${ hash }`;

	}

	fetchData( url, options ) {

		const str = String( url );
		const match = str.match( ARCHIVE_PATH_RE );
		if ( ! match ) return null;

		const [ , archiveUrl, relativePath ] = match;
		return this._fetchFromArchive( archiveUrl, relativePath, options );

	}

	async _fetchFromArchive( archiveUrl, relativePath, options ) {

		let reader = this._archives.get( archiveUrl );
		if ( ! reader ) {

			const fetchFn = ( url, init ) => fetch( url, init );
			reader = new ZipArchiveReader( archiveUrl, fetchFn, this.fetchOptions || {} );
			this._archives.set( archiveUrl, reader );

		}

		const bytes = await reader.getFile( relativePath, options );

		// Hand back a real Response so the caller can treat this path the same
		// as a plain HTTP fetch (json(), arrayBuffer(), etc.).
		return new Response( bytes, {
			status: 200,
			headers: { 'Content-Length': String( bytes.byteLength ) },
		} );

	}

	dispose() {

		this._archives.clear();

	}

}
