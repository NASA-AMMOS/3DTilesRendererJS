import { PriorityQueue } from './PriorityQueue.js';

export class DownloadPriorityQueue extends PriorityQueue {

	maxJobsPerOrigin : number;

	add( url : string | null, item : any, callback : ( item : any ) => any ) : Promise< any >;

}
