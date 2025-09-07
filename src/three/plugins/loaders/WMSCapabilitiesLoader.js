import { LoaderBase } from '3d-tiles-renderer/core';
import { ProjectionScheme } from '../images/utils/ProjectionScheme';
import { MathUtils } from 'three';

const mercatorProjection = /* @__PURE__ */ new ProjectionScheme( 'EPSG:3857' );

// helper CR S checks (same logic used in WMTSCapabilitiesLoader)
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

    const name = el.querySelector( 'Name' )?.textContent || '';
    const title = el.querySelector( 'Title' )?.textContent || '';

    const legendEl = el.querySelector( 'LegendURL' );

    let legendUrl = '';
    let legendFormats = [];
    let legendWidth = null;
    let legendHeight = null;

    if ( legendEl ) {

        // width/height attrs on LegendURL
        const w = legendEl.getAttribute( 'width' );
        const h = legendEl.getAttribute( 'height' );
        legendWidth = w !== null ? parseInt( w, 10 ) : null;
        legendHeight = h !== null ? parseInt( h, 10 ) : null;

        // collect Format elements inside LegendURL
        legendFormats = Array.from( legendEl.querySelectorAll( 'Format' ) )
            .map( ( f ) => ( f.textContent || '' ).trim() )
            .filter( Boolean );

        // OnlineResource may use xlink namespace
        const online = legendEl.querySelector( 'OnlineResource' );
        legendUrl = readOnlineResourceHref( online );

    }

    return {
        name,
        title,
        legendUrl,
        legendFormats,
        legendWidth,
        legendHeight,
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

	if ( ! el ) return {
		name: '',
		title: '',
		abstract: '',
		keywords: [],
	};
	return {
		name: el.querySelector( 'Name' )?.textContent || '',
		title: el.querySelector( 'Title' )?.textContent || '',
		abstract: el.querySelector( 'Abstract' )?.textContent || '',
		keywords: Array.from( el.querySelectorAll( 'Keyword' ) ).map(
			( k ) => k.textContent || '',
		),
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

    if ( ! opEl ) return null;

    const formats = Array.from( opEl.querySelectorAll( 'Format' ) )
        .map( ( f ) => ( f.textContent || '' ).trim() )
        .filter( Boolean );

    const dcpTypes = Array.from( opEl.querySelectorAll( 'DCPType' ) ).map( ( dcp ) => {

        const httpEl = dcp.querySelector( 'HTTP' );
        if ( ! httpEl ) return { type: 'UNKNOWN', get: '', post: '' };

        const getEl = httpEl.querySelector( 'Get OnlineResource' ) || httpEl.querySelector( 'Get > OnlineResource' ) || httpEl.querySelector( 'Get' );
        const postEl = httpEl.querySelector( 'Post OnlineResource' ) || httpEl.querySelector( 'Post > OnlineResource' ) || httpEl.querySelector( 'Post' );

        const getHref = readOnlineResourceHref( getEl );
        const postHref = readOnlineResourceHref( postEl );

        return { type: 'HTTP', get: getHref, post: postHref };

    } );

    // fallback: sometimes OnlineResource appears directly under the operation
    if ( dcpTypes.length === 0 ) {

        const online = opEl.querySelector( 'OnlineResource' );
        if ( online ) {
            dcpTypes.push( { type: 'HTTP', get: readOnlineResourceHref( online ), post: '' } );
        }

    }

    return { formats, dcp: dcpTypes };

}

// parse the whole Request section, returning an object keyed by operation local name
function parseRequestSection( el ) {

    if ( ! el ) return {};

    const ops = {};
    Array.from( el.children ).forEach( ( child ) => {

        // skip non-element nodes just in case
        if ( child.nodeType !== 1 ) return;
        const name = child.localName || child.nodeName;
        const parsed = parseRequestOperation( child );
        if ( parsed ) ops[ name ] = parsed;

    } );

    return ops;

}

export class WMSCapabilitiesLoader extends LoaderBase {

	parse( buffer ) {

		const str = new TextDecoder( 'utf-8' ).decode( new Uint8Array( buffer ) );
		const xml = new DOMParser().parseFromString( str, 'text/xml' );
		const service = parseService( xml.querySelector( 'Service' ) );
		const capability = xml.querySelector( 'Capability' );
		const layers = capability
			? Array.from( capability.querySelectorAll( 'Layer' ) ).map( parseLayer )
			: [];


		const requestEl = capability?.querySelector( 'Request' );
        const request = parseRequestSection( requestEl );

		return {service, layers, request}

	}

}
