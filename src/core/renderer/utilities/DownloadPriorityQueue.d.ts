import { PriorityQueue } from './PriorityQueue.js';

export class DownloadPriorityQueue {

	maxJobsPerOrigin : number;
	priorityCallback : ( itemA : any, itemB : any ) => number;
	originQueues : Map< string | null, PriorityQueue >;

	get running(): boolean;

	add( url : string | null, item : any, callback : ( item : any ) => any, signal? : AbortSignal | null ) : Promise< any >;
	remove( item : any ) : void;
	has( item : any ) : boolean;

}
