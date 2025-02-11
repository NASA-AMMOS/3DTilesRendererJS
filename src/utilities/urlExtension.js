/**
 * Returns the file extension of the path component of a URL
 * @param {string} url
 * @returns {string} null if no extension found
 */
export function getUrlExtension( url ) {

	const dotIndex = url.lastIndexOf( '.' );
	const extension = url.substring( dotIndex + 1 );
	return extension;

}
