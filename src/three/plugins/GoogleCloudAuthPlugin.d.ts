export class GoogleCloudAuthPlugin {

	constructor( options: {
		apiToken: string,
		autoRefreshToken?: boolean,
		logoUrl?: string,
		useRecommendedSettings?: boolean;
		sessionOptions?: null | { mapType: string, language: string, region: string },
	} );

}
