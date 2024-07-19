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
