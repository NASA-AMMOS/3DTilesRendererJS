import { LoaderBase, WGS84_RADIUS } from '3d-tiles-renderer/core';
import { ProjectionScheme } from '../images/utils/ProjectionScheme';
import { MathUtils } from 'three';

const EQUATOR_CIRCUMFERENCE = WGS84_RADIUS * Math.PI * 2;
const mercatorProjection = /* @__PURE__ */ new ProjectionScheme( 'EPSG:3857' );

// helper CRS checks (same logic used in WMTSCapabilitiesLoader)
// TODO: Share these helpers with the WMTSCapabilitiesLoader
function isEPSG4326( crs ) {

	return /:4326$/i.test( crs );

}

function isWebMercator( crs ) {

	return /:3857$/i.test( crs );

}

// convert from meters (web mercator) to degrees using the mercator projection helper
function correctTupleUnits( tuple, crs ) {

	// TODO: consolidate this Mercator-units with WMTSLoader / move a helper onto ProjectionScheme?
	if ( isWebMercator( crs ) ) {

		tuple[ 0 ] = mercatorProjection.convertProjectionToLongitude( 0.5 + tuple[ 0 ] / ( Math.PI * 2 * EQUATOR_CIRCUMFERENCE ) );
		tuple[ 1 ] = mercatorProjection.convertProjectionToLatitude( 0.5 + tuple[ 1 ] / ( Math.PI * 2 * EQUATOR_CIRCUMFERENCE ) );

		// to degrees
		tuple[ 0 ] *= MathUtils.RAD2DEG;
		tuple[ 1 ] *= MathUtils.RAD2DEG;

	}

	return tuple;

}

// swap order when CRS is EPSG:4326 (WMS 1.3 axis order)
function correctTupleOrder( tuple, crs, version ) {

	// Before WMS 1.3.0 the latitude, longitude order for EPSG:4326 was declared to be in reverse and has
	// been fixed in later versions. Correct the tuple order for consistency if loading a file from a prior version.
	// See https://gis.stackexchange.com/questions/23347/getmap-wms-1-1-1-vs-1-3-0
	const [ major, minor ] = version.split( '.' ).map( v => parseInt( v ) );
	const shouldFixTupleOrder = major === 1 && minor < 3 || major < 1;
	if ( isEPSG4326( crs ) && shouldFixTupleOrder ) {

		[ tuple[ 0 ], tuple[ 1 ] ] = [ tuple[ 1 ], tuple[ 0 ] ];

	}

}

// convert degrees to radians in-place
function tupleToRadians( tuple ) {

	tuple[ 0 ] *= MathUtils.DEG2RAD;
	tuple[ 1 ] *= MathUtils.DEG2RAD;

}

// parse "BoundingBox" tag for WMS using same normalization as WMTS (lower/upper corners, unit & order correction)
function parseBoundingBox( el, version ) {

	if ( ! el ) {

		return null;

	}

	// WMS may use CRS / crs / SRS attribute
	const crs = el.getAttribute( 'CRS' ) || el.getAttribute( 'crs' ) || el.getAttribute( 'SRS' ) || '';

	const minx = parseFloat( el.getAttribute( 'minx' ) );
	const miny = parseFloat( el.getAttribute( 'miny' ) );
	const maxx = parseFloat( el.getAttribute( 'maxx' ) );
	const maxy = parseFloat( el.getAttribute( 'maxy' ) );

	const lowerCorner = [ minx, miny ];
	const upperCorner = [ maxx, maxy ];

	correctTupleOrder( lowerCorner, crs, version );
	correctTupleOrder( upperCorner, crs, version );

	// correct units if web mercator meters were provided
	correctTupleUnits( lowerCorner, crs );
	correctTupleUnits( upperCorner, crs );

	// convert degrees to radians for internal consistency with other loaders
	tupleToRadians( lowerCorner );
	tupleToRadians( upperCorner );

	// bounds in order [minLon, minLat, maxLon, maxLat] (in radians)
	return { crs, bounds: [ ...lowerCorner, ...upperCorner ] };

}

// EX_GeographicBoundingBox (>= 1.3.0) and LatLonBoundingBox (<= 1.1.1) define the bounds of content
function parseEXGeographicBoundingBox( el ) {

	const west = parseFloat( el.querySelector( 'westBoundLongitude' ).textContent );
	const east = parseFloat( el.querySelector( 'eastBoundLongitude' ).textContent );
	const south = parseFloat( el.querySelector( 'southBoundLatitude' ).textContent );
	const north = parseFloat( el.querySelector( 'northBoundLatitude' ).textContent );

	const lowerCorner = [ west, south ];
	const upperCorner = [ east, north ];

	tupleToRadians( lowerCorner );
	tupleToRadians( upperCorner );

	return [ ...lowerCorner, ...upperCorner ];

}

function parseLatLonBoundingBox( el ) {

	const west = parseFloat( el.getAttribute( 'minx' ).textContent );
	const east = parseFloat( el.getAttribute( 'maxx' ).textContent );
	const south = parseFloat( el.getAttribute( 'miny' ).textContent );
	const north = parseFloat( el.getAttribute( 'maxy' ).textContent );

	const lowerCorner = [ west, south ];
	const upperCorner = [ east, north ];

	tupleToRadians( lowerCorner );
	tupleToRadians( upperCorner );

	return [ ...lowerCorner, ...upperCorner ];

}

// Parse the "Style" tag along with the associated legend elements
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

// Parse a <Layer> element in addition to the child layers
function parseLayer( el, version, inheritedProperties = {} ) {

	// TODO:
	// - Dimension
	// - Attribution
	// - AuthorityURL
	// - MinScaleDenominator
	// - MaxScaleDenominator
	// - cascaded, noSubsets, fixedWidth, fixedHeight attributes

	let {
		styles = [],
		crs = [],
		contentBoundingBox = null,
		queryable = false,
		opaque = false,
	} = inheritedProperties;

	const name = el.querySelector( ':scope > Name' )?.textContent || null;
	const title = el.querySelector( ':scope > Title' )?.textContent || '';
	const abstract = el.querySelector( ':scope > Abstract' )?.textContent || '';
	const keywords = [ ...el.querySelectorAll( ':scope > Keyword' ) ].map( k => k.textContent );
	const boundingBoxEl = [ ...el.querySelectorAll( ':scope > BoundingBox' ) ];
	const boundingBoxes = boundingBoxEl.map( el => parseBoundingBox( el, version ) );

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

	// These bounding boxes define the range of data present in the data set in a cartographic range
	if ( el.querySelector( 'EX_GeographicBoundingBox' ) ) {

		contentBoundingBox = parseEXGeographicBoundingBox( el.querySelector( 'EX_GeographicBoundingBox' ) );

	} else if ( el.querySelector( 'LatLonBoundingBox' ) ) {

		contentBoundingBox = parseLatLonBoundingBox( el.querySelector( 'LatLonBoundingBox' ) );

	}

	// Recursively parse sublayers
	const subLayers = Array.from( el.querySelectorAll( ':scope > Layer' ) ).map( el => {

		return parseLayer( el, version, {
			// add
			styles,
			crs,

			// replace
			contentBoundingBox,
			queryable,
			opaque,
		} );

	} );

	return {
		name,
		title,
		abstract,
		queryable,
		opaque,
		keywords,
		crs,
		boundingBoxes,
		contentBoundingBox,
		styles,
		subLayers,
	};

}

// Parse the "Service" tag
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

	if ( ! el ) {

		return '';

	}

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

		const getEl = httpEl.querySelector( 'Get OnlineResource' ) || httpEl.querySelector( 'Get > OnlineResource' ) || httpEl.querySelector( 'Get' );
		const postEl = httpEl.querySelector( 'Post OnlineResource' ) || httpEl.querySelector( 'Post > OnlineResource' ) || httpEl.querySelector( 'Post' );
		const getHref = readOnlineResourceHref( getEl );
		const postHref = readOnlineResourceHref( postEl );
		return { type: 'HTTP', get: getHref, post: postHref };

	} );

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
		const rootEl = xml.querySelector( 'WMS_Capabilities' ) || xml.querySelector( 'WMT_MS_Capabilities' );
		const version = rootEl.getAttribute( 'version' );

		const capabilityEl = xml.querySelector( 'Capability' );
		const service = parseService( xml.querySelector( ':scope > Service' ) );
		const request = parseRequest( capabilityEl.querySelector( ':scope > Request' ) );
		const rootLayers = Array.from( capabilityEl.querySelectorAll( ':scope > Layer' ) ).map( el => parseLayer( el, version ) );
		const layers = collectLayers( rootLayers );

		return { version, service, layers, request };

	}

}
