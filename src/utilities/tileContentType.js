
export const TileContentType = {
	B3DM: 'b3dm',
	I3DM: 'i3dm',
	PNTS: 'pnts',
	CMPT: 'cmpt',

	// 3DTILES_content_gltf
	GLB: 'glb',
	GLTF: 'gltf'
};

// first four bytes ('magic bytes') in big-endian uint32-format
const MAGIC_BYTES = {
	0x6233646d: TileContentType.B3DM, // 'b3dm'
	0x6933646d: TileContentType.I3DM, // 'i3dm'
	0x706e7473: TileContentType.PNTS, // 'pnts'
	0x636d7074: TileContentType.CMPT, // 'cmpt'
	0x676c5446: TileContentType.GLB // 'glTF'
};

/**
 * Returns the content-type for the tile-contents, determined from
 * the media-type and the magic bytes in the data-buffer. Returns
 * one of the Strings defined in `TileContentType`, or null if
 * the content-type couldn't be recognized.
 * @param {ArrayBuffer} buffer
 * @param {string} mediaType
 * @return {string|null}
 */
export function getTileContentType( buffer, mediaType = '' ) {

	// glTF formats have registered media-types
	if ( mediaType === 'model/gltf+json' ) {

		return TileContentType.GLTF;

	} else if ( mediaType === 'model/gltf-binary' ) {

		return TileContentType.GLB;

	}

	const view = new DataView( buffer );

	// the glTF json format is the only json-based format supported, so
	// we'll just assume something that looks like json has to be glTF.
	if ( String.fromCharCode( view.getUint8( 0 ) ) === '{' ) {

		return TileContentType.GLTF;

	}

	const magic = view.getUint32( 0, false );

	return MAGIC_BYTES[ magic ] || null;

}
