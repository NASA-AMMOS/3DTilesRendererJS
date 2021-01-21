interface TileInfo {

	type : String;
	buffer : Uint8Array;
	version : String;

}

export interface CMPTBaseResult {

	version : String;
	tiles : Array< TileInfo >;

}

export class CMPTLoaderBase {

	workingPath : string;
	load( url : String ) : Promise< CMPTBaseResult >;
	parse( buffer : ArrayBuffer ) : CMPTBaseResult;

}
