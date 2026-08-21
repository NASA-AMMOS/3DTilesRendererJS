import { PriorityQueue } from './PriorityQueue.js';

export class DownloadPriorityQueue extends PriorityQueue {

	maxJobsPerOrigin : number;

	add( item : any, callback : ( item : any ) => any, url? : string | null ) : Promise< any >;

}
