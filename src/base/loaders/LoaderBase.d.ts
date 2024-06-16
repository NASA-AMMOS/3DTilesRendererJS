export class LoaderBase {

	fetchOptions: any;
	workingPath: string;
	load( url: string ): Promise< any >;
	resolveExternalURL( url: string ): string;
	workingPathForURL( url: string ): string
	parse( buffer: ArrayBuffer ): Promise< any >;

}
