export class LRUCache {

	maxSize : Number;
	minSize : Number;
	unloadPercent : Number;
	unloadPriorityCallback : ( item : any ) => Number;

}
