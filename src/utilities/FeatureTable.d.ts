interface FeatureTableHeader {

	extensions?: Object;
	extras?: any;

}

export class FeatureTable {

	header: FeatureTableHeader;

	constructor(
		buffer : ArrayBuffer,
		start : Number,
		headerLength : Number,
		binLength : Number
	);

	getKeys() : Array< String >;

	getData(
		key : String,
		count : Number,
		defaultComponentType? : String | null,
		defaultType? : String | null
	) : Number | String | ArrayBufferView;

	getBuffer( byteOffset : Number, byteLength : Number ) : ArrayBuffer;

}
