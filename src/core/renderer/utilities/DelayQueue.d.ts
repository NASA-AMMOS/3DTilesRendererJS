export class DelayQueue {

	delay: number;

	add( item: any, callback: ( item: any ) => any ): Promise<any>;
	remove( item: any ): void;

}
