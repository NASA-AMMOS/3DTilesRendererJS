import { WGS84_RADIUS } from '../../renderer/constants.js';
import { LoaderBase } from '../../renderer/loaders/LoaderBase.js';

const EQUATOR_CIRCUMFERENCE = WGS84_RADIUS * Math.PI * 2;

function isCRS84( crs ) {

	return /(:84|:crs84)$/i.test( crs );

}

function isEPSG4326( crs ) {

	return /:4326$/i.test( crs );

}

function isWebMercator( crs ) {

	return /:3857$/i.test( crs );

}

function parseTuple( tuple ) {

	return tuple.trim().split( /\s+/ ).map( v => parseFloat( v ) );

}

function correctTupleOrder( tuple, crs ) {

	if ( isEPSG4326( crs ) ) {

		[ tuple[ 1 ], tuple[ 0 ] ] = [ tuple[ 0 ], tuple[ 1 ] ];

	}

}

function correctTupleUnits( tuple, crs ) {

	if ( isWebMercator( crs ) ) {

		convertTupleToCartographic( tuple );

	}

}

function tupleToRadians( tuple ) {

	tuple[ 0 ] *= Math.PI / 180;
	tuple[ 1 ] *= Math.PI / 180;

}

function convertTupleToCartographic( tuple ) {

	tuple[ 0 ] = 2 * Math.PI * tuple[ 0 ] / EQUATOR_CIRCUMFERENCE;

	// TODO: share this with ProjectionScheme?
	const ratio = 2 * tuple[ 1 ] / EQUATOR_CIRCUMFERENCE;
	tuple[ 1 ] = 2 * Math.atan( Math.exp( ratio * Math.PI ) ) - Math.PI / 2;

	// to degrees
	tuple[ 0 ] *= 180 / Math.PI;
	tuple[ 1 ] *= 180 / Math.PI;

	return tuple;

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

function parseBoundingBox( el ) {

	if ( ! el ) {

		return null;

	}

	let crs = el.getAttribute( 'crs' );
	const lowerCorner = parseTuple( el.querySelector( 'LowerCorner' ).textContent );
	const upperCorner = parseTuple( el.querySelector( 'UpperCorner' ).textContent );

	correctTupleOrder( lowerCorner, crs );
	correctTupleOrder( upperCorner, crs );

	correctTupleUnits( lowerCorner, crs );
	correctTupleUnits( upperCorner, crs );

	tupleToRadians( lowerCorner );
	tupleToRadians( upperCorner );

	if ( isCRS84( crs ) ) {

		crs = 'EPSG:4326';

	} else if ( isWebMercator( crs ) ) {

		crs = 'EPSG:3857';

	}

	return {
		crs,
		lowerCorner,
		upperCorner,
		bounds: [ ...lowerCorner, ...upperCorner ],
	};

}

function parseStyle( el ) {

	const title = el.querySelector( 'Title' ).textContent;
	const identifier = el.querySelector( 'Identifier' ).textContent;
	const isDefault = el.getAttribute( 'isDefault' ) === 'true';

	return {
		title,
		identifier,
		isDefault,
	};

}

function parseTileMatrixSet( el ) {

	let supportedCRS = el.querySelector( 'SupportedCRS' ).textContent;
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

			// debugger
			correctTupleOrder( tm.topLeftCorner, supportedCRS );

			// TODO: confirm these calculations
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

	if ( isCRS84( supportedCRS ) ) {

		supportedCRS = 'EPSG:4326';

	} else if ( isWebMercator( supportedCRS ) ) {

		supportedCRS = 'EPSG:3857';

	}

	return {
		title,
		identifier,
		abstract,
		supportedCRS,
		tileMatrices,
	};

}

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

function getChildrenByTag( el, tag ) {

	return [ ...el.children ].filter( c => c.tagName === tag );

}
