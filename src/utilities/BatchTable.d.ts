export class BatchTable {

	count : Number;

	constructor(
		buffer : ArrayBuffer,
		count : Number,
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
