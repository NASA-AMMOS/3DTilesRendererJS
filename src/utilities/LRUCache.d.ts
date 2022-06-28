export class LRUCache {

	maxSize : Number;
	minSize : Number;
	unloadPercent : Number;
	unloadPriorityCallback : ( item : any ) => Number;

	isFull() : Boolean;
	add( item : any, callback : ( item : any ) => Number ) : Boolean;
	remove( item : any ) : Boolean;

	markUsed( item : any ) : void;
	markAllUnused() : void;

	unloadUnusedContent() : void;
	scheduleUnload( markAllUnused? : Boolean ): void;

}
