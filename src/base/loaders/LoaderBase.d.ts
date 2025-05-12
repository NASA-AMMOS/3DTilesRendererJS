export class LoaderBase<Result = any, ParseResult = Promise< Result >> {

	fetchOptions: any;
	workingPath: string;
	load( url: string ): Promise< Result >;
	resolveExternalURL( url: string ): string;
	workingPathForURL( url: string ): string
	parse( buffer: ArrayBuffer ): ParseResult;

}
