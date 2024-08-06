
export interface SUBTREEBaseResult {

	version : String;
	subtreeJson: ArrayBuffer;
	subtreeByte: ArrayBuffer;

}

export class SUBTREELoaderBase {

	workingPath : string;
	load( url : String ) :  SUBTREEBaseResult;
	parse( buffer : ArrayBuffer ) : SUBTREEBaseResult;

}
