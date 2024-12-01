import { TypedArray } from 'three';

export class TileCompressionPlugin {

	constructor( options: {
		generateNormals: Boolean,
		disableMipmaps: Boolean,
		compressIndex: Boolean,
		compressNormals: Boolean,
		compressUvs: Boolean,
		compressPosition: Boolean,

		uvType: TypedArray,
		normalType: TypedArray,
		positionType: TypedArray,
	} );

}
