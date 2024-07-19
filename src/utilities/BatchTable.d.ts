export class BatchTable {

	constructor(
		buffer : ArrayBuffer,
		batchSize : Number,
		start : Number,
		headerLength : Number,
		binLength : Number
	);

	getKeys() : Array< String >;

	getDataFromId(
		id: Number,
		target?: Object
	) : Object;

}
