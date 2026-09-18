export interface AdaptiveErrorTargetChange {

	errorTarget: number;
	previousErrorTarget: number;
	reason: 'cache-full' | 'cache-available';

}

export class AdaptiveErrorTargetPlugin {

	holdTime: number;
	factor: number;
	maxErrorTarget: number | null;
	onChange: ( ( info: AdaptiveErrorTargetChange ) => void ) | null;
	logging: boolean;

	readonly baseErrorTarget: number | null;
	readonly errorTargetCeiling: number;

	constructor( options?: {
		holdTime?: number,
		factor?: number,
		maxErrorTarget?: number | null,
		onChange?: ( ( info: AdaptiveErrorTargetChange ) => void ) | null,
		logging?: boolean,
	} );

}
