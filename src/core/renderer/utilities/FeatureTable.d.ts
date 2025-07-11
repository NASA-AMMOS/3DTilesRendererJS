interface FeatureTableHeader {

	extensions?: object;
	extras?: any;

}

export class FeatureTable {

	header: FeatureTableHeader;

	constructor(
		buffer : ArrayBuffer,
		start : number,
		headerLength : number,
		binLength : number
	);

	getKeys() : Array< string >;

	getData(
		key : string,
		count : number,
		defaultComponentType? : string | null,
		defaultType? : string | null
	) : number | string | ArrayBufferView;

	getBuffer( byteOffset : number, byteLength : number ) : ArrayBuffer;

}
