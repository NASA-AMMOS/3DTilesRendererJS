export interface B3DMResult {

	version : String;
	featureTable: Object;
	batchTable : Object;
	glbBytes : Uint8Array;

}

export class B3DMLoaderBase {

	load( url : string ) : Promise< B3DMResult >;
	parse( buffer : ArrayBuffer ) : B3DMResult;

}
