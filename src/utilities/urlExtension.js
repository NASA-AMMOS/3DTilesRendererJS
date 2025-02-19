/**
 * Returns the file extension of the path component of a URL
 * @param {string} url
 * @returns {string} null if no extension found
 */
export function getUrlExtension( url ) {

	if ( ! url ) {

		return null;

	}

	const filename = url
		.replace( /[a-z]+:\/\/[^/]+/i, '' ) 	// remove origin
		.replace( /\?.*$/i, '' ) 				// remove query
		.replace( /.*\//g, '' ); 				// remove path

	const lastPeriod = filename.lastIndexOf( '.' );
	if ( lastPeriod === - 1 ) {

		return null;

	}

	return filename.substring( lastPeriod + 1 ) || null;

}
