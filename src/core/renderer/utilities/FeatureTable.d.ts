/**
 * Header structure for feature table data.
 * @internal
 */
export interface FeatureTableHeader {
	/** Optional extensions object */
	extensions?: object;
	/** Optional extra data */
	extras?: any;
}

export class FeatureTable {

	buffer : ArrayBuffer;
	binOffset : number;
	binLength : number;
	header : FeatureTableHeader;

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
