/**
 * Returns the file extension of the path component of a URL
 * @param {string} url
 * @returns {string} null if no extension found
 */
export function getUrlExtension( url ) {

	if ( ! url ) {

		return null;

	}

	// Find the last occurrence of '?' and '#' to handle query params and fragments
	let endIndex = url.length;
	const queryIndex = url.indexOf( '?' );
	const fragmentIndex = url.indexOf( '#' );
	if ( queryIndex !== - 1 ) {

		endIndex = Math.min( endIndex, queryIndex );

	}

	if ( fragmentIndex !== - 1 ) {

		endIndex = Math.min( endIndex, fragmentIndex );

	}

	// Check if the string is just a hostname or whether the path does not end in an extension
	const lastPeriodIndex = url.lastIndexOf( '.', endIndex );
	const lastSlashIndex = url.lastIndexOf( '/', endIndex );
	const protocolIndex = url.indexOf( '://' );
	const isHostOnly = protocolIndex !== - 1 && protocolIndex + 2 === lastSlashIndex;
	if ( isHostOnly || lastPeriodIndex === - 1 || lastPeriodIndex < lastSlashIndex ) {

		return null;

	}

	return url.substring( lastPeriodIndex + 1, endIndex ) || null;

}
