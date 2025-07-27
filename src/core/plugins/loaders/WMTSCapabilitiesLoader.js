import { LoaderBase } from '../../renderer/loaders/LoaderBase.js';

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

	const boundingBox = parseBoundingBox( el.querySelector( 'BoundingBox' ) );
	const wgs84BoundingBox = parseBoundingBox( el.querySelector( 'WGS84BoundingBox' ) );

	return {
		title,
		identifier,
		format,
		dimensions,
		tileMatrixSetLinks,
		styles,
		boundingBox,
		wgs84BoundingBox,
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

	const crs = el.getAttribute( 'crs' );
	const lowerCorner = el.querySelector( 'LowerCorner' ).textContent.trim().split( /\s+/ ).map( v => parseFloat( v ) );
	const upperCorner = el.querySelector( 'UpperCorner' ).textContent.trim().split( /\s+/ ).map( v => parseFloat( v ) );

	return {
		crs,
		lowerCorner,
		upperCorner,
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

	const title = el.querySelector( 'Title' )?.textContent || '';
	const identifier = el.querySelector( 'Identifier' ).textContent;
	const abstract = el.querySelector( 'Abstract' )?.textContent || '';
	const supportedCRS = el.querySelector( 'SupportedCRS' ).textContent;
	const tileMatrices = [];
	el
		.querySelectorAll( 'TileMatrix' )
		.forEach( el => tileMatrices.push( parseTileMatrix( el ) ) );

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

	return {
		identifier,
		tileWidth,
		tileHeight,
		matrixWidth,
		matrixHeight,
		scaleDenominator,
	};

}

function getChildrenByTag( el, tag ) {

	return [ ...el.children ].filter( c => c.tagName === tag );

}
