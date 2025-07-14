import { XYZImageSource } from './XYZImageSource.js';

export class WMTSImageSource extends XYZImageSource {

	init( url ) {

		url = url
			.replace( /{\s*TileMatrix\s*}/gi, '{z}' )
			.replace( /{\s*TileRow\s*}/gi, '{y}' )
			.replace( /{\s*TileCol\s*}/gi, '{x}' );

		return super.init( url );

	}

}
