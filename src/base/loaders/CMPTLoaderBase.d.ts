interface TileInfo {

	type : string;
	buffer : Uint8Array;
	version : string;

}

export interface CMPTBaseResult {

	version : string;
	tiles : Array< TileInfo >;

}

export class CMPTLoaderBase {

	workingPath : string;
	load( url : string ) : Promise< CMPTBaseResult >;
	parse( buffer : ArrayBuffer ) : CMPTBaseResult;

}
