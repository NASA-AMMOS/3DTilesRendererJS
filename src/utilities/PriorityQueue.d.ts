export class PriorityQueue {

	maxJobs : Number;
	autoUpdate : Boolean;
	priorityCallback : ( item : any ) => Number;

	sort() : void;
	add( item : any, callback : ( item : any ) => any ) : Promise< any >;
	remove( item : any ) : void;

	tryRunJobs() : void;
	scheduleJobRun() : void;

}
