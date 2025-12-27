export class DelayQueue {

	delay: number;
	readonly running: boolean;

	add( item: any, callback: ( item: any ) => any ): Promise<any>;
	remove( item: any ): void;

}
