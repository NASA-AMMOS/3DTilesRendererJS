import { LoaderBase } from '3d-tiles-renderer/core';

function parseBoundingBox( el ) {

	if ( ! el ) return null;
	const crs = el.getAttribute( 'CRS' ) || el.getAttribute( 'crs' );
	const minx = parseFloat( el.getAttribute( 'minx' ) || '0' );
	const miny = parseFloat( el.getAttribute( 'miny' ) || '0' );
	const maxx = parseFloat( el.getAttribute( 'maxx' ) || '0' );
	const maxy = parseFloat( el.getAttribute( 'maxy' ) || '0' );
	return { crs, bounds: [ minx, miny, maxx, maxy ] };

}

function parseEXGeographicBoundingBox( el ) {

	if ( ! el ) return null;
	const west = parseFloat(
		el.querySelector( 'westBoundLongitude' )?.textContent || '0',
	);
	const east = parseFloat(
		el.querySelector( 'eastBoundLongitude' )?.textContent || '0',
	);
	const south = parseFloat(
		el.querySelector( 'southBoundLatitude' )?.textContent || '0',
	);
	const north = parseFloat(
		el.querySelector( 'northBoundLatitude' )?.textContent || '0',
	);
	return { bounds: [ west, south, east, north ] };

}

function parseStyle( el ) {

	return {
		name: el.querySelector( 'Name' )?.textContent || '',
		title: el.querySelector( 'Title' )?.textContent || '',
		legendUrl:
			el
				.querySelector( 'LegendURL OnlineResource' )
				?.getAttribute( 'xlink:href' ) || '',
	};

}


function parseLayer( el ) {

	const name = el.querySelector( 'Name' )?.textContent || '';
	const title = el.querySelector( 'Title' )?.textContent || '';
	const abstract = el.querySelector( 'Abstract' )?.textContent || '';
	const queryable = el.getAttribute( 'queryable' ) === '1';
	const opaque = el.getAttribute( 'opaque' ) === '1';
	const keywords = Array.from( el.querySelectorAll( 'Keyword' ) ).map(
		( k ) => k.textContent || '',
	);
	const crs = Array.from( el.querySelectorAll( 'CRS' ) ).map(
		( c ) => c.textContent || '',
	);
	const bboxEls = Array.from( el.querySelectorAll( 'BoundingBox' ) );
	const boundingBoxes = bboxEls.map( parseBoundingBox );
	const exGeoBBox = parseEXGeographicBoundingBox(
		el.querySelector( 'EX_GeographicBoundingBox' ),
	);
	const styles = Array.from( el.querySelectorAll( 'Style' ) ).map( parseStyle );

	// Recursively parse sublayers
	const subLayers = Array.from( el.querySelectorAll( 'Layer' ) ).map( parseLayer );

	return {
		name,
		title,
		abstract,
		queryable,
		opaque,
		keywords,
		crs,
		boundingBoxes,
		exGeographicBoundingBox: exGeoBBox,
		styles,
		subLayers,
	};

}

function parseService( el ) {

	if ( ! el ) return {};
	return {
		name: el.querySelector( 'Name' )?.textContent || '',
		title: el.querySelector( 'Title' )?.textContent || '',
		abstract: el.querySelector( 'Abstract' )?.textContent || '',
		keywords: Array.from( el.querySelectorAll( 'Keyword' ) ).map(
			( k ) => k.textContent || '',
		),
	};

}

export class WMSCapabilitiesLoader extends LoaderBase {

	constructor( fetchOptions = {} ) {

		super();
		this.fetchOptions = fetchOptions;

	}

	parse( buffer ) {

		return new Promise( ( resolve ) => {

			const str = new TextDecoder( 'utf-8' ).decode( new Uint8Array( buffer ) );
			const xml = new DOMParser().parseFromString( str, 'text/xml' );
			const service = parseService( xml.querySelector( 'Service' ) );
			const capability = xml.querySelector( 'Capability' );
			const layers = capability
				? Array.from( capability.querySelectorAll( 'Layer' ) ).map( parseLayer )
				: [];
			resolve( { service, layers } );

		} );

	}

	async load( url ) {

		const response = await fetch( url, this.fetchOptions );
		if ( ! response.ok ) throw new Error( 'Failed to fetch WMS Capabilities' );
		const buffer = await response.arrayBuffer();
		return this.parse( buffer );

	}

}
