export class PriorityQueue {

	maxJobs : number;
	autoUpdate : boolean;
	priorityCallback : ( itemA : any, itemB : any ) => number;

	get running(): boolean;

	sort() : void;
	flush( item : any ) : any;
	has( item : any ) : boolean;
	add( item : any, callback : ( item : any ) => any ) : Promise< any >;
	remove( item : any ) : void;
	removeByFilter( filter : ( item : any ) => boolean ) : void;

	tryRunJobs() : void;
	scheduleJobRun() : void;

}
