export class GoogleCloudAuthPlugin {

	constructor( options: {
		apiToken: string,
		autoRefreshToken?: boolean,
		logoUrl?: string,
		useRecommendedSettings?: boolean;
		sessionOptions: { mapType: string, language: string, region: string, [key: string]: any },
	} );

}
