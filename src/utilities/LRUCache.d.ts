export class LRUCache {

	minSize: number;
	maxSize: number;
	minBytesSize: number;
	maxBytesSize: number;
	unloadPercent: number;
	autoMarkUnused: boolean;

	unloadPriorityCallback: ( item: any ) => number;

}
