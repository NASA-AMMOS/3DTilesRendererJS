import { LoaderBase } from './LoaderBase.js';

interface TileInfo {

	type : string;
	buffer : Uint8Array;
	version : string;

}

export interface CMPTBaseResult {

	version : string;
	tiles : Array< TileInfo >;

}

export class CMPTLoaderBase<Result = CMPTBaseResult, ParseResult = Result>
	extends LoaderBase<Result, ParseResult> {

}
