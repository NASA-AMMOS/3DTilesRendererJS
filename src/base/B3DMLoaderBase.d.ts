export interface B3DMBaseResult {

	version : String;
	featureTable: Object;
	batchTable : Object;
	glbBytes : Uint8Array;

}

export class B3DMLoaderBase {

	load( url : string ) : Promise< B3DMBaseResult >;
	parse( buffer : ArrayBuffer ) : B3DMBaseResult;

}
