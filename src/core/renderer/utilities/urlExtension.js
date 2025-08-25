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
	const queryIndex = url.lastIndexOf( '?' );
	const fragmentIndex = url.lastIndexOf( '#' );

	if ( queryIndex !== - 1 ) {

		endIndex = Math.min( endIndex, queryIndex );

	}
	if ( fragmentIndex !== - 1 ) {

		endIndex = Math.min( endIndex, fragmentIndex );

	}

	// If this looks like a URL without a path (just domain), return null
	// Check if we're dealing with a domain-only URL by looking for protocol
	if ( url.includes( '://' ) ) {

		const urlAfterProtocol = url.substring( url.indexOf( '://' ) + 3, endIndex );
		const slashIndex = urlAfterProtocol.indexOf( '/' );

		// If there's no slash after the domain, or the slash is at the very end,
		// then we're dealing with just a domain name, not a file
		if ( slashIndex === - 1 || slashIndex === urlAfterProtocol.length - 1 ) {

			return null;

		}

	}

	// Find the last slash to get the filename part
	const lastSlashIndex = url.lastIndexOf( '/', endIndex );
	const filename = url.substring( lastSlashIndex + 1, endIndex );

	// If there's no filename (empty string or just a slash), return null
	if ( ! filename ) {

		return null;

	}

	// Find the last dot in the filename
	const lastDotIndex = filename.lastIndexOf( '.' );

	if ( lastDotIndex === - 1 || lastDotIndex === 0 ) {

		return null;

	}

	const extension = filename.substring( lastDotIndex + 1 );

	return extension || null;

}
