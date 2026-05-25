export class LoaderBase<Result = any, ParseResult = Promise< Result >> {

	fetchOptions: any;
	workingPath: string;
	loadAsync( url: string ): Promise< Result >;
	resolveExternalURL( url: string ): string;
	parse( buffer: ArrayBuffer ): ParseResult;

}
