export class LoaderBase<Result = any, ParseResult = Promise< Result >> {

	fetchOptions: any;
	workingPath: string;
	/** @deprecated in favor of `loadAsync` */
	load( url: string ): Promise< Result >;
	loadAsync( url: string ): Promise< Result >;
	resolveExternalURL( url: string ): string;
	parse( buffer: ArrayBuffer ): ParseResult;

}
