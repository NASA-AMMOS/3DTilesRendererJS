const utf8decoder = new TextDecoder();

export function arrayToString( array ) {

	return utf8decoder.decode( array );

}
