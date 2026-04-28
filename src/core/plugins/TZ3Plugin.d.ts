export interface TZ3PluginOptions {

	/**
	 * Extra fetch options (headers, credentials, signal, etc.) forwarded to
	 * every range request made against the archive.
	 */
	fetchOptions?: RequestInit;

}

/**
 * Plugin that adds support for the ".3tz" single-file 3D Tiles archive
 * format. Intercepts fetches for URLs pointing at a ".3tz" file or any path
 * inside one and serves the bytes via HTTP range requests.
 */
export class TZ3Plugin {

	constructor( options?: TZ3PluginOptions );

}
