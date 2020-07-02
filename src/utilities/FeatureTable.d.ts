export class FeatureTable {

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

}

export class BatchTable {

	constructor(
		buffer : ArrayBuffer,
		batchSize : Number,
		start : Number,
		headerLength : Number,
		binLength : Number
	);

	getKeys() : Array< String >;

	getData(
		key : String,
		componentType : String | null,
		type : String | null
	) : Number | String | ArrayBufferView;

}
