export class PriorityQueue {

	maxJobs : number;
	autoUpdate : boolean;
	priorityCallback : ( itemA : any, itemB : any ) => number;

	schedulingCallback : ( func : Function ) => void;

	sort() : void;
	add( item : any, callback : ( item : any ) => any ) : Promise< any >;
	remove( item : any ) : void;

	tryRunJobs() : void;
	scheduleJobRun() : void;

}
