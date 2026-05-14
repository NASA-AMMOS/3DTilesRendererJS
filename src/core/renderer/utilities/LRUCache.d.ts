export class LRUCache {

	minSize: number;
	maxSize: number;
	minBytesSize: number;
	maxBytesSize: number;
	unloadPercent: number;
	autoMarkUnused: boolean;

	unloadPriorityCallback: ( item: any ) => number;

	isFull(): boolean;
	has( item: any ): boolean;
	isUsed( item: any ): boolean;

	add( item: any, removeCb: ( item: any ) => void ): boolean;
	remove( item: any ): boolean;

	getMemoryUsage( item: any ): number;
	setMemoryUsage( item: any, bytes: number ): void;

	setLoaded( item: any, value: boolean ): void;
	markUsed( item: any ): void;
	markUnused( item: any ): void;
	markAllUnused(): void;

	unloadUnusedContent(): void;
	scheduleUnload(): void;

}
