export class LRUCache {

	maxSize : number;
	minSize : number;
	unloadPercent : number;
	unloadPriorityCallback : ( item : any ) => number;

}
