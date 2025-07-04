export class BatchTable {

	count : number;

	constructor(
		buffer : ArrayBuffer,
		count : number,
		start : number,
		headerLength : number,
		binLength : number
	);

	getKeys() : Array< string >;

	getDataFromId(
		id: number,
		target?: object
	) : object;

	getPropertyArray(
		key: string,
	) : number | string | ArrayBufferView;

}
