export function arrayToString( array ) {

	let str = '';
	for ( let i = 0, l = array.length; i < l; i ++ ) {

		str += String.fromCharCode( array[ i ] );

	}

	return str;

}
