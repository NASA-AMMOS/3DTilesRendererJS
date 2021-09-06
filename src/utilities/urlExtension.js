/**
 * Returns the file extension of the path component of a URL
 * @param {string} url
 * @returns {string} null if no extension found
 */
export function getUrlExtension( url ) {

	let parsedUrl;
	try {

		parsedUrl = new URL( url, 'http://fakehost.com/' );

	} catch ( _ ) {

		// Ignore invalid URLs
		return null;

	}

	const filename = parsedUrl.pathname.split( '/' ).pop();
	const dotIndex = filename.lastIndexOf( '.' );
	if ( dotIndex === - 1 || dotIndex === filename.length - 1 ) {

		// Has no extension or has trailing . character
		return null;

	}

	const extension = filename.substring( dotIndex + 1 );
	return extension;

}
