export function readMagicBytes( bufferOrDataView ) {

	if ( bufferOrDataView === null || bufferOrDataView.byteLength < 4 ) {

		return '';

	}

	let view;
	if ( bufferOrDataView instanceof DataView ) {

		view = bufferOrDataView;

	} else {

		view = new DataView( bufferOrDataView );

	}

	if ( String.fromCharCode( view.getUint8( 0 ) ) === '{' ) {

		return null;

	}

	let magicBytes = '';
	for ( let i = 0; i < 4; i ++ ) {

		magicBytes += String.fromCharCode( view.getUint8( i ) );

	}

	return magicBytes;

}

const utf8decoder = new TextDecoder();
export function arrayToString( array ) {

	return utf8decoder.decode( array );

}

// Returns a working path with a trailing slash
export function getWorkingPath( url ) {

	return url.replace( /[\\/][^\\/]+$/, '' ) + '/';

}
