import { WGS84_RADIUS, LoaderBase } from '3d-tiles-renderer/core';
import { ProjectionScheme } from '../images/utils/ProjectionScheme.js';
import { MathUtils } from 'three';

const EQUATOR_CIRCUMFERENCE = WGS84_RADIUS * Math.PI * 2;
const mercatorProjection = /* @__PURE__ */ new ProjectionScheme( 'EPSG:3857' );

function isEPSG4326( crs ) {

	return /:4326$/i.test( crs );

}

function isWebMercator( crs ) {

	return /:3857$/i.test( crs );

}

// parse a series of space-separated numbers
function parseTuple( tuple ) {

	return tuple.trim().split( /\s+/ ).map( v => parseFloat( v ) );

}

// swap the tuple order to lon, lat if crs is EPSG:4326 since the tiles renderer project
// expects lon, lat order
function correctTupleOrder( tuple, crs ) {

	if ( isEPSG4326( crs ) ) {

		[ tuple[ 1 ], tuple[ 0 ] ] = [ tuple[ 0 ], tuple[ 1 ] ];

	}

}

// web mercator specifies bounding boxes etc as meters assuming the width and height of the full image span
// is aligned to the globe equator circumference.
function correctTupleUnits( tuple, crs ) {

	if ( isWebMercator( crs ) ) {

		tuple[ 0 ] = mercatorProjection.convertNormalizedToLongitude( 0.5 + tuple[ 0 ] / EQUATOR_CIRCUMFERENCE );
		tuple[ 1 ] = mercatorProjection.convertNormalizedToLatitude( 0.5 + tuple[ 1 ] / EQUATOR_CIRCUMFERENCE );

		// to degrees
		tuple[ 0 ] *= MathUtils.RAD2DEG;
		tuple[ 1 ] *= MathUtils.RAD2DEG;

		return tuple;

	}

}

function tupleToRadians( tuple ) {

	tuple[ 0 ] *= MathUtils.DEG2RAD;
	tuple[ 1 ] *= MathUtils.DEG2RAD;

}

export class WMTSCapabilitiesLoader extends LoaderBase {

	parse( buffer ) {

		const str = new TextDecoder( 'utf-8' ).decode( new Uint8Array( buffer ) );
		const xml = new DOMParser().parseFromString( str, 'text/xml' );
		const contents = xml.querySelector( 'Contents' );

		const tileMatrixSets = getChildrenByTag( contents, 'TileMatrixSet' ).map( el => parseTileMatrixSet( el ) );
		const layers = getChildrenByTag( contents, 'Layer' ).map( el => parseLayer( el ) );
		const serviceIdentification = parseServiceIdentification( xml.querySelector( 'ServiceIdentification' ) );

		layers.forEach( layer => {

			layer.tileMatrixSets = layer.tileMatrixSetLinks.map( key => {

				return tileMatrixSets.find( tms => tms.identifier === key );

			} );

		} );

		return {
			serviceIdentification,
			tileMatrixSets,
			layers,
		};

	}

}

// parse <ows:ServiceIdentification> tag
function parseServiceIdentification( el ) {

	const title = el.querySelector( 'Title' ).textContent;
	const abstract = el.querySelector( 'Abstract' )?.textContent || '';
	const serviceType = el.querySelector( 'ServiceType' ).textContent;
	const serviceTypeVersion = el.querySelector( 'ServiceTypeVersion' ).textContent;

	return {
		title,
		abstract,
		serviceType,
		serviceTypeVersion,
	};

}

// parse <Layers> tag
function parseLayer( el ) {

	const title = el.querySelector( 'Title' ).textContent;
	const identifier = el.querySelector( 'Identifier' ).textContent;
	const format = el.querySelector( 'Format' ).textContent;
	const resourceUrls = getChildrenByTag( el, 'ResourceURL' ).map( el => {

		return parseResourceUrl( el );

	} );
	const tileMatrixSetLinks = getChildrenByTag( el, 'TileMatrixSetLink' ).map( el => {

		return getChildrenByTag( el, 'TileMatrixSet' )[ 0 ].textContent;

	} );
	const styles = getChildrenByTag( el, 'Style' ).map( el => {

		return parseStyle( el );

	} );
	const dimensions = getChildrenByTag( el, 'Dimension' ).map( el => {

		return parseDimension( el );

	} );

	let boundingBox = parseBoundingBox( el.querySelector( 'WGS84BoundingBox' ) );
	if ( ! boundingBox ) {

		boundingBox = parseBoundingBox( el.querySelector( 'BoundingBox' ) );

	}

	return {
		title,
		identifier,
		format,
		dimensions,
		tileMatrixSetLinks,
		styles,
		boundingBox,
		resourceUrls,
	};

}

// parse layer <ResourceURL> tag
function parseResourceUrl( el ) {

	const template = el.getAttribute( 'template' );
	const format = el.getAttribute( 'format' );
	const resourceType = el.getAttribute( 'resourceType' );

	return {
		template,
		format,
		resourceType,
	};

}

// parse layer <Dimension> tag
function parseDimension( el ) {

	const identifier = el.querySelector( 'Identifier' ).textContent;
	const uom = el.querySelector( 'UOM' )?.textContent || '';
	const defaultValue = el.querySelector( 'Default' ).textContent;
	const current = el.querySelector( 'Current' )?.textContent === 'true';
	const values = getChildrenByTag( el, 'Value' ).map( el => el.textContent );
	return {
		identifier,
		uom,
		defaultValue,
		current,
		values,
	};

}

// parse <ows:WGS84BoundingBox> and <BoundingBox> tags
function parseBoundingBox( el ) {

	if ( ! el ) {

		return null;

	}

	const crs = el.nodeName.endsWith( 'WGS84BoundingBox' ) ? 'urn:ogc:def:crs:CRS::84' : el.getAttribute( 'crs' );
	const lowerCorner = parseTuple( el.querySelector( 'LowerCorner' ).textContent );
	const upperCorner = parseTuple( el.querySelector( 'UpperCorner' ).textContent );

	correctTupleOrder( lowerCorner, crs );
	correctTupleOrder( upperCorner, crs );

	correctTupleUnits( lowerCorner, crs );
	correctTupleUnits( upperCorner, crs );

	tupleToRadians( lowerCorner );
	tupleToRadians( upperCorner );

	return {
		crs,
		lowerCorner,
		upperCorner,
		bounds: [ ...lowerCorner, ...upperCorner ],
	};

}

// parse layer <Style> tag
function parseStyle( el ) {

	const title = el.querySelector( 'Title' )?.textContent || null;
	const identifier = el.querySelector( 'Identifier' ).textContent;
	const isDefault = el.getAttribute( 'isDefault' ) === 'true';

	return {
		title,
		identifier,
		isDefault,
	};

}

// parse <TileMatrixSet> tag
function parseTileMatrixSet( el ) {

	const supportedCRS = el.querySelector( 'SupportedCRS' ).textContent;
	const title = el.querySelector( 'Title' )?.textContent || '';
	const identifier = el.querySelector( 'Identifier' ).textContent;
	const abstract = el.querySelector( 'Abstract' )?.textContent || '';
	const tileMatrices = [];
	el
		.querySelectorAll( 'TileMatrix' )
		.forEach( ( el, i ) => {

			const tm = parseTileMatrix( el );

			const pixelSpan = 0.00028 * tm.scaleDenominator;
			const groundWidth = tm.tileWidth * tm.matrixWidth * pixelSpan;
			const groundHeight = tm.tileHeight * tm.matrixHeight * pixelSpan;
			let bottomRightCorner;

			correctTupleOrder( tm.topLeftCorner, supportedCRS );

			if ( isWebMercator( supportedCRS ) ) {

				bottomRightCorner = [
					tm.topLeftCorner[ 0 ] + groundWidth,
					tm.topLeftCorner[ 1 ] - groundHeight,
				];

			} else {

				bottomRightCorner = [
					tm.topLeftCorner[ 0 ] + 360 * groundWidth / EQUATOR_CIRCUMFERENCE,
					tm.topLeftCorner[ 1 ] - 360 * groundHeight / EQUATOR_CIRCUMFERENCE,
				];

			}

			correctTupleUnits( bottomRightCorner, supportedCRS );
			correctTupleUnits( tm.topLeftCorner, supportedCRS );

			tupleToRadians( bottomRightCorner );
			tupleToRadians( tm.topLeftCorner );

			// construct the bounds
			tm.bounds = [ ...tm.topLeftCorner, ...bottomRightCorner ];

			// ensure min and max order is correct
			[ tm.bounds[ 1 ], tm.bounds[ 3 ] ] = [ tm.bounds[ 3 ], tm.bounds[ 1 ] ];

			tileMatrices.push( tm );

		} );

	return {
		title,
		identifier,
		abstract,
		supportedCRS,
		tileMatrices,
	};

}

// parse tile matrix set <TileMatrix> tag
function parseTileMatrix( el ) {

	const identifier = el.querySelector( 'Identifier' ).textContent;
	const tileWidth = parseFloat( el.querySelector( 'TileWidth' ).textContent );
	const tileHeight = parseFloat( el.querySelector( 'TileHeight' ).textContent );
	const matrixWidth = parseFloat( el.querySelector( 'MatrixWidth' ).textContent );
	const matrixHeight = parseFloat( el.querySelector( 'MatrixHeight' ).textContent );
	const scaleDenominator = parseFloat( el.querySelector( 'ScaleDenominator' ).textContent );
	const topLeftCorner = parseTuple( el.querySelector( 'TopLeftCorner' ).textContent );

	return {
		identifier,
		tileWidth,
		tileHeight,
		matrixWidth,
		matrixHeight,
		scaleDenominator,
		topLeftCorner,
		bounds: null,
	};

}

// utility for finding immediate children by tag name
function getChildrenByTag( el, tag ) {

	return [ ...el.children ].filter( c => c.tagName === tag );

}
