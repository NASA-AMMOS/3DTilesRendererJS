export class PriorityQueue {

	maxJobs : number;
	autoUpdate : boolean;
	/** @deprecated */
	priorityCallback : ( itemA : any, itemB : any ) => number;
	priorityFunction : ( item : any ) => number;

	schedulingCallback : ( func : () => void ) => void;

	get running(): boolean;

	sort() : void;
	has( item : any ) : boolean;
	add( item : any, callback : ( item : any ) => any ) : Promise< any >;
	remove( item : any ) : void;
	removeByFilter( filter : ( item : any ) => boolean ) : void;

	tryRunJobs() : void;
	scheduleJobRun() : void;

}
