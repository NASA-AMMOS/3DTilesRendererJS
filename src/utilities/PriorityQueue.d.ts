export class PriorityQueue {

	maxJobs : Number;
	autoUpdate : Boolean;
	priorityCallback : ( itemA : any , itemB : any ) => Number;
	
	schedulingCallback : ( func : Function ) => void;

	sort() : void;
	add( item : any, callback : ( item : any ) => any ) : Promise< any >;
	remove( item : any ) : void;

	tryRunJobs() : void;
	scheduleJobRun() : void;

}
