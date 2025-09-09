import { LoaderBase } from '3d-tiles-renderer/core';
import { ProjectionScheme } from '../images/utils/ProjectionScheme';
import { MathUtils } from 'three';

const mercatorProjection = /* @__PURE__ */ new ProjectionScheme( 'EPSG:3857' );

// helper CRS checks (same logic used in WMTSCapabilitiesLoader)
function isCRS84( crs ) {

	return /(:84|:crs84)$/i.test( crs );

}

function isEPSG4326( crs ) {

	return /:4326$/i.test( crs );

}

function isWebMercator( crs ) {

	return /:3857$/i.test( crs );

}

// convert from meters (web mercator) to degrees using the mercator projection helper
function correctTupleUnits( tuple, crs ) {

	if ( isWebMercator( crs ) ) {

		tuple[ 0 ] = mercatorProjection.convertProjectionToLongitude( 0.5 + tuple[ 0 ] / ( Math.PI * 2 * mercatorProjection.ellipsoidRadius ) );
		tuple[ 1 ] = mercatorProjection.convertProjectionToLatitude( 0.5 + tuple[ 1 ] / ( Math.PI * 2 * mercatorProjection.ellipsoidRadius ) );

		// to degrees
		tuple[ 0 ] *= MathUtils.RAD2DEG;
		tuple[ 1 ] *= MathUtils.RAD2DEG;

	}

	return tuple;

}

// swap order when CRS is EPSG:4326 (WMS 1.3 axis order)
function correctTupleOrder( tuple, crs ) {

	if ( isEPSG4326( crs ) ) {

		[ tuple[ 0 ], tuple[ 1 ] ] = [ tuple[ 1 ], tuple[ 0 ] ];

	}

}

// convert degrees to radians in-place
function tupleToRadians( tuple ) {

	tuple[ 0 ] *= MathUtils.DEG2RAD;
	tuple[ 1 ] *= MathUtils.DEG2RAD;

}

// parse <BoundingBox> for WMS using same normalization as WMTS (lower/upper corners, unit & order correction)
function parseBoundingBox( el ) {

	if ( ! el ) return null;

	// WMS may use CRS / crs / SRS attribute
	let crs = el.getAttribute( 'CRS' ) || el.getAttribute( 'crs' ) || el.getAttribute( 'SRS' ) || '';

	const minx = parseFloat( el.getAttribute( 'minx' ) || '0' );
	const miny = parseFloat( el.getAttribute( 'miny' ) || '0' );
	const maxx = parseFloat( el.getAttribute( 'maxx' ) || '0' );
	const maxy = parseFloat( el.getAttribute( 'maxy' ) || '0' );

	const lowerCorner = [ minx, miny ];
	const upperCorner = [ maxx, maxy ];

	// handle axis order differences (EPSG:4326 in WMS 1.3 uses lat,lon)
	correctTupleOrder( lowerCorner, crs );
	correctTupleOrder( upperCorner, crs );

	// correct units if web mercator meters were provided
	correctTupleUnits( lowerCorner, crs );
	correctTupleUnits( upperCorner, crs );

	// convert degrees to radians for internal consistency with other loaders
	tupleToRadians( lowerCorner );
	tupleToRadians( upperCorner );

	// normalize common CRS names
	if ( isCRS84( crs ) ) {

		crs = 'EPSG:4326';

	} else if ( isWebMercator( crs ) ) {

		crs = 'EPSG:3857';

	}

	// bounds in order [minLon, minLat, maxLon, maxLat] (in radians)
	return {
		crs,
		lowerCorner,
		upperCorner,
		bounds: [ ...lowerCorner, ...upperCorner ],
	};

}

function parseEXGeographicBoundingBox( el ) {

	const west = parseFloat( el.querySelector( 'westBoundLongitude' ).textContent );
	const east = parseFloat( el.querySelector( 'eastBoundLongitude' ).textContent );
	const south = parseFloat( el.querySelector( 'southBoundLatitude' ).textContent );
	const north = parseFloat( el.querySelector( 'northBoundLatitude' ).textContent );
	return { bounds: [ west, south, east, north ] };

}

function parseStyle( el ) {

	const name = el.querySelector( 'Name' ).textContent;
	const title = el.querySelector( 'Title' ).textContent;
	const legends = [ ...el.querySelectorAll( 'LegendURL' ) ].map( legendEl => {

		// width/height attrs on LegendURL
		const width = parseInt( legendEl.getAttribute( 'width' ) );
		const height = parseInt( legendEl.getAttribute( 'height' ) );

		// collect Format elements inside LegendURL
		const format = legendEl.querySelector( 'Format' ).textContent;

		// OnlineResource may use xlink namespace
		const online = legendEl.querySelector( 'OnlineResource' );
		const url = readOnlineResourceHref( online );

		return {
			width,
			height,
			format,
			url,
		};

	} );

	return {
		name,
		title,
		legends,
	};

}

function parseLayer( el, inheritedProperties = {} ) {

	let {
		styles = [],
		crs = [],
		exGeographicBoundingBox = null,
		queryable = false,
		opaque = false,
	} = inheritedProperties;

	const name = el.querySelector( ':scope > Name' )?.textContent || null;
	const title = el.querySelector( ':scope > Title' )?.textContent || '';
	const abstract = el.querySelector( ':scope > Abstract' )?.textContent || '';
	const keywords = Array.from( el.querySelectorAll( ':scope > Keyword' ) ).map( k => k.textContent );
	const bboxEls = Array.from( el.querySelectorAll( ':scope > BoundingBox' ) );
	const boundingBoxes = bboxEls.map( parseBoundingBox );

	// See section 7.2.4.8 in the specification
	// Handle added inherited properties
	crs = [
		...crs,
		...Array.from( el.querySelectorAll( 'CRS' ) ).map( c => c.textContent ),
	];
	styles = [
		...styles,
		...Array.from( el.querySelectorAll( ':scope > Style' ) ).map( el => parseStyle( el ) ),
	];

	// Handle replaced inherited properties
	if ( el.hasAttribute( 'queryable' ) ) {

		queryable = el.getAttribute( 'queryable' ) === '1';

	}

	if ( el.hasAttribute( 'opaque' ) ) {

		opaque = el.getAttribute( 'opaque' ) === '1';

	}

	if ( el.querySelector( 'EX_GeographicBoundingBox' ) ) {

		exGeographicBoundingBox = parseEXGeographicBoundingBox( el.querySelector( 'EX_GeographicBoundingBox' ) );

	}

	// Recursively parse sublayers
	const subLayers = Array.from( el.querySelectorAll( ':scope > Layer' ) ).map( el => {

		return parseLayer( el, {
			// add
			styles,
			crs,

			// replace
			exGeographicBoundingBox,
			queryable,
			opaque,
		} );

	} );

	// TODO:
	// - Dimension
	// - Attribution
	// - AuthorityURL
	// - MinScaleDenominator
	// - MaxScaleDenominator
	// - cascaded, noSubsets, fixedWidth, fixedHeight attributes

	return {
		name,
		title,
		abstract,
		queryable,
		opaque,
		keywords,
		crs,
		boundingBoxes,
		exGeographicBoundingBox,
		styles,
		subLayers,
	};

}

function parseService( el ) {

	return {
		name: el.querySelector( 'Name' )?.textContent || '',
		title: el.querySelector( 'Title' )?.textContent || '',
		abstract: el.querySelector( 'Abstract' )?.textContent || '',
		keywords: Array.from( el.querySelectorAll( 'Keyword' ) ).map( k => k.textContent ),

		maxWidth: parseFloat( el.querySelector( 'MaxWidth' ) ) || null,
		maxHeight: parseFloat( el.querySelector( 'MaxHeight' ) ) || null,
		layerLimit: parseFloat( el.querySelector( 'LayerLimit' ) ) || null,
	};

}

// helper: read OnlineResource href (handles xlink namespace)
function readOnlineResourceHref( el ) {

	if ( ! el ) return '';
	return (
		el.getAttribute( 'xlink:href' ) ||
		el.getAttributeNS( 'http://www.w3.org/1999/xlink', 'href' ) ||
		''
	).trim();

}

// parse a single operation (e.g. GetMap, GetCapabilities, GetFeatureInfo)
function parseRequestOperation( opEl ) {

	const formats = Array.from( opEl.querySelectorAll( 'Format' ) ).map( f => f.textContent.trim() );
	const dcp = Array.from( opEl.querySelectorAll( 'DCPType' ) ).map( dcp => {

		const httpEl = dcp.querySelector( 'HTTP' );
		if ( ! httpEl ) {

			return { type: 'UNKNOWN', get: '', post: '' };

		}

		const getEl = httpEl.querySelector( 'Get OnlineResource' ) || httpEl.querySelector( 'Get > OnlineResource' ) || httpEl.querySelector( 'Get' );
		const postEl = httpEl.querySelector( 'Post OnlineResource' ) || httpEl.querySelector( 'Post > OnlineResource' ) || httpEl.querySelector( 'Post' );
		const getHref = readOnlineResourceHref( getEl );
		const postHref = readOnlineResourceHref( postEl );
		return { type: 'HTTP', get: getHref, post: postHref };

	} );

	// fallback: sometimes OnlineResource appears directly under the operation
	if ( dcp.length === 0 ) {

		const online = opEl.querySelector( ':scope > OnlineResource' );
		if ( online ) {

			dcp.push( { type: 'HTTP', get: readOnlineResourceHref( online ), post: '' } );

		}

	}

	return { formats, dcp, href: dcp[ 0 ].get };

}

// parse the whole Request section, returning an object keyed by operation local name
function parseRequest( el ) {

	const ops = {};
	Array
		.from( el.querySelectorAll( ':scope > *' ) )
		.forEach( ( child ) => {

			const requestType = child.localName;
			ops[ requestType ] = parseRequestOperation( child );

		} );
	return ops;

}

// Collect all sub layers with a valid name into a flat array for easier access
function collectLayers( layers, target = [] ) {

	layers.forEach( l => {

		if ( l.name !== null ) {

			target.push( l );

		}

		collectLayers( l.subLayers, target );

	} );

	return target;

}

export class WMSCapabilitiesLoader extends LoaderBase {

	parse( buffer ) {

		const str = new TextDecoder( 'utf-8' ).decode( new Uint8Array( buffer ) );
		const xml = new DOMParser().parseFromString( str, 'text/xml' );
		const capabilityEl = xml.querySelector( 'Capability' );
		const service = parseService( xml.querySelector( ':scope > Service' ) );
		const request = parseRequest( capabilityEl.querySelector( ':scope > Request' ) );
		const rootLayers = Array.from( capabilityEl.querySelectorAll( ':scope > Layer' ) ).map( parseLayer );
		const layers = collectLayers( rootLayers );
		const layerMap = {};
		layers.forEach( l => layerMap[ l.name ] = l );

		return { service, layers, layerMap, request };

	}

}
