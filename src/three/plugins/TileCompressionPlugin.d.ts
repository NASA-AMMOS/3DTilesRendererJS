import { TypedArray } from 'three';

export class TileCompressionPlugin {

	constructor( options?: {
		generateNormals?: boolean,
		disableMipmaps?: boolean,
		compressIndex?: boolean,
		compressNormals?: boolean,
		compressUvs?: boolean,
		compressPosition?: boolean,

		uvType?: TypedArray,
		normalType?: TypedArray,
		positionType?: TypedArray,
	} );

}
