// Minimal random-access reader for ZIP archives served over HTTP using
// range requests. Supports the subset of ZIP required by the 3TZ spec:
// - non-ZIP64 archives (< 4 GiB, < 65535 entries) via the standard EOCD
// - stored (method 0) and deflate (method 8) entries
// Zstd (method 93) is declared unsupported — callers get a clear error.

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;

// Maximum size of the EOCD + trailing ZIP comment. The comment length is a
// 16-bit field so 22 + 0xFFFF is an upper bound.
const EOCD_MAX_SIZE = 22 + 0xFFFF;

// Bytes we speculatively fetch past the LFH fixed header. This covers the
// name + extra fields in the LFH, which can differ from the CD entry. If a
// file's LFH extra field is larger than this buffer we fall back to a second
// range request.
const LFH_EXTRA_BUFFER = 1024;

export class ZipArchiveReader {

	constructor( url, fetchFn = fetch, fetchOptions = {} ) {

		this.url = url;
		this.fetchFn = fetchFn;
		this.fetchOptions = fetchOptions;
		this.entries = new Map();
		this._ready = null;

	}

	ready( options ) {

		if ( this._ready === null ) {

			this._ready = this._initialize( options );

		}

		return this._ready;

	}

	async _initialize( options ) {

		// Grab the tail of the file — enough to cover the maximum possible
		// EOCD region. We have to know the total file size first because some
		// HTTP servers do not correctly honour suffix ranges ("bytes=-N").
		const size = await this._fetchSize( options );
		if ( size === null ) {

			throw new Error( `ZipArchiveReader: Could not determine size of "${ this.url }".` );

		}

		const tailSize = Math.min( EOCD_MAX_SIZE, size );
		const tailStart = size - tailSize;
		const tail = await this._fetchRange( tailStart, size - 1, options );
		const view = new DataView( tail.buffer );

		// Scan backwards for the EOCD signature.
		let eocdOffset = - 1;
		for ( let i = view.byteLength - 22; i >= 0; i -- ) {

			if ( view.getUint32( i, true ) === EOCD_SIG ) {

				eocdOffset = i;
				break;

			}

		}

		if ( eocdOffset < 0 ) {

			throw new Error( `ZipArchiveReader: Could not find End of Central Directory in "${ this.url }".` );

		}

		const cdSize = view.getUint32( eocdOffset + 12, true );
		const cdOffset = view.getUint32( eocdOffset + 16, true );
		const totalEntries = view.getUint16( eocdOffset + 10, true );

		if ( cdOffset === 0xFFFFFFFF || cdSize === 0xFFFFFFFF || totalEntries === 0xFFFF ) {

			throw new Error( `ZipArchiveReader: ZIP64 archives are not supported ("${ this.url }").` );

		}

		// Pull the central directory, reusing bytes we already have when possible.
		let cdBuffer;
		if ( cdOffset >= tailStart ) {

			const sliceStart = cdOffset - tailStart;
			cdBuffer = tail.buffer.slice( sliceStart, sliceStart + cdSize );

		} else {

			const range = await this._fetchRange( cdOffset, cdOffset + cdSize - 1, options );
			cdBuffer = range.buffer;

		}

		this._parseCentralDirectory( cdBuffer, totalEntries );

	}

	_parseCentralDirectory( buffer, totalEntries ) {

		const view = new DataView( buffer );
		const decoder = new TextDecoder( 'utf-8' );
		let offset = 0;
		let count = 0;

		while ( offset + 46 <= buffer.byteLength ) {

			if ( view.getUint32( offset, true ) !== CD_SIG ) {

				break;

			}

			const flags = view.getUint16( offset + 8, true );
			const method = view.getUint16( offset + 10, true );
			const compSize = view.getUint32( offset + 20, true );
			const uncompSize = view.getUint32( offset + 24, true );
			const nameLen = view.getUint16( offset + 28, true );
			const extraLen = view.getUint16( offset + 30, true );
			const commentLen = view.getUint16( offset + 32, true );
			const localOffset = view.getUint32( offset + 42, true );

			if ( compSize === 0xFFFFFFFF || uncompSize === 0xFFFFFFFF || localOffset === 0xFFFFFFFF ) {

				throw new Error( `ZipArchiveReader: ZIP64 entries are not supported ("${ this.url }").` );

			}

			const nameBytes = new Uint8Array( buffer, offset + 46, nameLen );
			const name = decoder.decode( nameBytes );

			// Directory entries end with "/" and contain no data — skip them.
			if ( ! name.endsWith( '/' ) ) {

				this.entries.set( name, {
					name,
					method,
					compSize,
					uncompSize,
					nameLen,
					localOffset,
					flags,
				} );

			}

			offset += 46 + nameLen + extraLen + commentLen;
			count ++;

		}

		if ( count !== totalEntries ) {

			// Not fatal — some archives have a mismatched entry count field —
			// but worth surfacing during development.
			console.warn( `ZipArchiveReader: expected ${ totalEntries } entries, parsed ${ count }.` );

		}

	}

	async getFile( path, options ) {

		await this.ready( options );

		const entry = this.entries.get( path );
		if ( ! entry ) {

			throw new Error( `ZipArchiveReader: File "${ path }" not found in archive "${ this.url }".` );

		}

		// Speculatively pull the LFH together with the file data. The LFH's
		// name and extra fields come before the actual bytes; we overshoot the
		// size estimate a little so a single range request is usually enough.
		const headerEstimate = 30 + entry.nameLen + LFH_EXTRA_BUFFER;
		const start = entry.localOffset;
		const end = start + headerEstimate + entry.compSize - 1;
		const range = await this._fetchRange( start, end, options );
		const view = new DataView( range.buffer );

		if ( view.getUint32( 0, true ) !== LFH_SIG ) {

			throw new Error( `ZipArchiveReader: Local file header signature mismatch for "${ path }".` );

		}

		const lfhNameLen = view.getUint16( 26, true );
		const lfhExtraLen = view.getUint16( 28, true );
		const dataOffset = 30 + lfhNameLen + lfhExtraLen;

		let compressed;
		if ( dataOffset + entry.compSize <= range.buffer.byteLength ) {

			compressed = new Uint8Array( range.buffer, dataOffset, entry.compSize );

		} else {

			// The LFH extra field was larger than our speculative buffer — fall
			// back to a second fetch that starts at the true data offset.
			const dataStart = entry.localOffset + dataOffset;
			const dataEnd = dataStart + entry.compSize - 1;
			const dataRange = await this._fetchRange( dataStart, dataEnd, options );
			compressed = new Uint8Array( dataRange.buffer );

		}

		return await decompressEntry( compressed, entry, this.url );

	}

	async _fetchRange( start, end, options ) {

		const merged = { ...this.fetchOptions, ...( options || {} ) };
		const headers = new Headers( merged.headers || {} );
		headers.set( 'Range', `bytes=${ start }-${ end }` );

		const response = await this.fetchFn( this.url, {
			...merged,
			headers,
		} );

		if ( ! response.ok ) {

			throw new Error( `ZipArchiveReader: Range request failed for "${ this.url }" (status ${ response.status }).` );

		}

		const buffer = await response.arrayBuffer();
		return { buffer };

	}

	async _fetchSize( options ) {

		const merged = { ...this.fetchOptions, ...( options || {} ) };
		const headers = new Headers( merged.headers || {} );

		// A single-byte range is a cheap portable way to probe the total size,
		// which the server reports in Content-Range (e.g. "bytes 0-0/12345").
		// HEAD works too but is sometimes blocked by CDN auth middleware that
		// only allows GET.
		headers.set( 'Range', 'bytes=0-0' );

		const response = await this.fetchFn( this.url, {
			...merged,
			method: 'GET',
			headers,
		} );

		if ( ! response.ok ) {

			throw new Error( `ZipArchiveReader: Size probe failed for "${ this.url }" (status ${ response.status }).` );

		}

		// Drain the body so the connection can be reused.
		await response.arrayBuffer();

		const contentRange = response.headers.get( 'Content-Range' );
		if ( contentRange ) {

			const match = contentRange.match( /bytes\s+\d+-\d+\/(\d+)/i );
			if ( match ) return Number( match[ 1 ] );

		}

		const contentLength = response.headers.get( 'Content-Length' );
		if ( contentLength ) {

			// Server ignored the Range header — the body length equals the full size.
			return Number( contentLength );

		}

		return null;

	}

}

async function decompressEntry( compressed, entry, url ) {

	if ( entry.method === 0 ) {

		return compressed;

	}

	if ( entry.method === 8 ) {

		return await decompressWithStream( compressed, 'deflate-raw', entry, url );

	}

	if ( entry.method === 93 ) {

		return await decompressWithStream( compressed, 'zstd', entry, url );

	}

	throw new Error( `ZipArchiveReader: Unsupported compression method ${ entry.method } for "${ entry.name }" in "${ url }".` );

}

async function decompressWithStream( compressed, format, entry, url ) {

	if ( typeof DecompressionStream === 'undefined' ) {

		throw new Error( `ZipArchiveReader: DecompressionStream is unavailable — cannot decode "${ format }" entry "${ entry.name }" in "${ url }".` );

	}

	let decompressor;
	try {

		decompressor = new DecompressionStream( format );

	} catch ( err ) {

		throw new Error( `ZipArchiveReader: This runtime does not support DecompressionStream("${ format }") — cannot decode "${ entry.name }" in "${ url }". Upgrade to a newer browser or Node version that implements the format.`, { cause: err } );

	}

	const stream = new Blob( [ compressed ] ).stream().pipeThrough( decompressor );
	const buffer = await new Response( stream ).arrayBuffer();
	return new Uint8Array( buffer );

}
